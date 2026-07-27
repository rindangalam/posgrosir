# Manual Testing — POS Grosir MVP

## Prerequisites
- Install from `POS Grosir_0.1.0_x64-setup.exe`
- Printer thermal terhubung (opsional)
- Barcode scanner USB (opsional)

## Test 1: Transaksi Normal
1. Buka aplikasi → Dashboard muncul
2. Klik "Kasir" (atau F1)
3. Scan barcode / ketik nama produk di search → pilih dari dropdown
4. Tambah 3-5 item ke keranjang
5. Klik "Lanjut ke Pembayaran"
6. Input nominal Tunai (>= total) + QRIS/EDC jika ingin multi-payment
7. Klik "Bayar"
8. ✅ Transaksi sukses muncul + struk tercetak (jika printer aktif)

## Test 2: Transaksi dengan Promo
1. Masuk ke halaman Promo → tambah promo: "Diskon 10%" type=percentage, scope=all
2. Kembali ke Kasir, tambah item
3. ✅ Diskon otomatis terhitung (badge "Promo" muncul)
4. Checkout → ✅ total sudah termasuk diskon

## Test 3: CRUD Produk
1. Masuk ke Produk → klik "Tambah Produk"
2. Isi PLU, Nama, Harga Jual, Kategori
3. Tambah konversi satuan (1 dus = 12 pcs)
4. Simpan → ✅ produk muncul di daftar
5. Edit produk → ✅ tersimpan
6. Hapus kategori (jika ada)

## Test 4: Manajemen Stok
1. Masuk ke Stok → pilih produk
2. Tambah batch: qty 100, harga beli, expiry date
3. ✅ Batch tercatat
4. Kembali ke Kasir → transaksi menggunakan produk tsb
5. ✅ Stok berkurang sesuai FIFO (batch terdahulu terpakai dulu)

## Test 5: Stok Opname
1. Masuk ke Stok Opname
2. Pilih kategori (atau semua)
3. Input qty fisik berbeda dari sistem
4. ✅ Selisih terhitung real-time
5. Simpan → ✅ batch stok disesuaikan

## Test 6: Laporan Harian
1. Pastikan sudah ada transaksi hari ini
2. Buka Laporan Harian
3. ✅ Ringkasan: total transaksi, omzet, diskon
4. ✅ Item terlaris top 10
5. ✅ Stok menipis
6. Klik "Generate & Tutup Kasir" → ✅ daily summary tersimpan

## Test 7: Riwayat & Void Transaksi
1. Buka Laporan → Riwayat Transaksi
2. Filter tanggal → ✅ transaksi muncul
3. Klik detail transaksi
4. ✅ Item, pembayaran, total tampil benar
5. Klik "Void Transaksi" → konfirmasi
6. ✅ Status berubah jadi voided + stok kembali

## Test 8: Pengaturan Printer
1. Masuk ke Pengaturan
2. ✅ Printer terdeteksi di dropdown
3. Pilih printer + lebar kertas
4. Klik "Test Print" → ✅ struk test tercetak
5. Centang auto print + cash drawer

## Test 9: Backup & Restore
1. Masuk ke Pengaturan → Backup
2. Klik backup → ✅ file .db tersimpan
3. (Opsional) restore di komputer lain

## Test 10: Keyboard Shortcuts
1. Di halaman Kasir:
   - F1 → fokus ke halaman kasir
   - F2 → fokus ke search
   - Escape → konfirmasi batal transaksi
2. ✅ Semua shortcut berfungsi
