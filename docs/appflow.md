# Alur Aplikasi — POS Grosir

## 1. Alur Transaksi Kasir

```
+------------------+     +-------------------+     +--------------------+
| Buka Aplikasi    | --> | Login             | --> | Layar Kasir        |
| (Tauri window)   |     | (pilih user atau  |     | (default: keranjang|
|                  |     |  langsung masuk)  |     |  kosong)           |
+------------------+     +-------------------+     +--------------------+
                                                         |
                                                    [Scan / Cari Produk]
                                                         |
                                                         v
                                              +--------------------------+
                                              | Cari Produk              |
                                              | - Scan barcode -> enter  |
                                              | - Ketik PLU -> enter     |
                                              | - Ketik nama -> pilih    |
                                              |   dari dropdown          |
                                              +--------------------------+
                                                         |
                                                         v
                                              +--------------------------+
                                              | Pilih Satuan & Jumlah    |
                                              | - Default: satuan        |
                                              |   terakhir/terkecil      |
                                              | - Bisa ganti dus/pcs/gr  |
                                              | - Input qty (atau        |
                                              |   scanner qty)           |
                                              +--------------------------+
                                                         |
                                                         v
                                              +--------------------------+
                                              | Tambah ke Keranjang      |
                                              | - Cek stok cukup?        |
                                              | - Cek expired date?      |
                                              | - Cek promo aktif?       |
                                              | - Tampil di list item    |
                                              +--------------------------+
                                                         |
                                              [Ulangi sampai selesai]
                                                         |
                                                         v
                                              +--------------------------+
                                              | Hitung Total             |
                                              | - Subtotal               |
                                              | - Diskon per item        |
                                              | - Diskon promo kategori   |
                                              | - Grand Total            |
                                              +--------------------------+
                                                         |
                                                         v
                                              +--------------------------+
                                              | Pilih Pembayaran         |
                                              | - Cash (input nominal)   |
                                              | - QRIS (input nominal)   |
                                              | - EDC (input nominal)    |
                                              | - Bisa kombinasi         |
                                              +--------------------------+
                                                         |
                                                         v
                                              +--------------------------+
                                              | Hitung Kembalian         |
                                              | Cash: bayar - total      |
                                              | Tampilkan di layar       |
                                              +--------------------------+
                                                         |
                                                         v
                                              +--------------------------+
                                              | Transaksi Selesai        |
                                              | 1. Kurangi stok batch    |
                                              | 2. Generate nomor trx    |
                                              | 3. Simpan transaksi      |
                                              | 4. Cetak struk (ESC/POS) |
                                              | 5. Buka cash drawer      |
                                              | 6. Reset keranjang       |
                                              +--------------------------+
                                                         |
                                                         v
                                              [Kembali ke Layar Kasir]
```

### Detail Input Barcode Scanner
- Scanner USB HID bertindak sebagai keyboard.
- Aplikasi menggunakan event `keydown` dengan buffer:
  - Akumulasi karakter yang masuk.
  - Jika karakter adalah `Enter` (kode 13), proses buffer sebagai barcode.
  - Jika jeda > 100ms antar karakter, reset buffer (input manual dari keyboard).
- Hasil scan dibersihkan (trim) lalu dicocokkan dengan kolom `barcode` atau `plu_code` di tabel `products`.

## 2. Alur Tambah/Edit Stok & Pencatatan Batch Baru

```
+------------------+     +---------------------+
| Menu Manajemen   | --> | Pilih Produk        |
| Stok             |     | (cari/scan produk)  |
+------------------+     +---------------------+
                                   |
                          [Lihat Stok Saat Ini]
                                   |
                    +------------------------------+
                    | Pilih Aksi:                  |
                    | a) Tambah Batch Baru         |
                    | b) Edit Batch Existing       |
                    | c) Hapus Batch (soft-delete) |
                    +------------------------------+
                                   |
                         (pilih a) Tambah Batch)
                                   |
                                   v
                    +------------------------------+
                    | Form Batch Baru              |
                    | - Quantity (dalam base_unit) |
                    | - Purchase price per unit    |
                    | - Expiry date                |
                    | - Batch code (dari supplier) |
                    | - Supplier name              |
                    | - Received date (today)      |
                    +------------------------------+
                                   |
                                   v
                    +------------------------------+
                    | Simpan Batch                 |
                    | - INSERT ke stock_batches    |
                    | - Update total stok produk   |
                    | - (opsional) update harga    |
                    |   beli rata-rata             |
                    +------------------------------+
                                   |
                                   v
                    [Kembali ke daftar batch]
```

### Edit Batch
- Ubah quantity (penyesuaian karena salah input atau rusak).
- Buat adjustment log (opsional).
- Tidak bisa mengubah batch yang sudah dipakai di transaksi (hanya quantity bisa ditambah/dikurangi dengan catatan).

### Hapus Batch
- Soft-delete (`is_deleted = 1`).
- Batch yang sudah dipakai transaksi tidak bisa dihapus (hanya dinonaktifkan).

## 3. Alur Retur / Pembatalan Transaksi

### Pembatalan Transaksi (Void)
```
+----------------------+     +------------------------+
| Cari Transaksi       | --> | Lihat Detail Transaksi |
| (no transaksi /      |     | - Daftar item          |
|  tanggal / scan)     |     | - Pembayaran           |
+----------------------+     +------------------------+
                                      |
                                      v
                           +------------------------+
                           | Tombol "Void"          |
                           | - Konfirmasi password  |
                           |   admin                |
                           +------------------------+
                                      |
                                      v
                           +------------------------+
                           | Proses Void:           |
                           | 1. Set payment_status  |
                           |    = 'voided'          |
                           | 2. Kembalikan stok ke  |
                           |    batch asal          |
                           | 3. Catat void log      |
                           |    (user, timestamp)   |
                           +------------------------+
```

### Retur Barang (Refund)
```
+----------------------+     +------------------------+
| Cari Transaksi Asli  | --> | Pilih Item yang        |
|                      |     | Directur               |
+----------------------+     +------------------------+
                                      |
                                      v
                           +------------------------+
                           | Form Retur:            |
                           | - Quantity diretur     |
                           | - Alasan retur         |
                           | - Metode refund        |
                           |   (cash/kembali ke     |
                           |    pembayaran awal)    |
                           +------------------------+
                                      |
                                      v
                           +------------------------+
                           | Proses Retur:          |
                           | 1. Insert transaksi    |
                           |    baru dengan tipe    |
                           |    'refund'            |
                           | 2. Kembalikan stok     |
                           | 3. Generate nota retur |
                           | 4. Cetak nota retur    |
                           +------------------------+
```

## 4. Alur Tutup Kasir Harian dan Lihat Laporan

```
+------------------+     +-----------------------+
| Dashboard / Menu | --> | Pilih "Laporan Harian"|
+------------------+     +-----------------------+
                                  |
                                  v
                       +---------------------------+
                       | Laporan Harian            |
                       | - Omzet hari ini          |
                       | - Jumlah transaksi        |
                       | - Total diskon            |
                       | - Ringkasan per metode    |
                       |   bayar (cash/QRIS/EDC)   |
                       | - Item terlaris (top 10)  |
                       | - Stok menipis            |
                       +---------------------------+
                                  |
                                  v
                       +---------------------------+
                       | Tombol "Generate          |
                       | Daily Summary"            |
                       | - Hitung ulang dari       |
                       |   transaksi hari ini      |
                       | - Simpan ke daily_summary |
                       | - Reset counter transaksi |
                       |   (optional)              |
                       +---------------------------+
                                  |
                                  v
                       +---------------------------+
                       | Tombol "Cetak Laporan"    |
                       | - Cetak rekap harian ke   |
                       |   printer thermal         |
                       +---------------------------+
```

### Laporan Lainnya
- **Stok Opname**: pilih produk → input qty fisik → sistem hitung selisih → simpan → adjust stok.
- **Riwayat Transaksi**: filter tanggal → tampilkan daftar → klik detail.
- **Stok Menipis**: daftar produk dengan stok <= threshold.

## 5. Daftar Semua Layar/Halaman

| No | Nama Layar | Route | Fungsi |
|---|---|---|---|
| 1 | **Login** | `/login` | Pilih user, masukkan password (jika diaktifkan) |
| 2 | **Kasir** | `/cashier` | Layar utama transaksi: keranjang, scan, total, bayar |
| 3 | **Pilih Pembayaran** | `/cashier/payment` | Input nominal per metode, hitung kembalian |
| 4 | **Transaksi Sukses** | `/cashier/success` | Informasi transaksi selesai, struk tercetak |
| 5 | **Dashboard** | `/dashboard` | Ringkasan: omzet hari ini, stok menipis, shortcut cepat |
| 6 | **Daftar Produk** | `/products` | Tabel produk + search + filter kategori |
| 7 | **Form Produk** | `/products/form` | Tambah / edit produk (nama, harga, satuan, kategori) |
| 8 | **Manajemen Stok** | `/stocks` | Lihat stok per produk, daftar batch |
| 9 | **Form Batch** | `/stocks/batch` | Tambah / edit batch (qty, harga, expiry) |
| 10 | **Stok Opname** | `/stocks/opname` | Pilih produk, input qty fisik, lihat selisih |
| 11 | **Promo** | `/promotions` | Daftar promo aktif + tambah/hapus |
| 12 | **Laporan Harian** | `/reports/daily` | Omzet, ringkasan, cetak |
| 13 | **Laporan Stok** | `/reports/stocks` | Stok menipis, riwayat batch |
| 14 | **Laporan Transaksi** | `/reports/transactions` | Riwayat transaksi + filter tanggal |
| 15 | **Riwayat Transaksi Detail** | `/reports/transactions/:id` | Detail item & pembayaran, aksi void/retur |
| 16 | **Pengaturan** | `/settings` | Backup, restore, konfigurasi printer, tentang aplikasi |
| 17 | **Backup / Restore** | `/settings/backup` | Backup manual, jadwal backup, restore dari file |

### Navigasi
```
Login --> Dashboard (default setelah login)
             |
             v
        [Sidebar / TopNav]
             |
    +--------+--------+--------+--------+--------+
    |        |        |        |        |        |
  Kasir   Produk   Stok     Promo   Laporan   Pengaturan
                    |                 |
                  Opname         Harian
                                  Stok
                               Transaksi
```
