# Tech Stack — POS Grosir

## 1. Teknologi per Layer

| Layer | Teknologi | Alasan |
|---|---|---|
| **Shell Aplikasi** | Tauri 2.x (Rust) | Lebih ringan dari Electron (~10MB binary), akses native ke hardware (printer, scanner, serial) via Rust, aman. |
| **Frontend UI** | React 18 + TypeScript | Komunitas besar, kompatibel dengan Tauri, type-safe. |
| **Bundler** | Vite 5 | Cepat (HMR instan), sudah jadi default Tauri. |
| **State Management** | Zustand | Minimal boilerplate, cukup untuk toko tunggal tanpa server. Tidak perlu Redux. |
| **Routing** | React Router v6 | Layout multi-halaman (kasir, stok, laporan). |
| **CSS / UI** | Tailwind CSS 3 + daisyUI | Cepat prototyping, komponen siap pakai, ringan. |
| **Database** | SQLite via rusqlite (Rust) | Tertanam di binary, zero konfigurasi, 100% offline. |
| **ORM / Query** | tauri-plugin-sql (SQLite) + query manual | Tidak perlu ORM berat; query langsung dari Rust via plugin Tauri. |
| **Packaging** | Tauri Bundler (.exe .msi) | Bundle jadi installer Windows native; NSIS/MSI. |

## 2. Library Kunci

### Akses SQLite dari Rust
- **rusqlite** — binding SQLite untuk Rust, digunakan di sisi Tauri backend.
- **tauri-plugin-sql** — bridge antara frontend JS dan rusqlite; memungkinkan query dari React langsung.

### Komunikasi Printer ESC/POS
- **escpos-rs** (crate Rust) — library ESC/POS untuk cetak struk thermal via USB/serial.
- Atau **escpos-ffi** jika perlu akses low-level.

### Penanganan Input Barcode Scanner
- Barcode scanner USB HID berperilaku sebagai keyboard (tidak perlu library khusus).
- **Event listener `keydown` di React** + buffer dengan timeout pendek (50-100ms) untuk mengakumulasi karakter hingga enter diterima, lalu trigger pencarian produk.
- Tidak diperlukan dependency tambahan; wrapper hook `useBarcodeScanner` akan diimplementasikan sendiri.

### Cash Drawer
- Dipicu melalui printer ESC/POS menggunakan command `Cut + Drawer Kick` (ESC p).
- Cukup kirim byte sequence `{0x1B, 0x70, 0x00, 0x19, 0xFA}` ke port printer.

### Lainnya
- **date-fns** — manipulasi tanggal untuk laporan.
- **react-hot-toast** — notifikasi di UI (stok menipis, transaksi sukses).
- **recharts** — grafik laporan (nice-to-have).

## 3. Strategi Backup

### Format File Backup
- **SQLite plain file** (.db) — backup langsung copy file database.
- **SQL dump** (.sql) — export via `.backup` atau perintah SQL `VACUUM INTO`.
- File backup diberi timestamp: `posgrosir_backup_YYYYMMDD_HHmmss.db`.

### Lokasi Backup
- **Manual**: tombol backup di halaman pengaturan -> simpan ke folder pilihan.
- **Terjadwal**: cron-like scheduler di dalam Rust (interval harian/mingguan) yang:
  1. Copy file `.db` ke folder `backups/` di lokal.
  2. Opsional: jika ada konfigurasi cloud storage (S3/Google Drive), copy juga ke sana via REST API — **best-effort, bukan syarat**.

### Restore
- Upload file `.db` ke aplikasi -> ganti database aktif -> restart koneksi.
- Validasi: aplikasi akan mengecek `PRAGMA schema_version` sebelum restore.

## 4. Strategi Migrasi Skema Database

### Versioning
- Setiap perubahan skema akan dinaikkan nomor versinya:
  `PRAGMA user_version = <N>` disimpan di database.
- Di root project: `src-tauri/migrations/` berisi file SQL:
  ```
  migrations/
    001_initial.sql
    002_add_promotions_table.sql
    003_add_customer_field.sql
  ```

### Proses Migrasi (di Rust backend)
1. Saat aplikasi start, baca `PRAGMA user_version`.
2. Jalankan file migrasi dari `user_version + 1` hingga terbaru secara berurutan.
3. Setiap file SQL dibungkus dalam transaksi: `BEGIN; ... COMMIT;`.
4. Jika migrasi gagal, rollback dan aplikasi tidak akan start (tampilkan pesan error).
5. Update `PRAGMA user_version` setelah setiap migrasi sukses.

### Aturan
- Migrasi hanya boleh **CREATE TABLE**, **ALTER TABLE ADD COLUMN**, atau **CREATE INDEX**.
- Tidak boleh menghapus/mengubah kolom yang sudah ada di versi sebelumnya (kecuali migrasi data eksplisit).
- Setiap migrasi harus **reversible** jika memungkinkan (file rollback opsional).
