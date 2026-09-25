package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env from backend root
	godotenv.Load("../../.env")
	godotenv.Load(".env")
	// Also try loading from the backend directory
	godotenv.Load("../../backend/.env")

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "user=postgres password=postgres dbname=Penjualan sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect:", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal("Cannot reach database:", err)
	}
	fmt.Println("✓ Connected to database")

	// --- Migration queries ---
	migrations := []struct {
		desc  string
		query string
	}{
		// 1. Fix users table: allow null password_hash (for Google users), add provider & picture
		{"Allow NULL password_hash", "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"},
		{"Set password_hash default", "ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT ''"},
		{"Add provider column", "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local'"},
		{"Add picture column", "ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT"},

		// 2. Fix orders table: add extra columns
		{"Add subtotal column", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2) DEFAULT 0"},
		{"Add discount_amount column", "ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0"},
	}

	for _, m := range migrations {
		_, err := db.Exec(m.query)
		if err != nil {
			fmt.Printf("  ✗ %s: %v\n", m.desc, err)
		} else {
			fmt.Printf("  ✓ %s\n", m.desc)
		}
	}

	fmt.Println("\n✓ Migration completed!")
}
