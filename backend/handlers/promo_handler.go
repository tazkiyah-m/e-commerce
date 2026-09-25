package handlers

import (
	"encoding/json"
	"net/http"

	"ggswell-backend/config"
)

type Promo struct {
	ID            int     `json:"id"`
	Code          string  `json:"code"`
	DiscountType  string  `json:"discount_type"`
	DiscountValue float64 `json:"discount_value"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	ImageURL      string  `json:"image_url"`
}

func GetPromos(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := config.DB.Query("SELECT id, code, discount_type, discount_value, title, description, image_url FROM promos WHERE is_active = TRUE")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var promos []Promo
	for rows.Next() {
		var p Promo
		if err := rows.Scan(&p.ID, &p.Code, &p.DiscountType, &p.DiscountValue, &p.Title, &p.Description, &p.ImageURL); err != nil {
			continue
		}
		promos = append(promos, p)
	}

	if promos == nil {
		promos = []Promo{}
	}

	json.NewEncoder(w).Encode(promos)
}

func VerifyPromo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req struct {
		PromoCode string `json:"promoCode"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var p Promo
	err := config.DB.QueryRow("SELECT id, code, discount_type, discount_value FROM promos WHERE code = $1 AND is_active = TRUE", req.PromoCode).
		Scan(&p.ID, &p.Code, &p.DiscountType, &p.DiscountValue)

	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"isValid": false,
			"message": "Kode promo tidak valid atau sudah tidak aktif.",
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"isValid":       true,
		"discountType":  p.DiscountType,
		"discountValue": p.DiscountValue,
		"message":       "Promo berhasil digunakan!",
	})
}
