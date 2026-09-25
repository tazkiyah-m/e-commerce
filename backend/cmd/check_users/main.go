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
	godotenv.Load(".env")
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "user=postgres password=postgres dbname=Penjualan sslmode=disable"
	}
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// List all users
	rows, err := db.Query("SELECT id, email, full_name, provider, role FROM users ORDER BY id")
	if err != nil {
		fmt.Println("Error querying users:", err)
		return
	}
	defer rows.Close()

	fmt.Println("=== USERS IN DATABASE ===")
	count := 0
	for rows.Next() {
		var id int
		var email, fullName, provider, role string
		rows.Scan(&id, &email, &fullName, &provider, &role)
		fmt.Printf("  ID=%d | Email=%s | Name=%s | Provider=%s | Role=%s\n", id, email, fullName, provider, role)
		count++
	}
	if count == 0 {
		fmt.Println("  (kosong - tidak ada user)")
	}
	fmt.Printf("\nTotal: %d users\n", count)
}
