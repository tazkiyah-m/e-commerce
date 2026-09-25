package handlers

import (
	"encoding/json"
	"net/http"

	"ggswell-backend/config"
)

type UserProfile struct {
	ID       int    `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

type UserAddress struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	AddressLine string `json:"address_line"`
	City        string `json:"city"`
	PostalCode  string `json:"postal_code"`
	IsDefault   bool   `json:"is_default"`
}

func GetProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := 1 // Hardcoded for demo

	var profile UserProfile
	err := config.DB.QueryRow("SELECT id, email, full_name, phone, role FROM users WHERE id = $1", userID).
		Scan(&profile.ID, &profile.Email, &profile.FullName, &profile.Phone, &profile.Role)
	
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(profile)
}

func GetAddresses(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := 1 // Hardcoded for demo

	rows, err := config.DB.Query("SELECT id, user_id, address_line, city, postal_code, is_default FROM user_addresses WHERE user_id = $1", userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var addresses []UserAddress
	for rows.Next() {
		var a UserAddress
		if err := rows.Scan(&a.ID, &a.UserID, &a.AddressLine, &a.City, &a.PostalCode, &a.IsDefault); err != nil {
			continue
		}
		addresses = append(addresses, a)
	}

	if addresses == nil {
		addresses = []UserAddress{}
	}

	json.NewEncoder(w).Encode(addresses)
}
