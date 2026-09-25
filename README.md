# 🍔 GGS_WELL - Modern Food Ordering & Restaurant Management System

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Go](https://img.shields.io/badge/Go-Golang-00ADD8?style=for-the-badge&logo=go)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-38B2AC?style=for-the-badge&logo=tailwind-css)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange?style=for-the-badge)
![Midtrans](https://img.shields.io/badge/Payment-Midtrans_QRIS-blue?style=for-the-badge)

**GGS_WELL** adalah platform pemesanan makanan gourmet modern dan sistem manajemen restoran terintegrasi secara *full-stack*. Menggabungkan pengalaman pengguna (UX) pelanggan yang elegan ala Apple & GoFood dengan Dashboard Operasional Admin yang responsif dan terhubung secara *real-time* via WebSocket.

---

## 🌟 Fitur Utama

### 🛒 Sisi Pelanggan (Customer Web App)
- **Modern Landing Page**: Desain minimalis gourmet dengan kurasi visual tinggi, kategori populer, dan peta lokasi interaktif.
- **Intuitive Food Catalog**: Navigasi kategori makanan yang mudah, fitur pencarian cepat, filter ketersediaan stok, dan deskripsi produk detail.
- **Smart Floating Cart**: Drawer keranjang interaktif yang memudahkan penambahan, pengurangan, dan penyesuaian pesanan secara instan.
- **Sistem Checkout & Payment Gateway**: Integrasi pembayaran otomatis (Midtrans/QRIS, E-Wallet, Transfer Bank) dengan webhook notifikasi status pembayaran instan.
- **Autentikasi Multi-Metode**: Registrasi, Login akun, serta Google OAuth dengan proteksi sesi aman berbasis JWT.
- **User Live Chat Widget**: Saluran komunikasi interaktif untuk bantuan langsung pelanggan.

### 📊 Sisi Pengelola (Admin Operations Dashboard)
- **Live Metrics & Analytics**:
  - Perhitungan otomatis Total Omset dari pesanan berstatus *Settlement/Paid*.
  - Kalkulasi HPP (Harga Pokok Penjualan) & Profit Bersih riil.
  - Grafik tren penjualan mingguan (Revenue vs Profit).
- **Notifikasi Pesanan Real-time (WebSocket)**:
  - *Sound chime* otomatis saat transaksi baru berhasil dibayar.
  - Indikator lonceng dengan *live badge indicator*.
  - Angka metrik keuangan dan antrean pesanan naik seketika tanpa perlu refresh.
- **Manajemen Menu & Stok Real-time**:
  - Tambah, edit, dan hapus item menu (foto, harga jual, modal/HPP, kategori).
  - *Toggle switch* stok ("Tersedia" / "Habis") yang tersinkronisasi langsung ke tampilan pelanggan via WebSocket.
- **Manajemen Promo & Banner**:
  - Pengelolaan voucher diskon (tipe persentase / nominal, kuota, tanggal kedaluwarsa).
  - Konfigurasi banner promo beranda dan informasi jam operasional toko secara dinamis.
- **Keamanan & Role-based Access Control**:
  - Middleware autentikasi khusus untuk memproteksi endpoint dan halaman Dashboard Admin.

---

## 🛠️ Tech Stack & Arsitektur

### **Frontend**
- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS & Custom Design System (Monochrome & Premium Glassmorphism)
- **Icons & Charts:** Lucide React, Recharts / Chart.js
- **State & Real-time:** Native WebSocket Client & React Hooks

### **Backend**
- **Language & Runtime:** Go (Golang)
- **Server:** Standard HTTP / Gorilla WebSocket
- **Auth:** JWT (JSON Web Token), Google OAuth, Bcrypt
- **Payment Gateway:** Midtrans Snap & Webhook Notification Engine

### **Database**
- **RDBMS:** MySQL / MariaDB (Skema relasional: Users, Products, Categories, Orders, Order Items, Promos, Settings)

---

## 📁 Struktur Direktori

```text
ggs_well/
├── backend/                  # REST API & WebSocket Server (Golang)
│   ├── config/               # Database connection & ENV config
│   ├── handlers/             # Endpoint handlers & business logic
│   ├── middleware/           # Auth JWT & CORS security
│   ├── models/               # Database schemas & structs
│   └── main.go               # Entry point server Go
├── frontend/                 # Client & Admin Web (Next.js)
│   ├── app/                  # Next.js App Router (User & Admin routes)
│   ├── components/           # Reusable UI components
│   └── public/               # Static assets & audio notifications
├── penjualan.sql             # Skema & dump database MySQL
├── FUNGSI.md                 # Dokumentasi spesifikasi integrasi
└── SKEMA.md                  # Panduan alur & sistem desain
```

---

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+)
- [Go](https://go.dev/) (versi 1.20+)
- [MySQL](https://www.mysql.com/) database server

### 2. Setup Database
1. Buat database baru bernama `ggs_well` atau `penjualan`.
2. Import file skema:
   ```bash
   mysql -u root -p ggs_well < penjualan.sql
   ```

### 3. Setup & Jalankan Backend
1. Masuk ke direktori `backend`:
   ```bash
   cd backend
   ```
2. Sesuaikan konfigurasi kredensial database di `config/database.go` atau file environment Anda.
3. Jalankan server:
   ```bash
   go run main.go
   ```
   *Backend berjalan pada `http://localhost:8080`*

### 4. Setup & Jalankan Frontend
1. Masuk ke direktori `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```
   *Frontend dapat diakses di `http://localhost:3000`*

---

## 📄 Lisensi
Didistribusikan di bawah Lisensi MIT. Bebas digunakan untuk pengembangan edukasi dan portofolio komersial.
