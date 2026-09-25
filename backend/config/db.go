package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func ConnectDB() {
	// Load .env file
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found, using OS env vars")
	}

	// For local development, assuming standard postgres defaults
	// User can override with env var
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// Use a local dev connection if not provided
		connStr = "user=postgres password=postgres dbname=Penjualan sslmode=disable"
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Error connecting to database:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Println("Database ping failed, check your connection:", err)
	} else {
		fmt.Println("Successfully connected to database!")
	}
	
	// Ensure tables exist
	createTables()
}

func createTables() {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash VARCHAR(255) DEFAULT '',
		full_name VARCHAR(255),
		phone VARCHAR(50),
		role VARCHAR(50) DEFAULT 'user',
		provider VARCHAR(50) DEFAULT 'local',
		picture TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS categories (
		id SERIAL PRIMARY KEY,
		name VARCHAR(100) NOT NULL,
		slug VARCHAR(100) UNIQUE NOT NULL,
		icon VARCHAR(100),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS menu_items (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		description TEXT,
		price NUMERIC(10, 2) NOT NULL,
		image_url TEXT,
		category_id INTEGER REFERENCES categories(id),
		prep_time VARCHAR(50),
		rating NUMERIC(2,1) DEFAULT 4.5,
		is_popular BOOLEAN DEFAULT FALSE,
		hpp NUMERIC(10, 2) DEFAULT 0,
		is_available BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS orders (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id),
		subtotal NUMERIC(10, 2) DEFAULT 0,
		shipping_fee NUMERIC(10, 2) DEFAULT 0,
		discount_amount NUMERIC(10, 2) DEFAULT 0,
		total_amount NUMERIC(10, 2) NOT NULL,
		status VARCHAR(50) DEFAULT 'pending',
		payment_method VARCHAR(50),
		shipping_address TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS order_items (
		id SERIAL PRIMARY KEY,
		order_id INTEGER REFERENCES orders(id),
		menu_item_id INTEGER REFERENCES menu_items(id),
		quantity INTEGER NOT NULL,
		price NUMERIC(10, 2) NOT NULL
	);

	CREATE TABLE IF NOT EXISTS carts (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) UNIQUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS cart_items (
		id SERIAL PRIMARY KEY,
		cart_id INTEGER REFERENCES carts(id),
		menu_item_id INTEGER REFERENCES menu_items(id),
		quantity INTEGER NOT NULL,
		UNIQUE(cart_id, menu_item_id)
	);

	CREATE TABLE IF NOT EXISTS promos (
		id SERIAL PRIMARY KEY,
		code VARCHAR(50) UNIQUE NOT NULL,
		discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
		discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
		title VARCHAR(255),
		description TEXT,
		image_url TEXT,
		is_active BOOLEAN DEFAULT TRUE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS user_addresses (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id),
		address_line TEXT NOT NULL,
		city VARCHAR(100),
		postal_code VARCHAR(20),
		is_default BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS login_attempts (
		ip_address VARCHAR(45) PRIMARY KEY,
		attempts_count INTEGER DEFAULT 1,
		last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS banners (
		id SERIAL PRIMARY KEY,
		image_url TEXT NOT NULL,
		is_active BOOLEAN DEFAULT true,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS chat_messages (
		id SERIAL PRIMARY KEY,
		user_id INTEGER,
		session_id VARCHAR(100) NOT NULL DEFAULT '',
		user_name VARCHAR(255) NOT NULL DEFAULT 'Pelanggan',
		sender_role VARCHAR(50) NOT NULL DEFAULT 'user',
		message TEXT NOT NULL,
		is_read BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS store_settings (
		id INT PRIMARY KEY DEFAULT 1,
		address TEXT NOT NULL DEFAULT 'Jl. Pallantikang No. 88, Makassar',
		latitude NUMERIC(10, 6) NOT NULL DEFAULT -5.14766,
		longitude NUMERIC(10, 6) NOT NULL DEFAULT 119.4327,
		max_delivery_km NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err := DB.Exec(query)
	if err != nil {
		log.Println("Error creating tables:", err)
	} else {
		log.Println("Database tables initialized")
	}

	// Seed default store settings if empty
	DB.Exec(`
		INSERT INTO store_settings (id, address, latitude, longitude, max_delivery_km)
		VALUES (1, 'Jl. Pallantikang No. 88, Makassar', -5.14766, 119.4327, 5.0)
		ON CONFLICT (id) DO NOTHING;
	`)

	// Add missing columns if they don't exist
	_, err = DB.Exec(`
		ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS hpp NUMERIC(10, 2) DEFAULT 0;
		ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
		ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
		ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
		ALTER TABLE promos ADD COLUMN IF NOT EXISTS min_purchase NUMERIC(10, 2) DEFAULT 0;
		ALTER TABLE promos ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 100;
		ALTER TABLE promos ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');
		ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) DEFAULT '';
		ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT 'Pelanggan';
	`)
	if err != nil {
		log.Println("Error altering tables:", err)
	}

	// Seed sample menu discounts
	DB.Exec("UPDATE menu_items SET discount_percent = 20 WHERE name ILIKE '%Ayam Bakar%'")
	DB.Exec("UPDATE menu_items SET discount_percent = 15 WHERE name ILIKE '%Mie Gacor%'")
	DB.Exec("UPDATE menu_items SET discount_percent = 25 WHERE name ILIKE '%Nasi Goreng%'")

	// Seed promos if empty
	seedPromos()
	seedAdmin()
}

func seedAdmin() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&count)
	if err == nil && count == 0 {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		
		_, err := DB.Exec(
			"INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'admin')",
			"admin@ggswell.com", string(hashedPassword), "Administrator",
		)
		if err == nil {
			log.Println("Admin user seeded: admin@ggswell.com / admin123")
		}
	}
}

func seedPromos() {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM promos").Scan(&count)
	if err != nil || count > 0 {
		return
	}

	promos := []struct {
		Code          string
		DiscountType  string
		DiscountValue float64
		Title         string
		Description   string
		ImageURL      string
	}{
		{"WELCOME20", "percentage", 20, "Diskon 20% Pelanggan Baru", "Nikmati diskon 20% untuk pembelian pertama Anda!", ""},
		{"HEMAT15K", "fixed", 15000, "Potongan Rp15.000", "Potongan langsung Rp15.000 untuk minimal pembelian Rp75.000", ""},
		{"GGSWELL10", "percentage", 10, "Diskon 10% Spesial GGS", "Diskon 10% untuk semua menu favorit!", ""},
	}

	for _, p := range promos {
		DB.Exec(
			"INSERT INTO promos (code, discount_type, discount_value, title, description, image_url) VALUES ($1, $2, $3, $4, $5, $6)",
			p.Code, p.DiscountType, p.DiscountValue, p.Title, p.Description, p.ImageURL,
		)
	}
	log.Println("Promo data seeded")
}

