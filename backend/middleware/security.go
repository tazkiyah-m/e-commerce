package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type clientData struct {
	count    int
	lastSeen time.Time
}

var (
	mu        sync.Mutex
	clients   = make(map[string]*clientData)
	secLogger *log.Logger
)

// Initialize security logger and cleanup goroutine
func init() {
	// Create security log file
	logFile, err := os.OpenFile("security.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("[SECURITY] Warning: Could not create security.log: %v\n", err)
		secLogger = log.New(os.Stdout, "[SECURITY] ", log.LstdFlags)
	} else {
		secLogger = log.New(logFile, "", log.LstdFlags)
	}

	// Clean up old rate limit entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			for ip, client := range clients {
				if time.Since(client.lastSeen) > 5*time.Minute {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()
}

// LogSecurityEvent logs security-related events to security.log
func LogSecurityEvent(eventType string, ip string, detail string) {
	secLogger.Printf("[%s] IP=%s | %s", eventType, ip, detail)
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip != "" {
		ips := strings.Split(ip, ",")
		return strings.TrimSpace(ips[0])
	}
	
	ip = r.RemoteAddr
	if strings.Contains(ip, ":") {
		lastColon := strings.LastIndex(ip, ":")
		if lastColon > 0 {
			if !strings.Contains(ip, "]") && strings.Count(ip, ":") > 1 {
				return ip
			}
			return ip[:lastColon]
		}
	}
	return ip
}

// SecurityMiddleware handles CORS, Rate Limiting, Body Size Limit, and Security Headers
func SecurityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. CORS Configuration
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{
			"http://localhost:3000",
			// "https://www.ggswell.com", // Add production domain here later
		}

		originAllowed := false
		for _, o := range allowedOrigins {
			if origin == o {
				originAllowed = true
				break
			}
		}

		if originAllowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// 2. Request Body Size Limit (1MB max)
		if r.ContentLength > 1*1024*1024 {
			ip := getClientIP(r)
			LogSecurityEvent("BODY_TOO_LARGE", ip, fmt.Sprintf("Request body too large: %d bytes on %s %s", r.ContentLength, r.Method, r.URL.Path))
			http.Error(w, "Request body terlalu besar (maks 1MB).", http.StatusRequestEntityTooLarge)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 1*1024*1024)

		// 3. Rate Limiting (100 requests per minute per IP)
		ip := getClientIP(r)
		
		mu.Lock()
		client, exists := clients[ip]
		if !exists || time.Since(client.lastSeen) > time.Minute {
			clients[ip] = &clientData{count: 1, lastSeen: time.Now()}
		} else {
			client.count++
			client.lastSeen = time.Now()
			if client.count > 100 {
				mu.Unlock()
				LogSecurityEvent("RATE_LIMIT", ip, fmt.Sprintf("Exceeded 100 req/min on %s %s", r.Method, r.URL.Path))
				http.Error(w, "Terlalu banyak request. Silakan tunggu sebentar.", http.StatusTooManyRequests)
				return
			}
		}
		mu.Unlock()

		// 4. Security Headers
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Pass to the next handler
		next.ServeHTTP(w, r)
	})
}
