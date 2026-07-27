# Product Requirements Document — POS Grosir

## 1. Latar Belakang

Toko grosir dan kebutuhan harian skala kecil-menengah masih banyak menggunakan
pencatatan manual (buku) atau spreadsheet untuk transaksi harian, stok, dan
laporan. Pendekatan ini rawan kesalahan, lambat, dan menyulitkan pemilik toko
memantau performa bisnis secara real-time.

Solusi POS konvensional di pasaran umumnya:
- Berbayar dengan biaya lisensi tinggi
- Membutuhkan koneksi internet stabil (SaaS/cloud)
- Terlalu kompleks untuk kebutuhan toko skala tunggal
- Tidak mendukung barang grosir dengan satuan konversi (dus/pcs/gram)

Dibutuhkan sistem POS yang ringan, offline-first, murah (sekali bayar), dan
disesuaikan untuk kebutuhan toko grosir skala 1 toko.

## 2. Tujuan Produk

Membangun aplikasi POS desktop yang:
- Berjalan 100% offline di satu komputer kasir
- Andal untuk transaksi harian dengan kecepatan respons < 1 detik per item
- Mendukung barang grosir (konversi satuan, batch, tanggal kedaluwarsa)
- Mudah digunakan kasir dengan sedikit pelatihan
- Memberikan laporan harian yang cukup untuk pemilik toko mengambil keputusan

## 3. Target Pengguna

### Kasir
- Kebutuhan utama: input transaksi secepat mungkin
- Interaksi: scan barcode -> keranjang -> pilih pembayaran -> cetak struk
- Tidak perlu paham stok/laporan
- Skill teknis minimal

### Pemilik / Admin Toko
- Kebutuhan utama: pantau omzet, stok menipis, stok opname, kelola produk
- Interaksi: lihat laporan harian, tambah/edit produk, lakukan stok opname
- Mungkin juga merangkap sebagai kasir di jam sibuk

## 4. Fitur

### Must-Have (MVP)

| Kategori | Fitur |
|---|---|
| Transaksi | Tambah item ke keranjang (scan barcode / cari manual) |
| Transaksi | Hitung total otomatis termasuk pajak |
| Transaksi | Multi-metode pembayaran dalam 1 transaksi (cash + QRIS + EDC) |
| Transaksi | Cetak struk thermal (ESC/POS) |
| Transaksi | Buka cash drawer otomatis |
| Produk | CRUD produk (nama, harga beli, harga jual, kategori, satuan) |
| Produk | Pencarian via barcode (USB HID scanner) |
| Produk | Pencarian via kode PLU (untuk produk tanpa barcode) |
| Produk | Konversi satuan (contoh: 1 dus = 12 pcs, harga per pcs dan per dus) |
| Stok | Stok batch dengan tanggal kedaluwarsa (FIFO) |
| Stok | Stok menipis (peringatan jika stok di bawah threshold) |
| Stok | Stok opname (hitung fisik, adjust stok) |
| Promo | Diskon per item (nominal / persen) |
| Promo | Diskon per kategori (persentase) |
| Laporan | Omzet harian |
| Laporan | Item terlaris (top N) |
| Laporan | Stok menipis |
| Laporan | Riwayat transaksi |
| Sistem | Backup data ke file SQLite dump, manual & terjadwal |
| Sistem | Import data awal dari CSV (produk) |

### Nice-to-Have (Fase Berikutnya)

| Kategori | Fitur |
|---|---|
| Pembayaran | QRIS dinamis (generate QR di layar) |
| Hardware | Timbangan digital (komunikasi serial) |
| Laporan | Grafik omzet mingguan/bulanan |
| Laporan | Laba rugi (butuh data harga beli rata-rata) |
| Pelanggan | Daftar pelanggan dan histori pembelian (tidak wajib untuk grosir) |
| Nota | Nota kredit / retur barang |
| Multi-user | Login kasir dengan password sederhana |

## 5. Batasan (Out of Scope — MVP)

- Multi-cabang / multi-toko
- Server backend terpisah
- Aplikasi mobile (Android/iOS)
- Real-time sinkronisasi cloud
- Multi-kasir dalam satu toko (1 komputer, 1 sesi)
- Manajemen utang/piutang pelanggan
- Pajak PPN formal (NPWP, faktur pajak)
- Koneksi ke marketplace / e-commerce

## 6. Kriteria Sukses MVP

1. Kasir dapat menyelesaikan transaksi dari scan hingga cetak struk dalam
   < 10 detik untuk 5 item
2. Sistem tetap berfungsi penuh tanpa koneksi internet
3. Backup SQLite dapat direstore di komputer lain dan data tetap utuh
4. Pemilik toko dapat melihat laporan omzet hari ini dalam < 3 klik
5. Stok menipis muncul peringatan saat transaksi
6. Konversi satuan (dus ke pcs) dihitung tepat saat transaksi
