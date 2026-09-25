package handlers

import (
	"encoding/json"
	"net/http"

	"ggswell-backend/config"
)

// AdminPromoHandler handles CRUD operations for admin promos
func AdminPromoHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	switch r.Method {
	case "GET":
		getAdminPromos(w, r)
	case "POST":
		createAdminPromo(w, r)
	case "PUT":
		updateAdminPromo(w, r)
	case "DELETE":
		deleteAdminPromo(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// TogglePromoStatus handles changing is_active manually
func TogglePromoStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req struct {
		ID       int  `json:"id"`
		IsActive bool `json:"is_active"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec("UPDATE promos SET is_active = $1 WHERE id = $2", req.IsActive, req.ID)
	if err != nil {
		http.Error(w, "Failed to update status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Status updated successfully"})
}

func getAdminPromos(w http.ResponseWriter, r *http.Request) {
	type AdminPromo struct {
		ID            int     `json:"id"`
		Code          string  `json:"code"`
		DiscountType  string  `json:"discount_type"`
		DiscountValue float64 `json:"discount_value"`
		MinPurchase   float64 `json:"min_purchase"`
		MaxUsage      int     `json:"max_usage"`
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		IsActive      bool    `json:"is_active"`
		ExpiresAt     string  `json:"expires_at"`
	}

	rows, err := config.DB.Query("SELECT id, code, discount_type, discount_value, min_purchase, max_usage, title, description, is_active, expires_at FROM promos ORDER BY id DESC")
	if err != nil {
		http.Error(w, "Error fetching promos", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var promos []AdminPromo
	for rows.Next() {
		var p AdminPromo
		if err := rows.Scan(&p.ID, &p.Code, &p.DiscountType, &p.DiscountValue, &p.MinPurchase, &p.MaxUsage, &p.Title, &p.Description, &p.IsActive, &p.ExpiresAt); err == nil {
			promos = append(promos, p)
		}
	}

	if promos == nil {
		promos = []AdminPromo{}
	}

	json.NewEncoder(w).Encode(promos)
}

func createAdminPromo(w http.ResponseWriter, r *http.Request) {
	var p struct {
		Code          string  `json:"code"`
		DiscountType  string  `json:"discount_type"`
		DiscountValue float64 `json:"discount_value"`
		MinPurchase   float64 `json:"min_purchase"`
		MaxUsage      int     `json:"max_usage"`
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		ExpiresAt     string  `json:"expires_at"`
	}

	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec(
		"INSERT INTO promos (code, discount_type, discount_value, min_purchase, max_usage, title, description, is_active, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)",
		p.Code, p.DiscountType, p.DiscountValue, p.MinPurchase, p.MaxUsage, p.Title, p.Description, p.ExpiresAt,
	)

	if err != nil {
		http.Error(w, "Failed to create promo", http.StatusInternalServerError)
		return
	}
	
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Promo created successfully"})
}

func updateAdminPromo(w http.ResponseWriter, r *http.Request) {
	var p struct {
		ID            int     `json:"id"`
		Code          string  `json:"code"`
		DiscountType  string  `json:"discount_type"`
		DiscountValue float64 `json:"discount_value"`
		MinPurchase   float64 `json:"min_purchase"`
		MaxUsage      int     `json:"max_usage"`
		Title         string  `json:"title"`
		Description   string  `json:"description"`
		ExpiresAt     string  `json:"expires_at"`
	}

	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec(
		"UPDATE promos SET code=$1, discount_type=$2, discount_value=$3, min_purchase=$4, max_usage=$5, title=$6, description=$7, expires_at=$8 WHERE id=$9",
		p.Code, p.DiscountType, p.DiscountValue, p.MinPurchase, p.MaxUsage, p.Title, p.Description, p.ExpiresAt, p.ID,
	)

	if err != nil {
		http.Error(w, "Failed to update promo", http.StatusInternalServerError)
		return
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Promo updated successfully"})
}

func deleteAdminPromo(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec("DELETE FROM promos WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete promo", http.StatusInternalServerError)
		return
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Promo deleted successfully"})
}
