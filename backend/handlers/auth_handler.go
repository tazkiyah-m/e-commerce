package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"ggswell-backend/config"
	"ggswell-backend/middleware"
	"ggswell-backend/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	FullName    string `json:"full_name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	PhoneNumber string `json:"phone_number"`
}

type GoogleAuthRequest struct {
	Credential string `json:"credential"` // ID Token from Google
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		ips := strings.Split(ip, ",")
		return strings.TrimSpace(ips[0])
	}
	
	// Fallback to RemoteAddr
	ip = r.RemoteAddr
	if strings.Contains(ip, ":") {
		// Strip port number if present (IPv4 format: 192.168.1.1:1234)
		// For IPv6, this gets complicated, but we'll try standard split
		lastColon := strings.LastIndex(ip, ":")
		if lastColon > 0 {
			// Check if it's not a pure IPv6 address (which has multiple colons but no brackets if not port)
			if !strings.Contains(ip, "]") && strings.Count(ip, ":") > 1 {
				return ip // Return raw IPv6
			}
			return ip[:lastColon]
		}
	}
	return ip
}

func generateJWT(user models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret_key"
	}

	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	clientIP := getClientIP(r)

	// Check brute force
	var attempts int
	var lastAttempt time.Time
	err := config.DB.QueryRow("SELECT attempts_count, last_attempt FROM login_attempts WHERE ip_address = $1", clientIP).Scan(&attempts, &lastAttempt)
	
	if err == nil {
		// If 3 or more attempts and within 15 minutes
		if attempts >= 3 && time.Since(lastAttempt) < 15*time.Minute {
			middleware.LogSecurityEvent("BRUTE_FORCE_BLOCKED", clientIP, "Login blocked - exceeded 3 failed attempts for email: "+req.Email)
			http.Error(w, "Akses diblokir sementara karena terlalu banyak percobaan gagal. Silakan coba lagi setelah 15 menit.", http.StatusTooManyRequests)
			return
		}
		
		// If older than 15 minutes, reset attempts implicitly
		if time.Since(lastAttempt) >= 15*time.Minute {
			attempts = 0
		}
	}

	var user models.User
	var passwordHash string
	err = config.DB.QueryRow("SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1 AND provider = 'local'", req.Email).
		Scan(&user.ID, &user.Email, &passwordHash, &user.FullName, &user.Role)

	if err != nil {
		incrementFailedLogin(clientIP, attempts)
		if err == sql.ErrNoRows {
			http.Error(w, "User not found or uses social login", http.StatusUnauthorized)
		} else {
			http.Error(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		incrementFailedLogin(clientIP, attempts)
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Login success, clear attempts
	config.DB.Exec("DELETE FROM login_attempts WHERE ip_address = $1", clientIP)

	token, err := generateJWT(user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		Token: token,
		User:  user,
	}

	json.NewEncoder(w).Encode(resp)
}

func incrementFailedLogin(ip string, currentAttempts int) {
	middleware.LogSecurityEvent("LOGIN_FAILED", ip, fmt.Sprintf("Failed attempt #%d", currentAttempts+1))
	config.DB.Exec("INSERT INTO login_attempts (ip_address, attempts_count, last_attempt) VALUES ($1, 1, CURRENT_TIMESTAMP) ON CONFLICT (ip_address) DO UPDATE SET attempts_count = login_attempts.attempts_count + 1, last_attempt = CURRENT_TIMESTAMP", ip)
}

func Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	if len(req.FullName) > 100 || len(req.Email) > 100 || len(req.PhoneNumber) > 20 || len(req.Password) > 100 {
		http.Error(w, "Input exceeds maximum allowed length", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 8 {
		http.Error(w, "Password harus minimal 8 karakter", http.StatusBadRequest)
		return
	}

	if len(req.FullName) < 2 {
		http.Error(w, "Nama lengkap harus minimal 2 karakter", http.StatusBadRequest)
		return
	}

	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
		http.Error(w, "Format email tidak valid", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	var id int
	err = config.DB.QueryRow(
		"INSERT INTO users (email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id",
		req.Email, string(hashedPassword), req.FullName, req.PhoneNumber,
	).Scan(&id)

	if err != nil {
		http.Error(w, "Error creating user, email might already exist", http.StatusInternalServerError)
		return
	}

	user := models.User{
		ID:       id,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     "user",
	}

	token, err := generateJWT(user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		Token: token,
		User:  user,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

func GoogleAuth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	log.Printf("Received GoogleAuth request")

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GoogleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		http.Error(w, "Google Client ID not configured", http.StatusInternalServerError)
		return
	}

	log.Printf("GoogleAuth with ClientID: %s", clientID)

	payload, err := idtoken.Validate(context.Background(), req.Credential, clientID)
	if err != nil {
		http.Error(w, "Invalid Google token", http.StatusUnauthorized)
		return
	}

	email, _ := payload.Claims["email"].(string)
	name, _ := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string)

	var user models.User
	err = config.DB.QueryRow("SELECT id, email, full_name, role FROM users WHERE email = $1", email).
		Scan(&user.ID, &user.Email, &user.FullName, &user.Role)

	if err == sql.ErrNoRows {
		// User doesn't exist, create new Google user
		err = config.DB.QueryRow(
			"INSERT INTO users (email, full_name, picture, provider) VALUES ($1, $2, $3, 'google') RETURNING id",
			email, name, picture,
		).Scan(&user.ID)
		
		if err != nil {
			http.Error(w, "Failed to create user", http.StatusInternalServerError)
			return
		}
		user.Email = email
		user.FullName = name
		user.Role = "user"
	} else if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	} else {
		// Optionally update picture if it changed
		config.DB.Exec("UPDATE users SET picture = $1, provider = 'google' WHERE id = $2", picture, user.ID)
	}

	token, err := generateJWT(user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	resp := AuthResponse{
		Token: token,
		User:  user,
	}

	json.NewEncoder(w).Encode(resp)
}
