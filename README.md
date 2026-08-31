# POS Grosir

> **Desktop Point of Sale system for wholesale retail businesses**  
> Full-featured POS application built with Tauri, React, and SQLite with advanced inventory management and FIFO costing.

[![Tauri](https://img.shields.io/badge/Tauri-2.11-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-Backend-CE412B?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

---

## 📋 Overview

**POS Grosir** is a comprehensive desktop Point of Sale system designed specifically for wholesale retail businesses. Built with Tauri for native performance, it provides complete inventory management, transaction processing, FIFO costing, promotional engine, and hardware integration (barcode scanner, thermal printer, cash drawer, digital scale).

### Key Features
- **Offline-first** - Works without internet connection
- **FIFO inventory** - First-In-First-Out batch costing
- **Hardware integration** - Barcode scanner, thermal printer, cash drawer, digital scale
- **Multi-payment** - Cash, QRIS, EDC support
- **Promotional engine** - Automatic discount calculation
- **Stock opname** - Physical stock counting and adjustment
- **Comprehensive reports** - Daily summary, top products, transaction history
- **Native performance** - Built with Rust backend for speed

---

## ✨ Features

### 💰 Point of Sale (Cashier)

#### Transaction Processing
- Barcode scanner integration with auto-add to cart
- Manual product search with keyboard shortcuts
- Multi-unit conversion (piece, pack, box, dozen)
- Real-time stock availability check
- FIFO batch allocation for cost calculation
- Low stock warnings
- Item quantity adjustment
- Cart item removal

#### Payment System
- Multi-payment method (Cash, QRIS, EDC)
- Split payment support
- Automatic change calculation
- Payment validation
- Transaction success confirmation
- Auto-print receipt (optional)

#### Receipt Printing
- ESC/POS thermal printer support
- Auto-print after transaction
- Manual reprint from transaction history
- Paper width support (58mm/80mm)
- Cash drawer kick integration
- Print queue with retry mechanism

### 📦 Inventory Management

#### Product Management (CRUD)
- Product catalog with categories
- PLU code and barcode support
- Unit conversion management
- Base unit and pricing
- Stock tracking per batch
- Product images
- Active/inactive status

#### Batch Stock Management
- Batch-level inventory tracking
- Purchase date and expiry date
- FIFO costing engine
- Low stock alerts
- Stock movement history
- Batch adjustment

#### Stock Opname
- Physical stock counting
- System vs physical comparison
- Automatic batch adjustment
- Variance reporting
- Stock correction history

### 🎉 Promotions

#### Promotional Engine
- Multiple promotion types:
  - Percentage discount
  - Fixed amount discount
  - Buy X Get Y free
  - Bundle deals
- Date range validation
- Minimum purchase requirements
- Auto-apply to cart
- Manual promotion override

#### Promotion Management
- Create/edit/delete promotions
- Active/inactive status
- Promotion scheduling
- Priority ordering

### 📊 Reports & Analytics

#### Daily Reports
- Daily sales summary
- Revenue by payment method
- Top selling products
- Transaction count
- Average transaction value

#### Transaction History
- Complete transaction list
- Transaction detail view
- Void/cancel transactions
- Reprint receipts
- Date range filtering
- CSV export

#### Stock Reports
- Low stock products
- Stock valuation (FIFO)
- Batch expiry tracking
- Stock movement history

### ⚙️ Settings & Configuration

#### Hardware Settings
- **Barcode Scanner**:
  - Scan timeout configuration
  - Manual typing detection
  - Buffer overflow protection
- **Thermal Printer**:
  - Printer selection
  - Paper width (58mm/80mm)
  - Auto-print toggle
  - Cash drawer control
  - Test print function
- **Digital Scale** (Optional):
  - Serial port selection
  - Timeout configuration
  - Weight reading test
  - CAS format support

#### System Settings
- Store information
- Receipt header/footer
- Date and time format
- Currency format
- Database backup/restore

### ⌨️ Keyboard Shortcuts
- **F1** - Focus barcode/search input
- **F2** - Proceed to payment
- **Escape** - Cancel current action
- Fast navigation throughout the app

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 7 |
| **Backend** | Rust (Tauri 2.11) |
| **Database** | SQLite 3 (embedded) |
| **State Management** | Zustand 5.0 |
| **Routing** | React Router 7 |
| **UI Framework** | Tailwind CSS 3.4, DaisyUI 4.12 |
| **Icons** | Phosphor Icons |
| **Build Tool** | Vite 8 |
| **Hardware Integration** | ESC/POS, Serial Port (RS232) |

---

## 📋 System Requirements

### Development
- **Node.js** >= 18
- **Rust** >= 1.70
- **npm** >= 9
- Windows 10/11 (primary target)

### Hardware (Optional)
- **Barcode Scanner** - USB/Serial (keyboard emulation)
- **Thermal Printer** - ESC/POS compatible (58mm/80mm)
- **Cash Drawer** - RJ11/RJ12 connected to printer
- **Digital Scale** - RS232 serial connection (CAS protocol)

---

## 🚀 Installation

### For End Users (Windows)

Download the installer from releases:
```
POS_Grosir_0.1.0_x64-setup.exe
```

Run the installer and follow the on-screen instructions.

### For Developers

#### 1. Prerequisites

```bash
# Install Node.js (https://nodejs.org/)
# Install Rust (https://rustup.rs/)
rustup update

# Install Tauri CLI (optional)
cargo install tauri-cli
```

#### 2. Clone Repository

```bash
git clone https://github.com/rindangalam/posgrosir.git
cd posgrosir
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Run Development Server

```bash
npm run dev
```

This starts the Vite dev server and Tauri in development mode.

---

## 📁 Project Structure

```
posgrosir/
├── src/                           # Frontend (React)
│   ├── components/
│   │   ├── cashier/               # Cashier components
│   │   │   ├── ProductSearch.tsx
│   │   │   ├── CartItemRow.tsx
│   │   │   └── ...
│   │   └── layout/                # Layout components
│   ├── pages/                     # Application pages
│   │   ├── Cashier.tsx            # Main POS screen
│   │   ├── CashierPayment.tsx     # Payment screen
│   │   ├── CashierSuccess.tsx     # Success screen
│   │   ├── Products.tsx           # Product management
│   │   ├── Stock.tsx              # Batch stock management
│   │   ├── StockOpname.tsx        # Stock counting
│   │   ├── Promotions.tsx         # Promotion management
│   │   ├── Reports.tsx            # Reports dashboard
│   │   └── Settings.tsx           # System settings
│   ├── stores/                    # Zustand stores
│   │   ├── cartStore.ts           # Shopping cart state
│   │   └── uiStore.ts             # UI preferences
│   ├── hooks/                     # Custom React hooks
│   │   ├── useBarcodeScanner.ts
│   │   ├── usePrinter.ts
│   │   ├── useScale.ts
│   │   └── useDatabase.ts
│   ├── lib/                       # Utilities
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   └── receipt.ts
│   └── types/                     # TypeScript types
├── src-tauri/                     # Backend (Rust)
│   ├── src/
│   │   ├── commands/              # Tauri commands (API)
│   │   │   ├── products.rs
│   │   │   ├── transactions.rs
│   │   │   ├── promotions.rs
│   │   │   ├── printer.rs
│   │   │   └── scales.rs
│   │   ├── db/                    # Database layer
│   │   │   ├── connection.rs
│   │   │   └── migrations.rs
│   │   ├── models/                # Data models
│   │   ├── fifo.rs                # FIFO inventory engine
│   │   ├── printer.rs             # ESC/POS printer
│   │   ├── scales.rs              # Digital scale
│   │   └── lib.rs                 # Main entry point
│   ├── migrations/                # SQL migrations
│   │   └── 001_initial.sql        # Initial schema (11 tables)
│   └── tests/                     # Integration tests
├── docs/
│   ├── sprints.md                 # Sprint planning
│   └── manual_test.md             # Manual testing scenarios
├── progress.md                    # Development progress log
├── package.json
├── vite.config.ts
└── tauri.conf.json                # Tauri configuration
```

---

## 🗄️ Database Schema

### 11 Core Tables

1. **products** - Product master data
2. **categories** - Product categories
3. **unit_conversions** - Multi-unit definitions
4. **stock_batches** - Batch-level inventory
5. **transactions** - Transaction headers
6. **transaction_items** - Transaction line items
7. **transaction_payments** - Payment records
8. **promotions** - Promotional rules
9. **stock_opname** - Physical stock counts
10. **stock_movements** - Stock adjustment history
11. **daily_summaries** - Daily closing reports

---

## 🔧 FIFO Engine

### How It Works

The FIFO (First-In-First-Out) engine automatically allocates inventory from the oldest batches first:

1. **Stock Allocation**: When adding items to cart, system checks available batches
2. **FIFO Priority**: Oldest batch (by purchase date) is consumed first
3. **Multi-batch Support**: If first batch insufficient, allocates from next batch
4. **Cost Tracking**: Each transaction item records actual COGS from allocated batches
5. **Stock Reduction**: On successful transaction, batch quantities reduced automatically

### Unit Tests

10 comprehensive FIFO unit tests covering:
- Single batch allocation
- Multi-batch allocation
- Insufficient stock handling
- Zero quantity edge cases
- FIFO ordering verification

---

## 🖨️ Hardware Integration

### Thermal Printer (ESC/POS)

**Supported Features:**
- Text printing with formatting (bold, underline, alignment)
- Receipt layout (header, items, totals, footer)
- Cash drawer kick command
- Paper cut
- 58mm and 80mm paper width

**Setup:**
1. Connect thermal printer via USB
2. Install printer driver
3. Open Settings > Printer
4. Select printer from dropdown
5. Test print to verify

### Barcode Scanner

**Supported Modes:**
- USB HID (keyboard emulation)
- Serial RS232

**Features:**
- Auto-detect scan vs manual typing
- Configurable scan timeout
- Buffer overflow protection (50 chars)
- Auto-add to cart on successful scan

### Digital Scale (Optional)

**Supported Protocols:**
- CAS format
- Generic weight format

**Setup:**
1. Connect scale via RS232 serial port
2. Open Settings > Scale
3. Select COM port
4. Test connection
5. Use "Timbang" button in Cashier to auto-fill weight

---

## 📊 Reports Available

### Daily Summary
- Total revenue
- Transaction count
- Average transaction
- Payment method breakdown
- Top 10 products sold
- Generated automatically on "Tutup Kasir"

### Transaction Reports
- Complete transaction history
- Filter by date range
- Transaction detail view
- Void/cancel capability
- Reprint receipts
- CSV export

### Stock Reports
- Low stock alerts
- Current stock valuation (FIFO)
- Batch expiry warnings
- Stock movement history

---

## 🧪 Testing

### Unit Tests (Rust)

```bash
cd src-tauri
cargo test
```

**10 FIFO unit tests** covering allocation logic

### Integration Tests

```bash
cd src-tauri
cargo test --test integration
```

**3 integration tests:**
- Database migration verification
- Schema column validation
- Cargo compilation check

### Manual Testing

See `docs/manual_test.md` for 10 manual testing scenarios:
1. Basic transaction flow
2. Promotional discounts
3. Product & stock management
4. Stock opname
5. Reports generation
6. Transaction void
7. Printer integration
8. Database backup
9. Keyboard shortcuts
10. Multi-payment handling

---

## 📦 Building Installer

### Windows NSIS Installer

```bash
# Build frontend
npm run build

# Build Tauri app with installer
cd src-tauri
cargo tauri build
```

Output: `src-tauri/target/release/bundle/nsis/POS_Grosir_0.1.0_x64-setup.exe`

---

## 🎯 Development Sprints

### ✅ Completed (6 Sprints, 12 Sub-sprints)

**Sprint 1** - Foundation
- 1.1: Tauri + React + Tailwind + Router ✅
- 1.2: SQLite schema + migrations ✅

**Sprint 2** - Core POS
- 2.1: Cart store + product search ✅
- 2.2: Checkout + multi-payment ✅
- 2.3: Promo engine + receipt preview ✅

**Sprint 3** - Inventory
- 3.1: CRUD products + categories ✅
- 3.2: CRUD batch stock + FIFO ✅

**Sprint 4** - Reports
- 4.1: Revenue reports + top products ✅
- 4.2: Stock opname + daily summary ✅

**Sprint 5** - Hardware
- 5.1: ESC/POS printer + cash drawer ✅
- 5.2: Digital scale + polish ✅

**Sprint 6** - Release
- 6.1: Testing + NSIS installer ✅

---

## 🔧 Development Commands

```bash
npm run dev        # Start development server (Vite + Tauri)
npm run build      # Build frontend only
npm run lint       # TypeScript type checking
npm run tauri      # Tauri CLI commands

# Tauri-specific
cd src-tauri
cargo check        # Check Rust compilation
cargo test         # Run unit tests
cargo tauri build  # Build production installer
```

---

## 📝 Configuration Files

- `tauri.conf.json` - Tauri app configuration
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS customization
- `src-tauri/Cargo.toml` - Rust dependencies

---

## 🤝 Contributing

This is a commercial project. For internal development:
1. Follow Rust and React best practices
2. Write tests for new features
3. Update documentation
4. Test on actual hardware when possible

---

## 📄 License

Proprietary - All rights reserved

---

## 👤 Author

**Rindang Alam Nur Muhammad**  
GitHub: [@rindangalam](https://github.com/rindangalam)

---

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Native desktop framework
- [React](https://react.dev/) - UI library
- [Rust](https://www.rust-lang.org/) - Backend language
- [SQLite](https://www.sqlite.org/) - Embedded database
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [DaisyUI](https://daisyui.com/) - Tailwind component library

---

## 📧 Support

For issues or feature requests:
- Open an issue on [GitHub Issues](https://github.com/rindangalam/posgrosir/issues)
- Check `docs/manual_test.md` for troubleshooting

---

*Powerful, offline-first POS system for wholesale retail businesses.*
