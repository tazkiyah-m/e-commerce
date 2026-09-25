package handlers

import (
	"encoding/json"
	"net/http"

	"ggswell-backend/config"
)

// AdminMenuHandler handles CRUD operations for admin menu
func AdminMenuHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	switch r.Method {
	case "GET":
		getAdminMenus(w, r)
	case "POST":
		createAdminMenu(w, r)
	case "PUT":
		updateAdminMenu(w, r)
	case "DELETE":
		deleteAdminMenu(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ToggleMenuStatus handles changing is_available
func ToggleMenuStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req struct {
		ID          int  `json:"id"`
		IsAvailable bool `json:"is_available"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec("UPDATE menu_items SET is_available = $1 WHERE id = $2", req.IsAvailable, req.ID)
	if err != nil {
		http.Error(w, "Failed to update status", http.StatusInternalServerError)
		return
	}

	// Broadcast the update to user frontend
	BroadcastMessage(map[string]interface{}{
		"type": "MENU_UPDATED",
		"message": "Menu catalog was updated",
	})

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Status updated successfully"})
}

func getAdminMenus(w http.ResponseWriter, r *http.Request) {
	// Extended menu struct for Admin containing HPP, is_available, and discount_percent
	type AdminMenuItem struct {
		ID              int     `json:"id"`
		Name            string  `json:"name"`
		Description     string  `json:"description"`
		Price           float64 `json:"price"`
		HPP             float64 `json:"hpp"`
		ImageURL        string  `json:"image_url"`
		CategoryID      int     `json:"category_id"`
		IsAvailable     bool    `json:"is_available"`
		Stock           int     `json:"stock"`
		DiscountPercent int     `json:"discount_percent"`
	}

	rows, err := config.DB.Query("SELECT id, name, description, price, hpp, image_url, category_id, is_available, stock, COALESCE(discount_percent, 0) FROM menu_items ORDER BY id DESC")
	if err != nil {
		http.Error(w, "Error fetching menus", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var menus []AdminMenuItem
	for rows.Next() {
		var m AdminMenuItem
		if err := rows.Scan(&m.ID, &m.Name, &m.Description, &m.Price, &m.HPP, &m.ImageURL, &m.CategoryID, &m.IsAvailable, &m.Stock, &m.DiscountPercent); err == nil {
			menus = append(menus, m)
		}
	}

	json.NewEncoder(w).Encode(menus)
}

func createAdminMenu(w http.ResponseWriter, r *http.Request) {
	var m struct {
		Name            string  `json:"name"`
		Description     string  `json:"description"`
		Price           float64 `json:"price"`
		HPP             float64 `json:"hpp"`
		ImageURL        string  `json:"image_url"`
		CategoryID      int     `json:"category_id"`
		Stock           int     `json:"stock"`
		DiscountPercent int     `json:"discount_percent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := config.DB.QueryRow(
		"INSERT INTO menu_items (name, description, price, hpp, image_url, category_id, prep_time, is_available, stock, discount_percent) VALUES ($1, $2, $3, $4, $5, $6, '15 min', true, $7, $8) RETURNING id",
		m.Name, m.Description, m.Price, m.HPP, m.ImageURL, m.CategoryID, m.Stock, m.DiscountPercent,
	).Scan(&m.CategoryID) // re-use categoryID variable just to scan the id

	if err != nil {
		http.Error(w, "Failed to create menu", http.StatusInternalServerError)
		return
	}
	
	BroadcastMessage(map[string]interface{}{"type": "MENU_UPDATED"})
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Menu created successfully"})
}

func updateAdminMenu(w http.ResponseWriter, r *http.Request) {
	var m struct {
		ID              int     `json:"id"`
		Name            string  `json:"name"`
		Description     string  `json:"description"`
		Price           float64 `json:"price"`
		HPP             float64 `json:"hpp"`
		ImageURL        string  `json:"image_url"`
		CategoryID      int     `json:"category_id"`
		Stock           int     `json:"stock"`
		DiscountPercent int     `json:"discount_percent"`
	}

	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec(
		"UPDATE menu_items SET name=$1, description=$2, price=$3, hpp=$4, image_url=$5, category_id=$6, stock=$7, discount_percent=$8 WHERE id=$9",
		m.Name, m.Description, m.Price, m.HPP, m.ImageURL, m.CategoryID, m.Stock, m.DiscountPercent, m.ID,
	)

	if err != nil {
		http.Error(w, "Failed to update menu", http.StatusInternalServerError)
		return
	}
	
	BroadcastMessage(map[string]interface{}{"type": "MENU_UPDATED"})
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Menu updated successfully"})
}

func deleteAdminMenu(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	// First delete from cart_items to prevent constraint violation
	config.DB.Exec("DELETE FROM cart_items WHERE menu_item_id = $1", id)
	
	_, err := config.DB.Exec("DELETE FROM menu_items WHERE id = $1", id)
	if err != nil {
		// Could fail if it's referenced in order_items. Better to just set is_available = false in real world
		// but let's try delete for crud requirement.
		http.Error(w, "Failed to delete menu. It might be linked to past orders.", http.StatusInternalServerError)
		return
	}
	
	BroadcastMessage(map[string]interface{}{"type": "MENU_UPDATED"})
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Menu deleted successfully"})
}
