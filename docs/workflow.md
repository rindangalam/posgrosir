# Rencana Pengembangan — POS Grosir

## Fase 1: Setup Project & Skema Database

**Tujuan**: Mendapatkan project Tauri + React yang bisa dikompilasi dan koneksi SQLite berfungsi.

**Deliverable**:
- Project Tauri 2 + React + Vite + TypeScript bisa `cargo tauri dev`
- SQLite database terbuat otomatis saat aplikasi pertama jalan
- Semua tabel (11 tabel) sudah tercatat di file migrasi
- Migrasi otomatis berjalan di startup

**Task teknis**:
1. Inisialisasi project dengan `npm create tauri-app` (React + TypeScript + Vite)
2. Install dependencies: `react-router-dom`, `zustand`, `tailwindcss`, `daisyui`, `date-fns`
3. Setup Tailwind CSS + daisyUI config
4. Setup routing React Router (semua route dari appflow.md)
5. Tambah `tauri-plugin-sql` (SQLite) di `Cargo.toml` dan `src-tauri/`
6. Buat folder `src-tauri/migrations/` dengan file `001_initial.sql`
7. Implementasi migration runner di Rust (baca `PRAGMA user_version`, jalankan file SQL)
8. Implementasi fungsi Rust `init_database()` yang dipanggil saat app setup
9. Verifikasi: `cargo tauri dev` → database terbuat → tabel terlihat via `sqlite3`

## Fase 2: UI & Logika Transaksi Kasir

**Tujuan**: Kasir bisa melakukan transaksi lengkap (tanpa printer real — pakai print preview/log).

**Deliverable**:
- Layar Kasir dengan keranjang real-time
- Pencarian produk via barcode (keyboard event) dan input manual
- Multi-metode pembayaran dalam satu transaksi
- Perhitungan total, diskon, dan kembalian
- Transaksi tersimpan di database
- Struk preview (console log / file output)

**Task teknis**:
1. Buat hook `useBarcodeScanner` (akumulasi karakter + timeout)
2. Implementasi produk search (by barcode / PLU / nama) via Rust command `search_products`
3. Buat state keranjang (Zustand store: `cartStore`)
4. Implementasi fungsi Rust `create_transaction` dengan transaction_items dan payments dalam satu SQLite transaction
5. UI keranjang: list item, qty selector, delete item, subtotal per item
6. UI total: subtotal, diskon, grand total
7. UI pembayaran: pilih metode, input nominal, kombinasi multi-metode, hitung kembalian
8. Implementasi skema promo: cek promo per item dan kategori saat checkout
9. Simulasi cetak struk (format teks ke console / file `.txt`)
10. Tampilan transaksi sukses + tombol transaksi baru

## Fase 3: Manajemen Stok & Batch

**Tujuan**: Pemilik toko bisa menambah stok, melihat batch, dan sistem mengurangi stok dengan FIFO otomatis saat transaksi.

**Deliverable**:
- CRUD produk (dengan kategori)
- Tambah batch stok (qty, harga beli, expiry, supplier)
- FIFO engine: stok berkurang dari batch terlama saat transaksi
- Peringatan stok menipis (threshold per produk)
- Tabel konversi satuan per produk

**Task teknis**:
1. Buat halaman Daftar Produk + Form Produk (CRUD)
2. Implementasi kategori (CRUD, tree untuk sub-kategori)
3. Buat halaman Manajemen Stok + Form Batch (CRUD)
4. Implementasi unit_conversions CRUD
5. Implementasi FIFO engine di Rust:
   - Fungsi `allocate_stock(product_id, base_quantity)` — pilih batch terlama dengan qty cukup
   - Fungsi `reduce_stock(batch_id, quantity)` — kurangi `stock_batches.quantity`
   - Jalankan dalam transaksi SQLite yang sama dengan `create_transaction`
6. Implementasi pengecekan expired date: cegah penjualan batch expired
7. Implementasi peringatan stok menipis: highlight item di keranjang + toast notifikasi
8. Tampilkan stok saat ini di halaman produk

## Fase 4: Laporan & Stok Opname

**Tujuan**: Pemilik toko bisa melihat laporan harian dan melakukan opname stok.

**Deliverable**:
- Laporan omzet harian (generate otomatis saat tutup kasir)
- Laporan item terlaris
- Laporan stok menipis
- Riwayat transaksi lengkap + filter tanggal
- Stok opname: input qty fisik, sistem hitung selisih, adjust stok
- Fungsi export laporan ke CSV

**Task teknis**:
1. Implementasi Rust command `get_daily_summary(date)` — agregat dari transactions + payments
2. Implementasi Rust command `get_top_products(date, limit)` — dari transaction_items
3. Implementasi Rust command `get_low_stock_products()` — produk dengan stok <= threshold
4. Buat halaman Laporan Harian + tampilkan data
5. Buat halaman Riwayat Transaksi + filter tanggal + detail klik
6. Implementasi stok opname:
   - Pilih produk → tampilkan stok sistem per batch
   - Input qty fisik per batch (atau total produk)
   - Hitung selisih → simpan ke `stock_opname` → adjust batch (`is_deleted` + batch baru)
7. Implementasi `daily_summary` generator (tombol tutup kasir)
8. Fungsi export ke CSV (laporan harian, item terlaris)

## Fase 5: Integrasi Hardware

**Tujuan**: Sistem terintegrasi dengan printer thermal ESC/POS, cash drawer, dan barcode scanner.

**Deliverable**:
- Cetak struk thermal real ke printer (via USB/serial)
- Cash drawer terbuka otomatis saat cetak struk
- Barcode scanner berfungsi penuh (sudah siap di Fase 2, integrasi final)
- Konfigurasi printer di halaman Pengaturan
- (Opsional) integrasi timbangan digital

**Task teknis**:
1. Implementasi Rust module `printer`:
   - Fungsi `list_printers()` — deteksi printer USB/serial yang terhubung
   - Fungsi `print_receipt(receipt_data)` — kirim ESC/POS commands
   - Format struk: header toko, daftar item, total, metode bayar, footer
   - Command cash drawer: `ESC p 0 25 250`
2. Buat halaman Pengaturan Printer:
   - Pilih printer dari daftar
   - Test print
   - Atur lebar kertas (58mm / 80mm)
3. Integrasi cetak di akhir transaksi (Fase 2): panggil Rust `print_receipt`
4. Handle error printer: jika printer offline, tampilkan notifikasi + simpan antrian cetak
5. Finalisasi barcode scanner: handle edge case (input campuran scanner + keyboard)
6. (Opsional) integrasi timbangan serial:
   - Rust module `serial` dengan crate `serialport`
   - Baca data dari timbangan → parse berat → auto-fill qty di keranjang

## Fase 6: Testing & Packaging Installer

**Tujuan**: Aplikasi siap didistribusikan sebagai installer Windows.

**Deliverable**:
- Test: semua alur transaksi, stok, laporan, backup/restore
- Backup & restore berfungsi
- Installer `.exe` / `.msi` via Tauri bundler
- Dokumentasi singkat pengguna (opsional)

**Task teknis**:
1. Setup test database in-memory untuk Rust unit test:
   - Test FIFO engine
   - Test perhitungan diskon dan promo
   - Test create_transaction dengan berbagai skenario
   - Test migrasi skema
2. Manual testing semua alur dari appflow.md:
   - Transaksi normal (scan, keranjang, multi-payment, cetak)
   - Transaksi dengan promo
   - Tambah batch baru
   - Stok opname
   - Backup & restore
3. Buat script build: `cargo tauri build` (pastikan smooth)
4. Konfigurasi Tauri bundler:
   - Windows: NSIS atau MSI
   - Ikon aplikasi
   - Nama publisher
5. Test installer di mesin clean (Windows tanpa Rust/node)
6. Final: jika semua OK, siap rilis MVP
