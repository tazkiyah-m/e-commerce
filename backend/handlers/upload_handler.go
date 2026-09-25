package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"ggswell-backend/config"
)

// UploadBanner handles POST /api/admin/banner/upload
func UploadBanner(w http.ResponseWriter, r *http.Request) {
	

	err := r.ParseMultipartForm(10 << 20) // 10 MB
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("banner")
	if err != nil {
		http.Error(w, "Failed to retrieve file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Ensure uploads directory exists
	uploadDir := filepath.Join("..", "frontend", "public", "images", "uploads")
	os.MkdirAll(uploadDir, os.ModePerm)

	// Create unique filename
	filename := fmt.Sprintf("banner_%d.jpg", time.Now().Unix())

	// Save to frontend public directory
	dstPath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to write file", http.StatusInternalServerError)
		return
	}

	urlPath := "/images/uploads/" + filename

	// Insert into DB
	_, err = config.DB.Exec("INSERT INTO banners (image_url, is_active) VALUES ($1, true)", urlPath)
	if err != nil {
		http.Error(w, "Failed to insert into database", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Upload successful", "url": urlPath})
}

// GetBanners handles GET /api/banners
func GetBanners(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	type Banner struct {
		ID        int    `json:"id"`
		ImageURL  string `json:"image_url"`
		IsActive  bool   `json:"is_active"`
		CreatedAt string `json:"created_at"`
	}

	query := "SELECT id, image_url, is_active, created_at FROM banners"
	// Optional filter for active banners if query parameter active=true
	if r.URL.Query().Get("active") == "true" {
		query += " WHERE is_active = true"
	}
	query += " ORDER BY id DESC"

	rows, err := config.DB.Query(query)
	if err != nil {
		http.Error(w, "Error fetching banners", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var banners []Banner
	for rows.Next() {
		var b Banner
		if err := rows.Scan(&b.ID, &b.ImageURL, &b.IsActive, &b.CreatedAt); err == nil {
			banners = append(banners, b)
		}
	}

	if banners == nil {
		banners = []Banner{}
	}

	json.NewEncoder(w).Encode(banners)
}

// ToggleBanner handles POST /api/admin/banners/toggle
func ToggleBanner(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	var req struct {
		ID       int  `json:"id"`
		IsActive bool `json:"is_active"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := config.DB.Exec("UPDATE banners SET is_active = $1 WHERE id = $2", req.IsActive, req.ID)
	if err != nil {
		http.Error(w, "Failed to update banner status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Status updated successfully"})
}

// DeleteBanner handles DELETE /api/admin/banners
func DeleteBanner(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")


	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	var imageUrl string
	err := config.DB.QueryRow("SELECT image_url FROM banners WHERE id = $1", id).Scan(&imageUrl)
	if err == nil && imageUrl != "" {
		filePath := filepath.Join("..", "frontend", "public", filepath.FromSlash(imageUrl))
		os.Remove(filePath)
	}

	_, err = config.DB.Exec("DELETE FROM banners WHERE id = $1", id)
	if err != nil {
		http.Error(w, "Failed to delete banner", http.StatusInternalServerError)
		return
	}
	
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Banner deleted successfully"})
}
