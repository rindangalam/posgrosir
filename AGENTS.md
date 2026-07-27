# AGENTS.md — POS Grosir

## Struktur Folder Project

```
posgrosir/
├── docs/                       # Dokumen perencanaan
│   ├── PRD.md                  # Product Requirements Document
│   ├── techstack.md            # Tech stack & library
│   ├── ERD.md                  # Entity Relationship Diagram
│   ├── appflow.md              # Alur aplikasi & daftar layar
│   ├── workflow.md             # Rencana pengembangan per fase
│   └── sprints.md              # Breakdown 12 sprint, task teknis per sprint
├── src/                        # Frontend React
│   ├── components/             # Komponen UI reusable
│   │   ├── layout/             # Sidebar, TopNav, Shell
│   │   ├── cashier/            # Komponen layar kasir
│   │   ├── products/           # Komponen CRUD produk
│   │   ├── stocks/             # Komponen manajemen stok
│   │   ├── reports/            # Komponen laporan
│   │   └── ui/                 # Komponen umum (Button, Input, Modal, dll)
│   ├── hooks/                  # Custom React hooks
│   │   ├── useBarcodeScanner.ts
│   │   ├── usePrinter.ts
│   │   └── useDatabase.ts
│   ├── stores/                 # Zustand stores
│   │   ├── cartStore.ts
│   │   └── uiStore.ts
│   ├── pages/                  # Halaman sesuai route
│   │   ├── Login.tsx
│   │   ├── Cashier.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── ProductForm.tsx
│   │   ├── Stocks.tsx
│   │   ├── StockBatchForm.tsx
│   │   ├── StockOpname.tsx
│   │   ├── Promotions.tsx
│   │   ├── DailyReport.tsx
│   │   ├── TransactionHistory.tsx
│   │   ├── TransactionDetail.tsx
│   │   ├── Settings.tsx
│   │   └── BackupRestore.tsx
│   ├── lib/                    # Utilities & helpers
│   │   ├── currency.ts         # Format rupiah
│   │   ├── date.ts             # Format tanggal
│   │   └── receipt.ts          # Format struk
│   ├── types/                  # TypeScript type definitions
│   │   └── database.ts
│   ├── App.tsx                 # Root component + Router
│   └── main.tsx                # Entry point
├── src-tauri/                  # Backend Rust (Tauri)
│   ├── src/
│   │   ├── main.rs             # Entry point Tauri
│   │   ├── lib.rs              # Module exports
│   │   ├── db/                 # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs   # Koneksi SQLite
│   │   │   └── migrations.rs   # Migration runner
│   │   ├── commands/           # Tauri commands (#[tauri::command])
│   │   │   ├── mod.rs
│   │   │   ├── products.rs
│   │   │   ├── transactions.rs
│   │   │   ├── stocks.rs
│   │   │   ├── reports.rs
│   │   │   └── backup.rs
│   │   ├── models/             # Struct Rust untuk query
│   │   │   ├── mod.rs
│   │   │   ├── product.rs
│   │   │   ├── transaction.rs
│   │   │   └── stock.rs
│   │   ├── fifo.rs             # Alokasi & pengurangan stok FIFO
│   │   ├── printer.rs          # ESC/POS printer & cash drawer
│   │   └── backup.rs           # Backup & restore database
│   ├── migrations/             # File SQL migrasi skema
│   │   └── 001_initial.sql
│   └── Cargo.toml
├── public/                     # Aset statis
│   └── icon.png
├── AGENTS.md                   # File ini
├── progress.md                 # Tracking progres sprint
├── package.json
└── tailwind.config.js
```

## Konvensi Penamaan & Coding Style

### Frontend (TypeScript/React)
- **File**: camelCase untuk hooks (`useBarcodeScanner.ts`), PascalCase untuk komponen (`Cashier.tsx`), komponen di `components/` sesuai fitur.
- **Fungsi & variabel**: camelCase (`getTotalPrice`, `cartItems`).
- **Tipe/interface**: PascalCase dengan prefix `I` opsional (`IProduct`, `ICartItem`).
- **Styled components**: Tailwind utility classes di JSX, bukan CSS-in-JS atau file CSS terpisah.
- **State management**: Zustand store per domain (`cartStore`, `productStore`, `uiStore`).
- **Routing**: file per halaman di `pages/`, path sesuai nama file.

### Backend (Rust)
- **File**: snake_case (`fifo.rs`, `migrations.rs`).
- **Fungsi**: snake_case (`allocate_stock`, `create_transaction`).
- **Struct**: PascalCase (`Product`, `StockBatch`).
- **Enum**: PascalCase (`PaymentMethod`, `PromotionScope`).
- **Error handling**: custom error enum dengan `thiserror`, kembalikan `Result<T, String>` untuk Tauri commands.
- **Database query**: query SQL mentah via rusqlite (bukan ORM), dibungkus dalam fungsi di modul `commands/`.

### Database
- **Nama tabel**: snake_case, jamak (`products`, `stock_batches`).
- **Nama kolom**: snake_case (`plu_code`, `transaction_number`).
- **Primary key**: `id INTEGER PRIMARY KEY AUTOINCREMENT` di semua tabel.
- **Timestamp**: `created_at TEXT DEFAULT (datetime('now','localtime'))`, `updated_at TEXT DEFAULT (datetime('now','localtime'))`.
- **Harga**: disimpan sebagai `INTEGER` dalam satuan rupiah (nominal terkecil, tanpa desimal).
- **Boolean**: disimpan sebagai `INTEGER` (0/1).

## Batasan Teknis (Tidak Boleh Dilanggar)

### Offline-First
- Sistem HARUS berfungsi 100% tanpa koneksi internet.
- Semua data inti (produk, stok, transaksi, laporan) disimpan dan diakses dari SQLite lokal.
- Internet hanya boleh digunakan untuk:
  - Backup ke cloud storage (best-effort, opsional).
  - Pembayaran QRIS dinamis (future, hanya jika user mengaktifkan).
- Tidak boleh ada dependency yang memerlukan server/API eksternal untuk menjalankan fitur inti.

### Tanpa Backend Server Terpisah
- Tidak ada server HTTP/API terpisah.
- Semua logika bisnis jalan di proses yang sama (Tauri backend Rust + frontend React).
- Komunikasi frontend-backend hanya via Tauri `invoke`.

### Database
- Hanya SQLite (via rusqlite). Tidak boleh mengganti ke PostgreSQL, MySQL, atau database server lainnya.
- Semua akses database melalui Rust backend (Tauri commands), bukan langsung dari frontend.

### Dependency
- Tidak boleh menambah dependency server/cloud sebagai bagian wajib sistem.
- Setiap dependency baru harus di-review: apakah library tersebut membutuhkan koneksi jaringan atau server eksternal untuk berfungsi? Jika ya, hanya untuk fitur nice-to-have opsional.

## Orchestrator & Agent Workflow

### Cara Kerja Orchestrator
Orchestrator adalah sesi utama opencode yang mengoordinasikan seluruh
pengerjaan proyek. Cara kerjanya:
1. **Baca konteks** — di awal setiap sesi, baca AGENTS.md + dokumen acuan
   sprint untuk memahami rencana dan batasan
2. **Breakdown task** — pecah permintaan user menjadi sub-task sesuai fase
   dan sprint di `docs/sprints.md` / `docs/workflow.md`
3. **Delegasi** — kirim sub-task ke agent spesialis via tool `task`
4. **Review & integrasi** — periksa hasil dari agent, gabungkan kode,
   pastikan tidak melanggar batasan teknis
5. **Tracking** — update `todowrite` setelah setiap sub-task selesai
6. **Verifikasi** — jalankan lint/typecheck/test sebelum lapor ke user

### Daftar Agent

| Agent | Spesialisasi |
|---|---|
| **Orchestrator** (utama) | Perencanaan, koordinasi, review kode, tracking todo, integrasi frontend-backend, komunikasi dengan user |
| **Frontend Agent** | Komponen React, halaman, hooks, Zustand stores, styling Tailwind/daisyUI |
| **Backend Agent** | Rust commands, models, database queries, FIFO engine, printer module, backup |
| **Testing Agent** | Rust unit test, manual test script, packaging build |

### Alur Hand-off

```
Task dari user
     │
     ▼
Orchestrator ──→ baca AGENTS.md + docs/ acuan sprint
     │
     ├── jika pure frontend
     │     └── delegasi ke Frontend Agent → review hasil → merge
     ├── jika pure backend
     │     └── delegasi ke Backend Agent → review hasil → merge
     ├── jika perlu testing
     │     └── delegasi ke Testing Agent → review hasil → merge
     └── jika kompleks (frontend + backend)
           └── pecah sub-task
               ├── Frontend Agent (UI)
               ├── Backend Agent (Rust command)
               └── Orchestrator integrasikan + verifikasi
     │
     ▼
Verifikasi: lint / typecheck / test
     │
     ▼
Update todowrite → lapor ke user → tunggu instruksi berikutnya
```

## Sprint Workflow

### Aturan Main Sprint
1. Sebelum mulai sprint, agent HARUS baca:
   - AGENTS.md (untuk konteks & batasan)
   - Dokumen acuan sprint (tercantum di tabel sprint)
   - Dokumen terkait lainnya jika diperlukan
2. Orchestrator buat task list via `todowrite` di awal sprint
3. Selama sprint, patuhi 3 aturan emas: offline-first, tanpa server
   terpisah, SQLite hanya via Rust
4. Akhir sprint: jalankan verifikasi (lint/typecheck/test jika ada)
5. Update status sprint di todowrite
6. Tanya user: lanjut sprint berikutnya?
7. Jika ada revisi/penyimpangan dari dokumen, tanyakan ke user dulu

### Daftar Sprint

| Sprint | Fase | Target | Dokumen Acuan |
|---|---|---|---|
| **Sprint 1.1** | Fase 1 | Init project: Tauri + React + Tailwind + Router | techstack, appflow |
| **Sprint 1.2** | Fase 1 | Skema DB + migration runner + koneksi SQLite | ERD |
| **Sprint 2.1** | Fase 2 | CartStore + UI keranjang + search produk | appflow, ERD |
| **Sprint 2.2** | Fase 2 | Checkout + multi-payment + hitung total | appflow, ERD |
| **Sprint 2.3** | Fase 2 | Promo engine + cetak struk preview | appflow, ERD |
| **Sprint 3.1** | Fase 3 | CRUD produk + kategori + konversi satuan | ERD, appflow |
| **Sprint 3.2** | Fase 3 | CRUD batch stok + FIFO engine | ERD, appflow |
| **Sprint 4.1** | Fase 4 | Laporan omzet + item terlaris + stok menipis | appflow, ERD |
| **Sprint 4.2** | Fase 4 | Stok opname + daily summary generator | appflow, ERD |
| **Sprint 5.1** | Fase 5 | Printer ESC/POS + cash drawer + final barcode | techstack, appflow |
| **Sprint 5.2** | Fase 5 | Timbangan digital (opsional) + integrasi akhir | techstack |
| **Sprint 6.1** | Fase 6 | Testing + packaging installer | PRD (kriteria sukses) |

> Detail task per sprint ada di `docs/sprints.md`.

## Rujukan Dokumen

| Dokumen | Path | Isi |
|---|---|---|
| PRD | `docs/PRD.md` | Latar belakang, target pengguna, fitur MVP vs nice-to-have, batasan, kriteria sukses |
| Tech Stack | `docs/techstack.md` | Teknologi per layer, library kunci, strategi backup & migrasi |
| ERD | `docs/ERD.md` | Diagram Mermaid, 11 tabel, penjelasan relasi & konversi satuan |
| App Flow | `docs/appflow.md` | Alur transaksi, stok, retur, tutup kasir, daftar 17 layar |
| Workflow | `docs/workflow.md` | 6 fase pengembangan dengan deliverable dan task teknis per fase |
| Sprints | `docs/sprints.md` | Breakdown 12 sprint, task teknis per sprint, dokumen acuan |
