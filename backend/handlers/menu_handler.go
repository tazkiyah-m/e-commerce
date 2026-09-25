package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"ggswell-backend/config"
	"ggswell-backend/models"
)

func GetCategories(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := config.DB.Query("SELECT id, name, slug, icon FROM categories")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var c models.Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Icon); err != nil {
			continue
		}
		categories = append(categories, c)
	}
	
	if categories == nil {
		categories = []models.Category{}
	}

	json.NewEncoder(w).Encode(categories)
}

func GetMenuItems(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := "SELECT id, name, description, price, image_url, category_id, prep_time, rating, is_popular, is_available, stock, COALESCE(discount_percent, 0) FROM menu_items WHERE 1=1"
	
	catID := r.URL.Query().Get("category")
	search := r.URL.Query().Get("search")
	filter := r.URL.Query().Get("filter")
	
	var args []interface{}
	argId := 1
	
	if catID != "" {
		query += fmt.Sprintf(" AND category_id = $%d", argId)
		args = append(args, catID)
		argId++
	}
	
	if search != "" {
		query += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argId, argId)
		args = append(args, "%"+search+"%")
		argId++
	}

	if filter == "terlaris" {
		query += " AND is_popular = TRUE"
	} else if filter == "promo" {
		query += " AND COALESCE(discount_percent, 0) > 0"
	}
	
	query += " ORDER BY id ASC"

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []models.MenuItem
	for rows.Next() {
		var i models.MenuItem
		if err := rows.Scan(&i.ID, &i.Name, &i.Description, &i.Price, &i.ImageURL, &i.CategoryID, &i.PrepTime, &i.Rating, &i.IsPopular, &i.IsAvailable, &i.Stock, &i.DiscountPercent); err != nil {
			continue
		}
		items = append(items, i)
	}
	
	if items == nil {
		items = []models.MenuItem{}
	}

	json.NewEncoder(w).Encode(items)
}
