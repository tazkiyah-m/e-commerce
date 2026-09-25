package handlers

import (
	"encoding/json"
	"net/http"

	"ggswell-backend/config"
)

type StoreSettings struct {
	ID            int     `json:"id"`
	Address       string  `json:"address"`
	Latitude      float64 `json:"latitude"`
	Longitude     float64 `json:"longitude"`
	MaxDeliveryKM float64 `json:"max_delivery_km"`
}

// GetStoreSettings fetches store location and settings
func GetStoreSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var s StoreSettings
	err := config.DB.QueryRow(`
		SELECT id, address, latitude, longitude, max_delivery_km 
		FROM store_settings 
		WHERE id = 1
	`).Scan(&s.ID, &s.Address, &s.Latitude, &s.Longitude, &s.MaxDeliveryKM)

	if err != nil {
		// Fallback default
		s = StoreSettings{
			ID:            1,
			Address:       "Jl. Pallantikang No. 88, Makassar",
			Latitude:      -5.14766,
			Longitude:     119.4327,
			MaxDeliveryKM: 5.0,
		}
	}

	json.NewEncoder(w).Encode(s)
}

// UpdateStoreSettings allows Admin to update store location and settings
func UpdateStoreSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req StoreSettings
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if req.Address == "" || req.Latitude == 0 || req.Longitude == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "address, latitude, and longitude are required"})
		return
	}

	if req.MaxDeliveryKM <= 0 {
		req.MaxDeliveryKM = 5.0
	}

	_, err := config.DB.Exec(`
		INSERT INTO store_settings (id, address, latitude, longitude, max_delivery_km, updated_at)
		VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET
			address = EXCLUDED.address,
			latitude = EXCLUDED.latitude,
			longitude = EXCLUDED.longitude,
			max_delivery_km = EXCLUDED.max_delivery_km,
			updated_at = CURRENT_TIMESTAMP
	`, req.Address, req.Latitude, req.Longitude, req.MaxDeliveryKM)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update store settings: " + err.Error()})
		return
	}

	// Broadcast update via websocket
	BroadcastMessage(map[string]interface{}{
		"type": "STORE_SETTINGS_UPDATED",
	})

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Lokasi dan pengaturan toko berhasil diperbarui!",
		"settings": StoreSettings{
			ID:            1,
			Address:       req.Address,
			Latitude:      req.Latitude,
			Longitude:     req.Longitude,
			MaxDeliveryKM: req.MaxDeliveryKM,
		},
	})
}
