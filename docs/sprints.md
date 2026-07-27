# Sprint Breakdown — POS Grosir

## Sprint 1.1 — Init Project
**Fase**: 1 — Setup Project & Skema Database
**Target**: Tauri + React + Tailwind + Router berfungsi
**Dokumen acuan**: `docs/techstack.md`, `docs/appflow.md`

### Task Teknis
1. Inisialisasi project dengan `npm create tauri-app` (React + TypeScript + Vite template)
2. Install dependencies:
   - `react-router-dom` (routing)
   - `zustand` (state management)
   - `tailwindcss`, `daisyui` (UI framework)
   - `date-fns` (manipulasi tanggal)
   - `react-hot-toast` (notifikasi)
3. Setup konfigurasi Tailwind + daisyUI (`tailwind.config.js`)
4. Setup routing React Router dengan semua route dari daftar 17 layar di `appflow.md`
5. Buat layout dasar: Sidebar (navigasi kiri) + TopNav + konten area
6. Buat halaman placeholder untuk setiap route (judul + "Coming Soon")
7. Setup `App.tsx` dengan RootLayout + RouterProvider
8. Verifikasi: `npm run dev` berjalan tanpa error, semua route bisa diakses

### Deliverable
- Project bisa `npm run dev` dengan Vite
- 17 halaman placeholder muncul via routing
- Layout Sidebar + TopNav berfungsi untuk navigasi

---

## Sprint 1.2 — Skema Database & Migration Runner
**Fase**: 1 — Setup Project & Skema Database
**Target**: SQLite terhubung, migrasi otomatis, semua tabel tercatat
**Dokumen acuan**: `docs/ERD.md`, `docs/techstack.md`

### Task Teknis
1. Tambah `rusqlite` dan `tauri-plugin-sql` di `Cargo.toml`
2. Buat folder `src-tauri/migrations/` dengan file `001_initial.sql`
3. Tulis `001_initial.sql` berisi CREATE TABLE untuk 11 tabel (lihat ERD):
   - categories, products, unit_conversions, stock_batches
   - transactions, transaction_items, payments
   - promotions, users, stock_opname, daily_summary
4. Implementasi modul `db/mod.rs` + `db/connection.rs`:
   - Fungsi `init_database(path)` — buka koneksi SQLite, enable WAL mode, set foreign_keys ON
   - State management: simpan `Connection` di Tauri managed state
5. Implementasi modul `db/migrations.rs`:
   - Baca `PRAGMA user_version`
   - Loop file migrasi dari versi saat ini hingga terbaru
   - Eksekusi tiap file dalam transaksi (`BEGIN; ... COMMIT;`)
   - Update `PRAGMA user_version` setelah tiap migrasi
6. Panggil `init_database` + `run_migrations` di `setup()` hook Tauri (di `main.rs` atau `lib.rs`)
7. Buat Tauri command `check_db` untuk verifikasi dari frontend (daftar tabel)
8. Verifikasi: `cargo tauri dev` — database terbuat di folder `$APP_DATA_DIR/posgrosir.db`, semua tabel bisa diquery via sqlite3 CLI

### Deliverable
- File `001_initial.sql` dengan 11 tabel lengkap (index, constraints, default values)
- Migration runner berfungsi: database baru langsung terisi semua tabel
- Tauri command `check_db` mengembalikan daftar tabel dari SQLite

---

## Sprint 2.1 — CartStore + UI Keranjang + Search Produk
**Fase**: 2 — UI & Logika Transaksi Kasir
**Target**: Kasir bisa mencari produk dan menambahkannya ke keranjang
**Dokumen acuan**: `docs/appflow.md`, `docs/ERD.md`

### Task Teknis
1. Buat Zustand store `cartStore`:
   - State: `items: CartItem[]`, `subtotal`, `discountTotal`, `grandTotal`
   - Actions: `addItem`, `removeItem`, `updateQty`, `applyDiscount`, `clearCart`
   - Type `CartItem`: productId, name, barcode, qty, unit, price, discount, subtotal
2. Buat TypeScript types di `src/types/database.ts`:
   - `IProduct`, `ICartItem`, `ITransaction`, `IPayment`, `IBatch`, `IPromotion`
3. Buat Rust command `search_products(query: String)`:
   - Query SQL: `SELECT * FROM products WHERE barcode = ? OR plu_code = ? OR name LIKE ?`
   - Return `Vec<Product>` sebagai JSON
4. Buat halaman `Cashier.tsx`:
   - Bagian kiri: input pencarian (scan barcode / ketik PLU / ketik nama)
   - Bagian kanan: daftar item keranjang
   - Tombol tambah item (manual entry jika scan tidak menemukan)
5. Buat hook `useBarcodeScanner`:
   - Event listener `keydown` global
   - Buffer akumulasi karakter dengan timeout 100ms
   - Trigger pencarian saat `Enter` diterima
6. Buat komponen `ProductSearch`:
   - Input field dengan auto-search (debounce 300ms untuk input manual)
   - Dropdown hasil pencarian
   - Tampilkan nama, barcode/PLU, harga, stok
7. UI keranjang:
   - List item: nama, qty, satuan, harga satuan, subtotal, tombol hapus
   - Qty selector (+/-) dengan update stok real-time
   - Pilihan satuan (dus/pcs/gram) berdasarkan `unit_conversions`
8. Verifikasi: scan produk (simulasi ketik barcode + enter) -> muncul di keranjang

### Deliverable
- `cartStore` dengan logika lengkap (add, remove, update, discount)
- `useBarcodeScanner` hook siap pakai
- Produk bisa dicari via Rust command dan ditambahkan ke keranjang
- UI keranjang dengan daftar item dan qty selector

---

## Sprint 2.2 — Checkout + Multi-Payment + Hitung Total
**Fase**: 2 — UI & Logika Transaksi Kasir
**Target**: Kasir bisa menyelesaikan transaksi dengan multi-payment
**Dokumen acuan**: `docs/appflow.md`, `docs/ERD.md`

### Task Teknis
1. Hitung total di keranjang:
   - Subtotal = sum(qty * price) per item
   - Diskon = sum(discount) per item + promo kategori
   - Grand total = subtotal - total diskon
   - Tampilkan real-time di footer keranjang
2. UI halaman pembayaran (`/cashier/payment`):
   - Tampilkan grand total
   - Tiga panel metode bayar: Cash / QRIS / EDC
   - Input nominal per metode
   - Indikator sisa yang harus dibayar
   - Tombol "Selesai" (aktif jika total bayar >= grand total)
3. Logika multi-payment:
   - User bisa input cash, lalu tambah QRIS, lalu tambah EDC
   - Total bayar = cash + qris + edc
   - Kembalian = total bayar - grand total (hanya dari cash)
4. Implementasi Rust command `create_transaction`:
   - Parameter: daftar items + daftar payments
   - Bungkus dalam SQLite transaction
   - INSERT `transactions` (generate nomor: TRX-YYYYMMDD-NNNN)
   - INSERT `transaction_items` (dengan harga snapshot saat transaksi)
   - INSERT `payments` (per metode)
   - Kurangi stok per batch (FIFO) — panggil `allocate_stock`
   - Return `transaction_id` + `transaction_number`
5. Halaman "Transaksi Sukses":
   - Tampilkan nomor transaksi, total, metode bayar, kembalian
   - Tombol "Transaksi Baru" (reset keranjang)
6. Verifikasi: transaksi dengan 3 metode bayar (cash + QRIS + EDC) tersimpan di database

### Deliverable
- Multi-payment UI (cash/QRIS/EDC dalam satu transaksi)
- Rust command `create_transaction` dengan SQLite transaction
- Transaksi sukses: data tersimpan di tabel transactions, transaction_items, payments

---

## Sprint 2.3 — Promo Engine + Cetak Struk Preview
**Fase**: 2 — UI & Logika Transaksi Kasir
**Target**: Diskon promo aktif teraplikasi otomatis, struk bisa dicek
**Dokumen acuan**: `docs/appflow.md`, `docs/ERD.md`

### Task Teknis
1. Implementasi Rust command `get_active_promotions`:
   - Query: `SELECT * FROM promotions WHERE is_active = 1 AND start_date <= now AND end_date >= now`
2. Implementasi Rust command `calculate_discounts(items: Vec<CartItem>)`:
   - Cek promo per produk (scope = 'product')
   - Cek promo per kategori (scope = 'category')
   - Cek promo all (scope = 'all')
   - Hitung diskon per item (percentage atau nominal)
   - Return daftar diskon per item + total diskon
3. Integrasi promo ke UI keranjang:
   - Panggil `calculate_discounts` setiap ada perubahan item/qty
   - Tampilkan diskon per item di list keranjang
   - Highlight item yang sedang promo
4. Halaman Promo (`/promotions`):
   - Daftar promo aktif + expired
   - Form tambah promo: nama, tipe (%, nominal), scope, nilai, periode
   - Tombol hapus/nonaktifkan promo
5. Buat helper `lib/receipt.ts`:
   - Format data transaksi menjadi teks struk
   - Header: nama toko, alamat, tanggal, nomor transaksi
   - Body: daftar item (nama, qty, harga, subtotal, diskon)
   - Footer: total, metode bayar, kembalian, terima kasih
   - Format monospace, alignment untuk printer 58mm/80mm
6. Tampilkan preview struk di halaman transaksi sukses (modal "Lihat Struk")
7. Verifikasi: promo 10% untuk kategori "Minuman" teraplikasi otomatis di keranjang

### Deliverable
- `calculate_discounts` Rust command dengan logika promo per item/kategori/semua
- Halaman Promo (CRUD)
- Preview struk di layar
- Diskon terlihat di keranjang sebelum checkout

---

## Sprint 3.1 — CRUD Produk + Kategori + Konversi Satuan
**Fase**: 3 — Manajemen Stok & Batch
**Target**: Pemilik toko bisa menambah produk dengan kategori dan konversi satuan
**Dokumen acuan**: `docs/ERD.md`, `docs/appflow.md`

### Task Teknis
1. Implementasi Rust command `list_products(search, category_id, page, limit)`
2. Implementasi Rust command `get_product(id)` — lengkap dengan stok & batch
3. Implementasi Rust command `create_product(data: CreateProductInput)`
4. Implementasi Rust command `update_product(id, data: UpdateProductInput)`
5. Implementasi Rust command `delete_product(id)` — soft delete (is_active = 0)
6. Implementasi Rust command `list_categories`
7. Implementasi Rust command `create_category`, `update_category`, `delete_category`
8. Implementasi Rust command `set_unit_conversions(product_id, conversions[])`
9. Halaman Daftar Produk (`/products`):
   - Tabel dengan kolom: PLU, barcode, nama, kategori, harga jual, stok total, status
   - Filter by kategori
   - Search by nama / barcode / PLU
   - Tombol tambah, edit, hapus
10. Halaman Form Produk (`/products/form`):
    - Field: PLU code, barcode (opsional), nama, deskripsi, kategori
    - Harga: beli, jual (dalam rupiah integer)
    - Satuan dasar (base_unit): pcs/gram/ml
    - Threshold stok menipis
    - Tabel konversi satuan: tambah baris (from_unit, to_unit, factor)
    - Tombol simpan
11. Verifikasi: tambah produk "Minyak Goreng" dengan base_unit=ml, konversi dus->pcs (12), pcs->ml (1000)

### Deliverable
- CRUD produk + kategori via Rust commands
- Halaman daftar & form produk
- Konversi satuan bisa ditambahkan per produk
- Search produk berfungsi by barcode, PLU, nama

---

## Sprint 3.2 — CRUD Batch Stok + FIFO Engine
**Fase**: 3 — Manajemen Stok & Batch
**Target**: Stok batch tercatat, FIFO berfungsi, stok menipis terdeteksi
**Dokumen acuan**: `docs/ERD.md`, `docs/appflow.md`

### Task Teknis
1. Implementasi Rust command `list_batches(product_id)` — daftar batch per produk
2. Implementasi Rust command `create_batch(product_id, data: CreateBatchInput)`:
   - Insert ke stock_batches
   - Update total stok produk (kolom `total_stok` bisa dihitung via query)
3. Implementasi Rust command `update_batch(id, data)` — hanya qty & harga jual (bukan batch yg sudah terpakai)
4. Implementasi Rust command `delete_batch(id)` — soft delete (is_deleted = 1)
5. Implementasi **FIFO engine** (`src-tauri/src/fifo.rs`):
   - `allocate_stock(product_id, base_quantity)`:
     - SELECT batch dari `stock_batches` WHERE product_id = ? AND quantity > 0 AND is_deleted = 0 AND expiry_date >= today
     - ORDER BY expiry_date ASC, received_date ASC
     - Ambil dari batch terlama sampai quantity terpenuhi
     - Return Vec<(batch_id, quantity_to_take)>
   - `reduce_stock(batch_id, quantity)`:
     - UPDATE stock_batches SET quantity = quantity - ? WHERE id = ?
     - Jika quantity <= 0, set is_deleted = 1
   - Integrasi dengan `create_transaction` dari Sprint 2.2
6. Implementasi Rust command `get_low_stock_products`:
   - Query: produk dengan total stok (SUM stock_batches.quantity) <= stock_threshold
7. Halaman Manajemen Stok (`/stocks`):
   - Pilih produk -> lihat daftar batch (qty, expiry, harga beli, supplier)
   - Tombol tambah batch baru
8. Halaman Form Batch (`/stocks/batch`):
   - Field: quantity (dalam base_unit), harga beli per unit, expiry date, batch code, supplier
   - Validasi: quantity > 0, expiry date >= today
9. Peringatan stok menipis di halaman Kasir:
   - Saat scan produk, cek stok <= threshold -> toast warning
   - Di keranjang, item dengan stok menipis diberi badge "Stok Menipis"
10. Verifikasi: beli 100 pcs produk batch 1 (exp 2026-12-31), lalu 100 pcs batch 2 (exp 2026-10-31). Transaksi 150 pcs -> harus ambil dari batch 2 (terlama) dulu

### Deliverable
- FIFO engine di `fifo.rs` (allocate_stock + reduce_stock)
- CRUD batch stok via Rust commands
- Halaman daftar batch + form batch
- Stok menipis terdeteksi dan muncul peringatan di UI

---

## Sprint 4.1 — Laporan Omzet, Item Terlaris, Stok Menipis
**Fase**: 4 — Laporan & Stok Opname
**Target**: Pemilik toko bisa melihat laporan harian lengkap
**Dokumen acuan**: `docs/appflow.md`, `docs/ERD.md`

### Task Teknis
1. Implementasi Rust command `get_daily_summary(date: String)`:
   - Hitung dari tabel `transactions` WHERE DATE(created_at) = ? AND payment_status = 'completed'
   - Total transaksi, subtotal, diskon, grand total
   - Per metode: total cash, total qris, total edc (dari tabel `payments`)
2. Implementasi Rust command `get_top_products(date, limit)`:
   - Query: SELECT p.id, p.name, SUM(ti.quantity) as total_qty, SUM(ti.subtotal) as total_revenue
   - FROM transaction_items ti JOIN products p ON ti.product_id = p.id
   - JOIN transactions t ON ti.transaction_id = t.id
   - WHERE DATE(t.created_at) = ? AND t.payment_status = 'completed'
   - GROUP BY p.id ORDER BY total_qty DESC LIMIT ?
3. Halaman Laporan Harian (`/reports/daily`):
   - Tampilkan tanggal (default: hari ini, bisa ganti)
   - Kartu: Total Transaksi, Omzet, Diskon, Rata-rata per Transaksi
   - Tabel: Ringkasan per Metode Bayar
   - Grafik (optional): item terlaris top 10 (bisa pakai recharts nanti)
   - Tombol "Cetak Laporan" (format teks untuk printer)
4. Implementasi Rust command `export_report_csv(report_type, date, path)`:
   - Export daily summary / top products / transaction list ke CSV
   - Simpan ke path yang dikirim dari frontend
5. Halaman Riwayat Transaksi (`/reports/transactions`):
   - Tabel: nomor transaksi, tanggal, total, metode bayar, status
   - Filter by tanggal range (start date - end date)
   - Filter by metode bayar
   - Klik baris -> detail transaksi
6. Halaman Detail Transaksi (`/reports/transactions/:id`):
   - Header: nomor, tanggal, status
   - Item list: nama, qty, satuan, harga, diskon, subtotal
   - Pembayaran: per metode
   - Total: subtotal, diskon, grand total
   - Tombol Void (jika status = 'completed')
7. Verifikasi: setelah beberapa transaksi, laporan harian menunjukkan angka yang sesuai

### Deliverable
- Rust commands: `get_daily_summary`, `get_top_products`, `export_report_csv`
- Halaman laporan harian dengan kartu ringkasan
- Halaman riwayat transaksi dengan filter tanggal
- Halaman detail transaksi

---

## Sprint 4.2 — Stok Opname + Daily Summary Generator
**Fase**: 4 — Laporan & Stok Opname
**Target**: Stok opname bisa dilakukan, daily summary otomatis
**Dokumen acuan**: `docs/appflow.md`, `docs/ERD.md`

### Task Teknis
1. Implementasi Rust command `get_stock_opname_data`:
   - Return daftar produk + stok sistem per batch
   - Bisa filter by kategori
2. Implementasi Rust command `save_stock_opname(items: Vec<OpnameItem>)`:
   - Untuk tiap item: INSERT ke `stock_opname`
   - Jika ada selisih: adjust batch (soft-delete batch lama + buat batch baru)
   - Atau: buat batch adjustment dengan qty = actual_quantity
3. Implementasi Rust command `generate_daily_summary(date)`:
   - Hitung ALL dari transactions + payments untuk tanggal tersebut
   - INSERT atau REPLACE ke tabel `daily_summary`
   - Return summary yang sudah tersimpan
4. Halaman Stok Opname (`/stocks/opname`):
   - Pilih kategori (opsional)
   - Tabel: produk, stok sistem, qty fisik (input), selisih
   - Input qty fisik untuk tiap batch (atau per produk)
   - Hitung selisih real-time
   - Tombol "Simpan Opname" -> simpan + adjust stok
5. Tombol "Generate & Tutup Kasir" di halaman Laporan Harian:
   - Generate daily_summary untuk hari ini
   - Reset counter transaksi (opsional)
   - Tampilkan konfirmasi sukses
6. Verifikasi: stok opname dengan selisih -> stok berubah sesuai input fisik

### Deliverable
- Rust commands: stok opname CRUD, daily summary generator
- Halaman stok opname dengan input qty fisik
- Tombol tutup kasir yang generate daily_summary

---

## Sprint 5.1 — Printer ESC/POS + Cash Drawer + Final Barcode
**Fase**: 5 — Integrasi Hardware
**Target**: Printer thermal dan cash drawer berfungsi dari aplikasi
**Dokumen acuan**: `docs/techstack.md`, `docs/appflow.md`

### Task Teknis
1. Buat modul Rust `printer.rs`:
   - Fungsi `list_printers()` — deteksi printer yang terhubung via USB/serial
   - Fungsi `print_receipt(receipt_data: ReceiptData)`:
     - Format ESC/POS commands
     - Header: nama toko (bold, center), alamat (center)
     - Garis pemisah: `-` x 32 atau 48
     - Item: nama, qty@harga, subtotal (dengan alignment)
     - Total, diskon, metode bayar
     - Footer: terima kasih
     - Buka cash drawer (ESC p 0 25 250)
   - Fungsi `test_print()` — cetak halaman test
2. Implementasi command `print_receipt` sebagai Tauri command
3. Halaman Pengaturan Printer (`/settings`):
   - Dropdown pilih printer dari daftar
   - Tombol "Test Print"
   - Pilih lebar kertas: 58mm (32 kolom) atau 80mm (48 kolom)
4. Integrasi cetak ke alur transaksi:
   - Setelah transaksi sukses, panggil `print_receipt`
   - Jika printer error: tampilkan notifikasi, simpan ke antrian cetak (queue di localStorage)
   - Tombol "Cetak Ulang" di halaman detail transaksi
5. Finalisasi `useBarcodeScanner`:
   - Handle input campuran: jika ada karakter dalam 100ms terakhir dari scanner, abaikan keyboard manual
   - Buffer overflow: maksimal 50 karakter, reset jika lebih
   - Multiple scan cepat: proses antrian
6. Verifikasi: scan barcode produk -> masuk keranjang -> checkout -> struk tercetak

### Deliverable
- Modul Rust `printer.rs` dengan ESC/POS commands
- Printer dan cash drawer berfungsi
- Halaman pengaturan printer
- Barcode scanner final (handle edge case)

---

## Sprint 5.2 — Timbangan Digital (Opsional) + Integrasi Akhir
**Fase**: 5 — Integrasi Hardware
**Target**: Timbangan digital bisa terbaca (jika tersedia) + final polish
**Dokumen acuan**: `docs/techstack.md`

### Task Teknis
1. Tambah crate `serialport` di `Cargo.toml`
2. Buat modul Rust `scales.rs`:
   - Fungsi `list_serial_ports()`
   - Fungsi `read_scale(port_name, timeout_ms)`:
     - Buka koneksi serial
     - Kirim command request berat (tergantung protokol timbangan)
     - Parse response: ambil nilai berat dalam gram
     - Return berat
3. Hook `useScale` di frontend:
   - Tombol "Timbang" di keranjang
   - Saat diklik: panggil Rust command `read_scale`
   - Hasil berat auto-fill ke qty item yang dipilih
   - Konversi gram ke base_unit jika perlu
4. Halaman pengaturan timbangan:
   - Pilih port serial
   - Tombol test timbangan
5. Polish akhir:
   - Loading state di semua halaman (spinner / skeleton)
   - Error handling: jika Rust command gagal, tampilkan toast
   - Konfirmasi dialog untuk aksi penting (hapus produk, void transaksi)
   - Keyboard shortcuts: F1 = Kasir, F2 = Cari Produk, Escape = Batal
6. Verifikasi: timbangan terbaca (jika hardware tersedia) / simulasi manual

### Deliverable
- Modul Rust `scales.rs` (opsional, skip jika tidak ada hardware)
- Hook `useScale`
- Polish UI: loading, error handling, keyboard shortcuts

---

## Sprint 6.1 — Testing + Packaging Installer
**Fase**: 6 — Testing & Packaging
**Target**: Aplikasi siap didistribusikan sebagai installer Windows
**Dokumen acuan**: `docs/PRD.md` (kriteria sukses)

### Task Teknis
1. Setup test database in-memory untuk Rust:
   - Test FIFO engine: berbagai skenario alokasi batch
   - Test `calculate_discounts`: promo % dan nominal, scope campuran
   - Test `create_transaction`: validasi stok cukup, multi-payment
   - Test migrasi: dari versi 0 ke versi terbaru
2. Manual testing semua alur dari `docs/appflow.md`:
   - Transaksi normal: scan -> keranjang -> multi-payment -> cetak
   - Transaksi dengan promo: diskon per item dan kategori
   - Stok: tambah batch, FIFO allocation, stok menipis
   - Stok opname: input fisik, adjust, verifikasi
   - Backup & restore: backup file, restore
   - Void transaksi: stok kembali
3. Konfigurasi Tauri bundler di `tauri.conf.json`:
   - Windows: NSIS installer (.exe)
   - Ikon: `public/icon.png` -> `icons/icon.ico`
   - Identifier: `com.posgrosir.app`
   - Publisher name
4. Build: `cargo tauri build` — pastikan kompilasi sukses
5. Test installer di mesin clean (Windows tanpa Rust / Node.js)
6. Buat release notes singkat untuk versi MVP

### Deliverable
- Rust unit test untuk FIFO engine, promo, dan transaksi
- Installer `.exe` yang siap didistribusikan
- Aplikasi berfungsi penuh di mesin clean
- Sesuai dengan kriteria sukses di PRD
