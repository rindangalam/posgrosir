# Progress — POS Grosir

## Ringkasan

| Sprint | Status | Selesai |
|---|---|---|
| **Sprint 1.1** — Init Project (Tauri + React + Tailwind + Router) | ✅ Selesai | 2026-07-19 |
| **Sprint 1.2** — Skema DB + Migration Runner + Koneksi SQLite | ✅ Selesai | 2026-07-19 |
| **Sprint 2.1** — CartStore + UI Keranjang + Search Produk | ✅ Selesai | 2026-07-26 |
| **Sprint 2.2** — Checkout + Multi-Payment + Hitung Total | ✅ Selesai | 2026-07-26 |
| **Sprint 2.3** — Promo Engine + Cetak Struk Preview | ✅ Selesai | 2026-07-26 |
| **Sprint 3.1** — CRUD Produk + Kategori + Konversi Satuan | ✅ Selesai | 2026-07-26 |
| **Sprint 3.2** — CRUD Batch Stok + FIFO Engine | ✅ Selesai | 2026-07-26 |
| **Sprint 4.1** — Laporan Omzet + Item Terlaris + Stok Menipis | ✅ Selesai | 2026-07-26 |
| **Sprint 4.2** — Stok Opname + Daily Summary Generator | ✅ Selesai | 2026-07-26 |
| **Sprint 5.1** — Printer ESC/POS + Cash Drawer + Final Barcode | ✅ Selesai | 2026-07-27 |
| **Sprint 5.2** — Timbangan Digital (Opsional) + Integrasi Akhir | ✅ Selesai | 2026-07-27 |
| **Sprint 6.1** — Testing + Packaging Installer | ✅ Selesai | 2026-07-27 |

## Catatan

| Tanggal | Catatan |
|---|---|
| 2026-07-19 | Sprint 1.2 ✅ DB layer: migrations, connection, check_db command. `cargo check` + `npm run build` sukses. |
| 2026-07-26 | Sprint 2.1 ✅ CartStore fully functional + search_products Rust command + Cashier page layout. |
| 2026-07-26 | Sprint 2.2 ✅ FIFO engine, create_transaction command, multi-payment UI, success page. |
| 2026-07-26 | Sprint 2.3 ✅ Promo engine (calculate_discounts, get_active_promotions), CRUD promo, receipt preview, auto-promo di cart. |
| 2026-07-26 | Sprint 3.1 ✅ CRUD produk, kategori, konversi satuan; halaman daftar produk + form produk lengkap. |
| 2026-07-26 | Sprint 3.2 ✅ CRUD batch stok, get_low_stock_products, badge Stok Menipis di cart, halaman stok + form batch. |
| 2026-07-26 | Sprint 4.1 ✅ Reports engine: daily summary, top products, transaction list/detail/void, CSV export. Halaman laporan harian, riwayat transaksi, detail transaksi. |
| 2026-07-26 | Sprint 4.2 ✅ Stock opname (get data + save + adjust batch), generate daily summary, halaman opname, tombol tutup kasir. |
| 2026-07-27 | Sprint 5.1 ✅ printer.rs (ESC/POS builder, list_printers via PowerShell, print_raw, test_print, cash drawer kick, paper cut). 3 commands registered (list_printers, print_receipt, test_print). Settings.tsx: dropdown printer, test print, paper width 58/80mm, auto print toggle, cash drawer toggle, scan timeout, print queue retry. CashierSuccess.tsx: auto-print after transaction + fallback queue. TransactionDetail.tsx: Cetak Ulang button. useBarcodeScanner.ts: buffer overflow 50 char limit, manual typing detection, scan timeout from localStorage. |
| 2026-07-27 | Sprint 5.2 ✅ scales.rs (list_serial_ports via serialport crate, read_scale 9600 8N1, parse weight format CAS/generic). 2 commands (list_serial_ports, read_scale). useScale.ts hook. Settings.tsx: port dropdown + test timbangan + timeout. Cashier.tsx: tombol Timbang per item auto-fill qty. Polish: keyboard shortcuts F1/F2/Escape, confirmation delete promo, loading states on save buttons, Toaster global. |
| 2026-07-27 | Sprint 6.1 ✅ 10 FIFO unit tests + 3 integration tests (migration, columns, cargo check). NSIS installer build sukses. manual_test.md dengan 10 skenario. Build ID: `POS Grosir_0.1.0_x64-setup.exe`. |

## Log Perubahan

| Tanggal | File | Perubahan |
|---|---|---|
| 2026-07-27 | `src-tauri/src/printer.rs` | Module baru: ESC/POS byte builder, list_printers via PowerShell Get-Printer, print_raw via Write-Printer, test_print, cash drawer + paper cut |
| 2026-07-27 | `src-tauri/src/commands/printer.rs` | 3 Tauri commands: list_printers, print_receipt, test_print |
| 2026-07-27 | `src-tauri/src/commands/mod.rs` | Register pub mod printer |
| 2026-07-27 | `src-tauri/src/lib.rs` | Add mod printer, register 3 printer commands (total 28 commands) |
| 2026-07-27 | `src/hooks/usePrinter.ts` | Hook usePrinter: listPrinters, printReceipt, testPrint, print queue (localStorage) |
| 2026-07-27 | `src/stores/uiStore.ts` | Tambah printerName, paperWidth, autoPrint, openDrawer + persistence via localStorage |
| 2026-07-27 | `src/pages/Settings.tsx` | Full implementation: printer dropdown + refresh, test print, paper width 58/80mm, auto print toggle, cash drawer toggle, scan timeout setting, print queue section |
| 2026-07-27 | `src/pages/CashierSuccess.tsx` | Auto-print after transaction (fetch detail items), manual print button, queue fallback on error |
| 2026-07-27 | `src/pages/TransactionDetail.tsx` | Tambah tombol "Cetak Ulang" (fetch detail + print) |
| 2026-07-27 | `src/hooks/useBarcodeScanner.ts` | Buffer overflow limit 50 chars, manual typing detection (timeout*3), scan timeout from localStorage |
| 2026-07-27 | `Cargo.toml` | Tambah serialport = "4.2" |
| 2026-07-27 | `src-tauri/src/scales.rs` | Module baru: list_serial_ports, read_scale (9600 8N1, parse CAS/generic weight format) |
| 2026-07-27 | `src-tauri/src/commands/scales.rs` | 2 Tauri commands: list_serial_ports, read_scale |
| 2026-07-27 | `src-tauri/src/lib.rs` | Add mod scales, register 2 commands (total 30 commands) |
| 2026-07-27 | `src/hooks/useScale.ts` | Hook useScale: listPorts, readScale, testScale |
| 2026-07-27 | `src/stores/uiStore.ts` | Tambah scalePortName, scaleTimeoutMs + persistence |
| 2026-07-27 | `src/pages/Settings.tsx` | Tambah section Timbangan Digital: pilih port, test, timeout |
| 2026-07-27 | `src/pages/Cashier.tsx` | Tombol Timbang per item, keyboard shortcuts F1/F2/Escape, confirmation batal |
| 2026-07-27 | `src/App.tsx` | Tambah Toaster global dari react-hot-toast |
| 2026-07-27 | `src/pages/Promotions.tsx` | Tambah confirmation delete + loading state delete/save |
| 2026-07-27 | `src-tauri/src/fifo.rs` | 10 unit test: allocate_single_batch, exact_batch, fifo_order, multiple_batches, insufficient_stock, zero_qty, no_batches, reduce_stock (normal, exact, insufficient) |
| 2026-07-27 | `src-tauri/tests/integration.rs` | 3 integration test: migration_applies (11 tables), migration_columns, cargo_check |
| 2026-07-27 | `src-tauri/tauri.conf.json` | Bundle config: NSIS currentUser, icons, migrations resource |
| 2026-07-27 | `docs/manual_test.md` | 10 skenario manual testing (transaksi, promo, produk, stok, opname, laporan, void, printer, backup, shortcuts) |
| 2026-07-27 | `src-tauri/target/release/bundle/nsis/POS Grosir_0.1.0_x64-setup.exe` | ✅ NSIS installer build sukses |
| 2026-07-19 | `docs/sprints.md` | Detail task teknis 12 sprint |
| 2026-07-19 | `progress.md` | Init file tracking |
| 2026-07-19 | `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | Init project Vite + React + TS |
| 2026-07-19 | `tailwind.config.js`, `postcss.config.js`, `src/index.css` | Setup Tailwind + daisyUI |
| 2026-07-19 | `src/main.tsx`, `src/App.tsx` | Entry point + routing |
| 2026-07-19 | `src/pages/*.tsx` (17 pages) | Halaman placeholder + routing |
| 2026-07-19 | `src/components/layout/` (Sidebar, TopNav, RootLayout) | Layout dasar aplikasi |
| 2026-07-19 | `src/stores/` (cartStore, uiStore) | Zustand stores |
| 2026-07-19 | `src/hooks/` (useBarcodeScanner, usePrinter, useDatabase) | Hooks placeholder |
| 2026-07-19 | `src/lib/` (currency, date, receipt) | Utility helpers |
| 2026-07-19 | `src/types/database.ts` | TypeScript interfaces |
| 2026-07-19 | `src-tauri/migrations/001_initial.sql` | 11 tabel + index |
| 2026-07-19 | `src-tauri/src/db/` (mod, connection, migrations) | Database layer Rust |
| 2026-07-19 | `src-tauri/src/lib.rs` | Init DB di setup() hook + command check_db |
| 2026-07-19 | `src-tauri/src/commands/`, `src-tauri/src/models/` | Module scaffold |
| 2026-07-19 | `src/pages/Dashboard.tsx` | Panggil check_db, tampilkan status database |
| 2026-07-19 | `src-tauri/` (Cargo.toml, build.rs, main.rs, lib.rs, tauri.conf.json, capabilities) | Scaffold backend Rust Tauri |
| 2026-07-26 | `src-tauri/src/models/product.rs` | Struct Product, ProductWithStock, UnitConversion |
| 2026-07-26 | `src-tauri/src/commands/products.rs` | Command search_products + get_unit_conversions |
| 2026-07-26 | `src-tauri/src/lib.rs` | Register search_products + get_unit_conversions |
| 2026-07-26 | `src/components/cashier/ProductSearch.tsx` | Search input dengan debounce + dropdown hasil |
| 2026-07-26 | `src/components/cashier/CartItemRow.tsx` | Item cart dengan qty selector + hapus |
| 2026-07-26 | `src/pages/Cashier.tsx` | Layout cashir penuh: search panel + keranjang + ringkasan bayar |
| 2026-07-26 | `src/stores/cartStore.ts` | Fix addItem: merge qty + base_quantity, subtotal proper |
| 2026-07-26 | `src/types/database.ts` | ICartItem tambah field plu_code, total_stock |
| 2026-07-26 | `src-tauri/src/fifo.rs` | FIFO engine: allocate_stock + reduce_stock |
| 2026-07-26 | `src-tauri/src/models/transaction.rs` | Struct TransactionResult, PaymentInfo |
| 2026-07-26 | `src-tauri/src/commands/transactions.rs` | Command create_transaction dengan SQLite transaction |
| 2026-07-26 | `src-tauri/src/lib.rs` | Register create_transaction, add mod fifo |
| 2026-07-26 | `src/pages/Cashier.tsx` | Redirect ke /cashier/payment |
| 2026-07-26 | `src/pages/CashierPayment.tsx` | Multi-payment UI: cash/QRIS/EDC, hitung sisa & kembalian |
| 2026-07-26 | `src/pages/CashierSuccess.tsx` | Tampilkan no transaksi, rincian bayar, tombol transaksi baru |
| 2026-07-26 | `src/stores/cartStore.ts` | Tambah lastTransaction state |
| 2026-07-26 | `src/types/database.ts` | Tambah ITransactionResult, IPaymentInfo |
| 2026-07-26 | `src-tauri/src/commands/promotions.rs` | get_active_promotions, calculate_discounts, CRUD promo commands |
| 2026-07-26 | `src-tauri/src/commands/mod.rs`, `lib.rs` | Register promotions module & commands |
| 2026-07-26 | `src/pages/Promotions.tsx` | Full CRUD promo: tabel + form modal (nama, tipe, nilai, scope, periode) |
| 2026-07-26 | `src/pages/Cashier.tsx` | Auto-call calculate_discounts after cart change, pass category_id |
| 2026-07-26 | `src/components/cashier/CartItemRow.tsx` | Badge "Promo", discount icon untuk manual diskon |
| 2026-07-26 | `src/stores/cartStore.ts` | applyPromoDiscounts action, promo_name per item |
| 2026-07-26 | `src/lib/receipt.ts` | Fix IPayment -> IPaymentInfo, format receipt text |
| 2026-07-26 | `src/pages/CashierSuccess.tsx` | Modal "Lihat Struk" — preview receipt monospace |
| 2026-07-26 | `src-tauri/src/commands/products.rs` | list_products, get_product, create_product, update_product, delete_product, list_categories, create_category, update_category, delete_category, set_unit_conversions |
| 2026-07-26 | `src-tauri/src/models/product.rs` | Tambah struct Category (Serialize + Deserialize) |
| 2026-07-26 | `src-tauri/src/lib.rs` | Register 9 command produk/kategori/konversi |
| 2026-07-26 | `src/pages/Products.tsx` | Tabel produk: search, filter kategori, pagination, formatRupiah, stok |
| 2026-07-26 | `src/pages/ProductForm.tsx` | Form lengkap: PLU, barcode, nama, kategori, harga, threshold, konversi satuan |
| 2026-07-26 | `src-tauri/src/models/stock.rs` | Struct StockBatch (Serialize + Deserialize) |
| 2026-07-26 | `src-tauri/src/commands/stocks.rs` | list_batches, create_batch, update_batch, delete_batch, get_low_stock_products |
| 2026-07-26 | `src-tauri/src/lib.rs` | Register 5 commands stok |
| 2026-07-26 | `src/pages/Stocks.tsx` | Pilih produk → lihat daftar batch (qty, expiry, supplier, harga beli) |
| 2026-07-26 | `src/pages/StockBatchForm.tsx` | Form tambah batch: search produk, qty, harga, expiry, batch_code, supplier |
| 2026-07-26 | `src/components/cashier/CartItemRow.tsx` | Badge "Stok Menipis" jika total_stock ≤ stock_threshold |
| 2026-07-26 | `src/types/database.ts` | ICartItem tambah stock_threshold |
| 2026-07-26 | `src/pages/Cashier.tsx` | handleSelectProduct kirim stock_threshold |
| 2026-07-26 | `src-tauri/src/commands/reports.rs` | get_daily_summary, get_top_products, list_transactions, get_transaction_detail, void_transaction, export_report_csv |
| 2026-07-26 | `src-tauri/src/lib.rs` | Register 7 commands reports |
| 2026-07-26 | `src/pages/DailyReport.tsx` | Kartu ringkasan (total trx, omzet, diskon, rata-rata), tabel per metode bayar, item terlaris top 10, stok menipis |
| 2026-07-26 | `src/pages/TransactionHistory.tsx` | Tabel riwayat + filter tanggal + metode bayar + pagination |
| 2026-07-26 | `src/pages/TransactionDetail.tsx` | Header, item list, pembayaran, total, tombol void + restore stok |
| 2026-07-26 | `src-tauri/src/commands/stocks.rs` | get_stock_opname_data + save_stock_opname (SQLite transaction, adjust batch) |
| 2026-07-26 | `src-tauri/src/commands/reports.rs` | generate_daily_summary (INSERT OR REPLACE ke daily_summary) |
| 2026-07-26 | `src-tauri/src/lib.rs` | Register 3 commands (opname x2 + generate) |
| 2026-07-26 | `src/pages/StockOpname.tsx` | Pilih kategori, tabel dengan input qty fisik, selisih real-time, simpan + adjust batch |
| 2026-07-26 | `src/pages/DailyReport.tsx` | Tombol "Generate & Tutup Kasir" — simpan daily_summary, tampilkan konfirmasi |

## Issue / Temuan

| Tanggal | Deskripsi | Status |
|---|---|---|
