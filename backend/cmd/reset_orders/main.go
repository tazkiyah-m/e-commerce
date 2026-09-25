package main

import (
	"fmt"
	"log"

	"ggswell-backend/config"
)

func main() {
	config.ConnectDB()

	_, err := config.DB.Exec("TRUNCATE TABLE orders CASCADE;")
	if err != nil {
		log.Fatalf("Gagal menghapus data: %v", err)
	}

	fmt.Println("Berhasil menghapus seluruh riwayat pesanan dan data keuangan!")
}
