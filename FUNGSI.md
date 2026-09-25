Tolong hubungkan antarmuka UI "GGS Admin" yang sudah dibuat (seperti pada gambar) dengan seluruh logika Back-End API, Database, dan WebSocket Real-time agar seluruh fitur di Dashboard Admin berfungsi 100%:

==================================================
1. INTEGRASI LOGIKA DATA METRIC CARDS & GRAFIK
==================================================
Hubungkan kartu ringkasan dan grafik ke API Endpoints backend (`GET /api/admin/analytics`):
- Total Omset: Kumpulkan kalkulasi otomatis dari seluruh transaksi dengan status "Paid" / "Settlement" dari Midtrans.
- Pengeluaran (HPP): Hitung akumulasi (HPP Modal Per Makanan × Jumlah Terjual) untuk semua pesanan yang berhasil.
- Profit Bersih: Otomatis hitung selisih (`Total Omset` - `Total HPP`).
- Grafik Penjualan Mingguan: Render data dinamis (Senin–Minggu) menggunakan Chart.js/Recharts yang menampilkan garis Omset vs Profit.
- Pesanan Aktif & Transaksi Berhasil: Tampilkan jumlah transaksi sukses 7 hari terakhir secara riil dari database.
- Tombol "Lihat Detail Laporan": Saat diklik, tampilkan modal/halaman rincian tabel transaksi masuk secara lengkap (Order ID, Jam, Nama Pembeli, Total, Metode Bayar).

==================================================
2. FUNGSIONALITAS NAVIGASI TAB: MANAJEMEN MENU
==================================================
Saat tab "Manajemen Menu" di sidebar diklik, tampilkan antarmuka pengelolaan katalog makanan:
- Tabel/Grid Makanan: Tampilkan Foto, Nama Makanan, Harga Jual, HPP/Modal, Kategori, dan Switch Toggle "Tersedia / Habis".
- Fitur CRUD:
  * Form Modal Tambah/Edit Makanan: Input Nama, Deskripsi, Kategori, Harga Jual, HPP/Modal, Rating, Estimasi Waktu, dan Upload Foto.
  * Hapus Makanan: Konfirmasi hapus item dari database.
- Real-time Sync (Socket.io): Setiap kali status stok diubah menjadi "Habis" atau ada menu baru ditambah, kirimkan event WebSocket agar tampilan di web User (localhost:3000) langsung berubah secara otomatis TANPA refresh.

==================================================
3. FUNGSIONALITAS NAVIGASI TAB: PROMO & BANNER
==================================================
Saat tab "Promo & Banner" di sidebar diklik, sediakan 2 modul utama:
A. Manajemen Kode Promo:
   - Form Tambah Kode Promo: Kode Promo (misal: GGSHEMAT), Tipe Diskon (Nominal Rp / Persentase %), Nominal Diskon, Minimal Pembelian, Kuota Maksimal Penggunaan, serta Tanggal & Jam Kedaluwarsa (Expiration Date Picker).
   - Tabel Daftar Promo: Tampilkan daftar promo aktif, sisa kuota, tanggal kedaluwarsa, dan status ("Aktif" / "Expired"). Sediakan tombol nonaktifkan promo manual.
B. Manajemen Banner Utama & Konten Toko:
   - Form Upload Banner: Ganti banner promo utama yang tampil di carousel landing page User.
   - Form Info Toko: Edit Alamat Toko, Jam Operasional (10:00 - 22:00 WIB), dan Nomor WhatsApp Admin secara dinamis.

==================================================
4. SYSTEM NOTIFIKASI REAL-TIME (IKON LONCENG & SOUND)
==================================================
- Aktifkan ikon lonceng di kanan atas header dashboard:
- Setiap kali Webhook Midtrans menerima pembayaran sukses dari User, backend harus memancarkan sinyal `new_order` via WebSocket ke Admin Dashboard.
- Saat pesanan baru masuk:
  1. Mainkan efek suara notifikasi pesanan masuk ("Ding!").
  2. Tambahkan titik merah (*badge indicator*) pada ikon Lonceng Notifikasi.
  3. Angka pada metric card "Total Omset", "Profit", dan "Pesanan Aktif" langsung naik secara otomatis.

==================================================
5. PROTEKSI KELUAR & AUTHENTICATION SESSION
==================================================
- Tombol "Keluar" (Logout): Hapus JWT Token / Cookie Session Admin, lalu kembalikan tampilan ke Halaman Login Admin (`/admin/login`).
- Middleware Security: Pastikan rute Dashboard Admin ini memverifikasi role `admin`. Jika JWT token tidak ada atau invalid, otomatis lempar balik ke halaman login.