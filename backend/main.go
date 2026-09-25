package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"ggswell-backend/config"
	"ggswell-backend/handlers"
	"ggswell-backend/middleware"
)

func main() {
	// Connect to Database
	config.ConnectDB()

	// Initialize WebSocket
	handlers.InitWebSocketHub()

	// Seed Dummy Data (Optional, for demo)
	// seedData() // Dikomentari agar data tidak ter-reset setiap kali server dinyalakan

	// Setup Routes
	http.HandleFunc("/api/categories", handlers.GetCategories)
	http.HandleFunc("/api/menu", handlers.GetMenuItems)
	http.HandleFunc("/api/auth/login", handlers.Login)
	http.HandleFunc("/api/auth/register", handlers.Register)
	http.HandleFunc("/api/auth/google", handlers.GoogleAuth)
	http.HandleFunc("/api/checkout", handlers.CreateOrder)
	http.HandleFunc("/api/orders/user", handlers.GetOrders)
	http.HandleFunc("/api/cart/reorder", handlers.Reorder)
	http.HandleFunc("/api/payment/webhook", handlers.PaymentNotification)
	http.HandleFunc("/api/analytics", handlers.GetAnalytics) // keep for compat, maybe rename to admin/analytics
	http.HandleFunc("/api/ws", handlers.ServeWs)
	
	// Admin Routes
	http.HandleFunc("/api/admin/menu", handlers.AdminMenuHandler)
	http.HandleFunc("/api/admin/menu/toggle", handlers.ToggleMenuStatus)
	http.HandleFunc("/api/admin/promos", handlers.AdminPromoHandler)
	http.HandleFunc("/api/admin/promos/toggle", handlers.TogglePromoStatus)
	http.HandleFunc("/api/admin/orders", handlers.GetAllOrdersAdmin)
	http.HandleFunc("/api/admin/orders/manual", handlers.CreateManualOrder)
	http.HandleFunc("/api/admin/finance", handlers.GetFinanceReport)
	
	// Banner Routes
	http.HandleFunc("/api/banners", handlers.GetBanners)
	http.HandleFunc("/api/admin/banner/upload", handlers.UploadBanner)
	http.HandleFunc("/api/admin/banners/toggle", handlers.ToggleBanner)
	http.HandleFunc("/api/admin/banners", handlers.DeleteBanner)

	// Chat Routes
	http.HandleFunc("/api/chat/messages", handlers.GetChatMessages)
	http.HandleFunc("/api/chat/send", handlers.SendChatMessage)
	http.HandleFunc("/api/admin/chat/conversations", handlers.GetAdminChatConversations)

	// Store Location & Setting Routes
	http.HandleFunc("/api/store/location", handlers.GetStoreSettings)
	http.HandleFunc("/api/admin/store/location", handlers.UpdateStoreSettings)

	// Promo Routes
	http.HandleFunc("/api/promos", handlers.GetPromos)
	http.HandleFunc("/api/promos/verify", handlers.VerifyPromo)
	
	// User Routes
	http.HandleFunc("/api/user/profile", handlers.GetProfile)
	http.HandleFunc("/api/user/addresses", handlers.GetAddresses)

	// Cart Routes
	http.HandleFunc("/api/cart", func(w http.ResponseWriter, r *http.Request) {
		
		switch r.Method {
		case "OPTIONS":
			w.WriteHeader(http.StatusOK)
			return
		case "GET":
			handlers.GetCart(w, r)
		case "POST":
			handlers.AddToCart(w, r)
		case "PUT":
			handlers.UpdateCartItem(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Simple Health Check
	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := "8080"
	fmt.Printf("Server is running on port %s...\n", port)
	
	// Apply Global Security Middleware
	secureHandler := middleware.SecurityMiddleware(http.DefaultServeMux)
	
	if err := http.ListenAndServe(":"+port, secureHandler); err != nil {
		log.Fatal(err)
	}
}

func seedData() {
	// Force clear menu items to apply user requests
	config.DB.Exec("TRUNCATE TABLE menu_items CASCADE")

	fmt.Println("Seeding new menu data...")

	// Make sure categories exist
	categories := []struct {
		Name string
		Slug string
		Icon string
	}{
		{"Promo", "promo", "percent"},
		{"Main Course", "main-course", "restaurant"},
		{"Drinks", "drinks", "local_bar"},
		{"Fast Food", "fast-food", "fastfood"},
		{"Snacks", "snacks", "cookie"},
	}

	for _, c := range categories {
		config.DB.Exec("INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING", c.Name, c.Slug, c.Icon)
	}

	// Insert Menu Items
	menuItems := []struct {
		Name        string
		Desc        string
		Price       float64
		HPP         float64
		Img         string
		CatID       int
		Prep        string
		Rating      float64
		IsPopular   bool
		IsAvailable bool
	}{
		{"Ayam Bakar", "Ayam bakar spesial bumbu kecap manis dengan lalapan dan sambal", 23000, 15000, "/images/ayam_bakar.png", 2, "15-20 min", 4.9, true, true},
		{"Ayam Geprek", "Ayam geprek pedas nampol dengan sambal bawang segar", 15000, 10000, "/images/ayam_geprek.png", 4, "10-15 min", 4.8, true, true},
		{"Ayam Lalapan", "Ayam goreng renyah dengan aneka lalapan segar dan sambal terasi", 25000, 18000, "/images/ayam_lalapan.png", 2, "10 min", 4.7, false, true},
		{"Mie Gacor", "Mie pedas mampus dengan taburan ayam dan daun bawang", 10000, 5000, "/images/mie_gacor.png", 4, "10-15 min", 4.9, true, true},
		{"Nasi Goreng", "Nasi goreng kampung mantap dengan telur mata sapi dan kerupuk", 15000, 8000, "/images/nasi_goreng.png", 2, "10-15 min", 4.8, true, true},
		{"Chicken Katsu", "Ayam katsu renyah khas Jepang dengan irisan kol dan saus katsu", 15000, 9000, "/images/chicken_katsu.png", 4, "15-20 min", 4.7, false, true},
		{"Nasi Putih", "Nasi putih hangat nan pulen dengan taburan bawang goreng", 8000, 3000, "/images/nasi_putih.png", 2, "5 min", 4.8, true, true},
	}

	for _, item := range menuItems {
		config.DB.Exec(
			"INSERT INTO menu_items (name, description, price, hpp, image_url, category_id, prep_time, rating, is_popular, is_available) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
			item.Name, item.Desc, item.Price, item.HPP, item.Img, item.CatID, item.Prep, item.Rating, item.IsPopular, item.IsAvailable,
		)
	}

	// Create a dummy user
	config.DB.Exec("INSERT INTO users (email, password_hash, full_name, role, created_at) VALUES ($1, $2, $3, $4, $5)",
		"test@ggswell.com", "password123", "Test User", "user", time.Now())
}
