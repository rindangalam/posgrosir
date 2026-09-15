use rusqlite::Connection;
use crate::db::connection::Database;

#[tauri::command]
pub fn seed_dummy_data(state: tauri::State<'_, Database>) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    seed_dummy_data_inner(&conn)
}

pub fn seed_dummy_data_inner(conn: &Connection) -> Result<String, String> {
    conn.execute_batch("BEGIN").map_err(|e| format!("Tx begin error: {}", e))?;

    // ── Categories ──
    let categories = vec![
        ("Sembako", "Beras, minyak, gula, tepung, dll"),
        ("Minuman", "Air mineral, teh, kopi, soft drink, dll"),
        ("Snack & Makanan Ringan", "Keripik, biskuit, permen, dll"),
        ("Perlengkapan Rumah", "Sabun cuci, pewangi, tisu, dll"),
        ("Perawatan Diri", "Shampo, sabun mandi, pasta gigi, dll"),
    ];

    let mut cat_ids: Vec<i64> = Vec::new();
    for (name, desc) in &categories {
        conn.execute(
            "INSERT OR IGNORE INTO categories (name, description) VALUES (?1, ?2)",
            rusqlite::params![name, desc],
        )
        .map_err(|e| format!("Insert category error: {}", e))?;
        let id: i64 = conn
            .last_insert_rowid();
        cat_ids.push(id);
    }

    // ── Products ──
    // (plu, barcode, name, desc, category_index, base_unit, purchase_price, selling_price, stock_threshold)
    let products = vec![
        // Sembako
        ("P001", "8997012345001", "Beras Premium 5kg", "Beras pulen kualitas terbaik", 0, "dus", 45000, 52000, 10),
        ("P002", "8997012345002", "Minyak Goreng Fortune 2L", "Minyak goreng sawit", 0, "pcs", 28000, 33000, 15),
        ("P003", "8997012345003", "Gula Pasir Gulaku 1kg", "Gula pasir kristal", 0, "pcs", 12500, 15000, 20),
        ("P004", "8997012345004", "Tepung Terigu Segitiga Biru 1kg", "Tepung serbaguna", 0, "pcs", 9500, 12000, 15),
        ("P005", "8997012345005", "Telur Ayam 1kg", "Telur ayam kampung", 0, "kg", 27000, 32000, 10),

        // Minuman
        ("M001", "8997012345006", "Aqua 600ml", "Air mineral", 1, "pcs", 3200, 4000, 50),
        ("M002", "8997012345007", "Teh Pucuk Harum 350ml", "Teh siap minum", 1, "pcs", 3500, 4500, 40),
        ("M003", "8997012345008", "Kopi Kapal Api 180g", "Kopi bubuk", 1, "pcs", 14000, 17000, 20),
        ("M004", "8997012345009", "Coca Cola 390ml", "Soft drink kaleng", 1, "pcs", 5000, 7000, 30),
        ("M005", "8997012345010", "Sprite 390ml", "Soft drink kaleng", 1, "pcs", 5000, 7000, 30),

        // Snack
        ("S001", "8997012345011", "Chitato Sapi Panggang 68g", "Keripik kentang", 2, "pcs", 8500, 11000, 25),
        ("S002", "8997012345012", "Oreo Vanila 137g", "Biskuit sandwich", 2, "pcs", 7500, 9500, 20),
        ("S003", "8997012345013", "Qtela Singkong Balado 60g", "Keripik singkong", 2, "pcs", 5500, 7500, 25),
        ("S004", "8997012345014", "Silverqueen Chunky Bar 100g", "Cokelat batangan", 2, "pcs", 14000, 18000, 15),
        ("S005", "8997012345015", "Tic Tac Mint 20.4g", "Permen", 2, "pcs", 5000, 7000, 30),

        // Perlengkapan Rumah
        ("R001", "8997012345016", "Rinso Anti Noda 1.6L", "Sabun cuci bubuk", 3, "pcs", 18000, 23000, 10),
        ("R002", "8997012345017", "Molto Parfum 800ml", "Pewangi pakaian", 3, "pcs", 15000, 19000, 10),
        ("R003", "8997012345018", "Paseo Facial Tissue 250 sheets", "Tisu wajah", 3, "pcs", 9000, 12000, 15),
        ("R004", "8997012345019", "Sunlight Lemon 755ml", "Sabun cuci piring", 3, "pcs", 9500, 12500, 15),
        ("R005", "8997012345020", "Baygon Spray 600ml", "Obat nyamuk semprot", 3, "pcs", 32000, 38000, 8),

        // Perawatan Diri
        ("D001", "8997012345021", "Pantene Shampoo 160ml", "Shampo rambut", 4, "pcs", 16000, 21000, 15),
        ("D002", "8997012345022", "Lifebuoy Sabun Mandi 100g", "Sabun batang", 4, "pcs", 3500, 5000, 30),
        ("D003", "8997012345023", "Sensodyne Pasta Gigi 75ml", "Pasta gigi sensitif", 4, "pcs", 18000, 24000, 10),
        ("D004", "8997012345024", "Rexona Deo Roll On 50ml", "Deodoran roll on", 4, "pcs", 15000, 20000, 12),
        ("D005", "8997012345025", "Nivea Body Lotion 200ml", "Lotion tubuh", 4, "pcs", 22000, 28000, 8),
    ];

    let mut product_ids: Vec<i64> = Vec::new();
    for (plu, barcode, name, desc, cat_idx, unit, purchase, selling, threshold) in &products {
        conn.execute(
            "INSERT OR IGNORE INTO products (plu_code, barcode, name, description, category_id, base_unit, purchase_price, selling_price, stock_threshold)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![plu, barcode, name, desc, cat_ids[*cat_idx], unit, purchase, selling, threshold],
        )
        .map_err(|e| format!("Insert product error: {}", e))?;
        product_ids.push(conn.last_insert_rowid());
    }

    // ── Unit Conversions ──
    // Beras: 1 dus = 5 pcs (5kg each)
    conn.execute(
        "INSERT OR IGNORE INTO unit_conversions (product_id, from_unit, to_unit, factor, is_default) VALUES (?1, 'dus', 'pcs', 5.0, 1)",
        rusqlite::params![product_ids[0]],
    ).ok();

    // ── Stock Batches ──
    // Realistic batches with various received dates and expiry dates
    let batches = vec![
        // Beras Premium 5kg
        (product_ids[0], 20, 45000, Some("2026-06-15"), "2026-08-01", "PT Beras Jaya"),
        (product_ids[0], 15, 46000, Some("2026-09-01"), "2026-08-10", "PT Beras Jaya"),
        // Minyak Goreng
        (product_ids[1], 30, 28000, Some("2026-07-20"), "2026-08-05", "PT Sawit Makmur"),
        (product_ids[1], 25, 29000, Some("2026-08-05"), "2026-08-12", "PT Sawit Makmur"),
        // Gula Pasir
        (product_ids[2], 40, 12500, Some("2026-07-10"), "2026-08-03", "PT Gula Manis"),
        // Tepung Terigu
        (product_ids[3], 25, 9500, Some("2026-07-25"), "2026-08-08", "PT Segitiga Biru"),
        // Telur
        (product_ids[4], 15, 27000, Some("2026-08-10"), "2026-08-15", "Ayam Kampung Jaya"),
        // Aqua
        (product_ids[5], 100, 3200, Some("2026-12-01"), "2026-08-10", "PT Aqua Golden"),
        (product_ids[5], 80, 3300, Some("2027-01-15"), "2026-08-12", "PT Aqua Golden"),
        // Teh Pucuk
        (product_ids[6], 60, 3500, Some("2026-10-01"), "2026-08-05", "PT Teh Pucuk"),
        // Kopi Kapal Api
        (product_ids[7], 30, 14000, Some("2026-09-15"), "2026-08-08", "PT Kapal Api"),
        // Coca Cola
        (product_ids[8], 50, 5000, Some("2026-11-01"), "2026-08-10", "Coca Cola Indonesia"),
        // Sprite
        (product_ids[9], 50, 5000, Some("2026-11-01"), "2026-08-10", "Coca Cola Indonesia"),
        // Chitato
        (product_ids[10], 40, 8500, Some("2026-09-01"), "2026-08-12", "PT Indofood"),
        // Oreo
        (product_ids[11], 35, 7500, Some("2026-10-15"), "2026-08-05", "PT Mondelez"),
        // Qtela
        (product_ids[12], 30, 5500, Some("2026-09-20"), "2026-08-10", "PT Indofood"),
        // Silverqueen
        (product_ids[13], 20, 14000, Some("2026-11-30"), "2026-08-12", "PT Carrefour"),
        // Tic Tac
        (product_ids[14], 40, 5000, Some("2027-03-01"), "2026-08-08", "PT Ferrero"),
        // Rinso
        (product_ids[15], 20, 18000, Some("2027-06-01"), "2026-08-10", "PT Unilever"),
        // Molto
        (product_ids[16], 18, 15000, Some("2027-05-01"), "2026-08-12", "PT Unilever"),
        // Paseo
        (product_ids[17], 25, 9000, Some("2027-04-01"), "2026-08-05", "PT Tirta"),
        // Sunlight
        (product_ids[18], 20, 9500, Some("2027-03-15"), "2026-08-10", "PT Unilever"),
        // Baygon
        (product_ids[19], 12, 32000, Some("2027-08-01"), "2026-08-08", "SC Johnson"),
        // Pantene
        (product_ids[20], 25, 16000, Some("2027-07-01"), "2026-08-10", "PT Procter"),
        // Lifebuoy
        (product_ids[21], 50, 3500, Some("2027-09-01"), "2026-08-12", "PT Unilever"),
        // Sensodyne
        (product_ids[22], 15, 18000, Some("2027-06-15"), "2026-08-05", "PT GSK"),
        // Rexona
        (product_ids[23], 18, 15000, Some("2027-10-01"), "2026-08-10", "PT Unilever"),
        // Nivea
        (product_ids[24], 14, 22000, Some("2027-11-01"), "2026-08-12", "PT Beiersdorf"),
    ];

    let mut batch_ids: Vec<i64> = Vec::new();
    for (pid, qty, pp, expiry, received, supplier) in &batches {
        conn.execute(
            "INSERT INTO stock_batches (product_id, quantity, purchase_price, expiry_date, received_date, batch_code, supplier)
             VALUES (?1, ?2, ?3, ?4, ?5, '', ?6)",
            rusqlite::params![pid, qty, pp, expiry, received, supplier],
        )
        .map_err(|e| format!("Insert batch error: {}", e))?;
        batch_ids.push(conn.last_insert_rowid());
    }

    // ── Transactions (7 hari terakhir) ──
    let today = chrono::Local::now();
    let mut tx_ids: Vec<i64> = Vec::new();

    // Transaction 1 — 6 hari lalu, 3 item, cash
    let d6 = (today - chrono::Duration::days(6)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260809-001', 125000, 0, 0, 125000, 'completed', ?1)",
        rusqlite::params![d6],
    ).map_err(|e| e.to_string())?;
    let t1 = conn.last_insert_rowid();
    tx_ids.push(t1);

    // Items: Beras 2 dus, Aqua 10 pcs
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'dus', 5.0, 10, 52000, 0, 104000)", rusqlite::params![t1, product_ids[0]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 10, 'pcs', 1.0, 10, 4000, 0, 21000)", rusqlite::params![t1, product_ids[5]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount) VALUES (?1, 'cash', 130000)", rusqlite::params![t1]).ok();

    // Transaction 2 — 5 hari lalu, 5 item, cash + qris
    let d5 = (today - chrono::Duration::days(5)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260810-001', 187000, 5000, 0, 182000, 'completed', ?1)",
        rusqlite::params![d5],
    ).map_err(|e| e.to_string())?;
    let t2 = conn.last_insert_rowid();
    tx_ids.push(t2);

    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 1, 'pcs', 1.0, 1, 33000, 0, 33000)", rusqlite::params![t2, product_ids[1]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 17000, 0, 34000)", rusqlite::params![t2, product_ids[7]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 10, 'pcs', 1.0, 10, 4000, 0, 40000)", rusqlite::params![t2, product_ids[5]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 5, 'pcs', 1.0, 5, 11000, 0, 55000)", rusqlite::params![t2, product_ids[10]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 3, 'pcs', 1.0, 3, 9500, 5000, 25000)", rusqlite::params![t2, product_ids[11]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount) VALUES (?1, 'cash', 100000)", rusqlite::params![t2]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount, reference) VALUES (?1, 'qris', 82000, 'QR-20260810-001')", rusqlite::params![t2]).ok();

    // Transaction 3 — 4 hari lalu, 2 item, edc
    let d4 = (today - chrono::Duration::days(4)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260811-001', 86000, 0, 0, 86000, 'completed', ?1)",
        rusqlite::params![d4],
    ).map_err(|e| e.to_string())?;
    let t3 = conn.last_insert_rowid();
    tx_ids.push(t3);

    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 23000, 0, 46000)", rusqlite::params![t3, product_ids[15]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 20000, 0, 40000)", rusqlite::params![t3, product_ids[23]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount, reference) VALUES (?1, 'edc', 86000, 'EDC-881234')", rusqlite::params![t3]).ok();

    // Transaction 4 — 3 hari lalu, 6 item, cash
    let d3 = (today - chrono::Duration::days(3)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260812-001', 245000, 10000, 0, 235000, 'completed', ?1)",
        rusqlite::params![d3],
    ).map_err(|e| e.to_string())?;
    let t4 = conn.last_insert_rowid();
    tx_ids.push(t4);

    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 3, 'dus', 5.0, 15, 52000, 0, 156000)", rusqlite::params![t4, product_ids[0]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 15000, 0, 30000)", rusqlite::params![t4, product_ids[2]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 20, 'pcs', 1.0, 20, 4000, 0, 80000)", rusqlite::params![t4, product_ids[5]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 1, 'pcs', 1.0, 1, 12000, 0, 12000)", rusqlite::params![t4, product_ids[3]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 3, 'pcs', 1.0, 3, 7500, 0, 22500)", rusqlite::params![t4, product_ids[11]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 1, 'pcs', 1.0, 1, 19000, 10000, 9000)", rusqlite::params![t4, product_ids[16]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount) VALUES (?1, 'cash', 240000)", rusqlite::params![t4]).ok();

    // Transaction 5 — 2 hari lalu, 4 item, qris
    let d2 = (today - chrono::Duration::days(2)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260813-001', 156000, 0, 0, 156000, 'completed', ?1)",
        rusqlite::params![d2],
    ).map_err(|e| e.to_string())?;
    let t5 = conn.last_insert_rowid();
    tx_ids.push(t5);

    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 1, 'pcs', 1.0, 1, 52000, 0, 52000)", rusqlite::params![t5, product_ids[0]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 5, 'pcs', 1.0, 5, 7000, 0, 35000)", rusqlite::params![t5, product_ids[8]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 18000, 0, 36000)", rusqlite::params![t5, product_ids[13]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 16500, 0, 33000)", rusqlite::params![t5, product_ids[20]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount, reference) VALUES (?1, 'qris', 156000, 'QR-20260813-001')", rusqlite::params![t5]).ok();

    // Transaction 6 — kemarin, 7 item, cash + edc
    let d1 = (today - chrono::Duration::days(1)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260814-001', 320000, 15000, 0, 305000, 'completed', ?1)",
        rusqlite::params![d1],
    ).map_err(|e| e.to_string())?;
    let t6 = conn.last_insert_rowid();
    tx_ids.push(t6);

    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 4, 'dus', 5.0, 20, 52000, 0, 208000)", rusqlite::params![t6, product_ids[0]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 3, 'pcs', 1.0, 3, 33000, 0, 99000)", rusqlite::params![t6, product_ids[1]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 15, 'pcs', 1.0, 15, 4000, 0, 60000)", rusqlite::params![t6, product_ids[5]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 2, 'pcs', 1.0, 2, 12000, 0, 24000)", rusqlite::params![t6, product_ids[17]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 1, 'pcs', 1.0, 1, 19000, 0, 19000)", rusqlite::params![t6, product_ids[16]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 3, 'pcs', 1.0, 3, 24000, 15000, 57000)", rusqlite::params![t6, product_ids[22]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 1, 'pcs', 1.0, 1, 28000, 0, 28000)", rusqlite::params![t6, product_ids[24]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount) VALUES (?1, 'cash', 200000)", rusqlite::params![t6]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount, reference) VALUES (?1, 'edc', 105000, 'EDC-885678')", rusqlite::params![t6]).ok();

    // Transaction 7 — hari ini pagi, 2 item
    let d0 = (today - chrono::Duration::hours(3)).format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO transactions (transaction_number, subtotal, discount_total, tax_total, grand_total, payment_status, created_at)
         VALUES ('TXN-20260815-001', 67000, 0, 0, 67000, 'completed', ?1)",
        rusqlite::params![d0],
    ).map_err(|e| e.to_string())?;
    let t7 = conn.last_insert_rowid();
    tx_ids.push(t7);

    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 10, 'pcs', 1.0, 10, 4500, 0, 45000)", rusqlite::params![t7, product_ids[6]]).ok();
    conn.execute("INSERT INTO transaction_items (transaction_id, product_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal) VALUES (?1, ?2, 4, 'pcs', 1.0, 4, 5500, 0, 22000)", rusqlite::params![t7, product_ids[12]]).ok();
    conn.execute("INSERT INTO payments (transaction_id, method, amount) VALUES (?1, 'cash', 70000)", rusqlite::params![t7]).ok();

    // ── Promotions ──
    let start = (today - chrono::Duration::days(3)).format("%Y-%m-%d").to_string();
    let end = (today + chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
    let start2 = (today - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
    let end2 = (today + chrono::Duration::days(14)).format("%Y-%m-%d").to_string();

    conn.execute(
        "INSERT INTO promotions (name, type, value, scope, scope_id, start_date, end_date, is_active)
         VALUES ('Promo Minuman Diskon 10%', 'percentage', 10.0, 'category', ?1, ?2, ?3, 1)",
        rusqlite::params![cat_ids[1], start, end],
    ).ok();

    conn.execute(
        "INSERT INTO promotions (name, type, value, scope, scope_id, start_date, end_date, is_active)
         VALUES ('Chitato Hemat Rp2.000', 'nominal', 2000.0, 'product', ?1, ?2, ?3, 1)",
        rusqlite::params![product_ids[10], start2, end2],
    ).ok();

    // ── Daily summaries ──
    for i in 0..7u32 {
        let date = (today - chrono::Duration::days(i as i64)).format("%Y-%m-%d").to_string();
        let (total_tx, gross, disc, cash, qris, edc) = match i {
            0 => (1, 67000, 0, 70000, 0, 0),
            1 => (1, 320000, 15000, 200000, 0, 105000),
            2 => (1, 156000, 0, 0, 156000, 0),
            3 => (1, 245000, 10000, 240000, 0, 0),
            4 => (1, 86000, 0, 0, 0, 86000),
            5 => (1, 187000, 5000, 100000, 82000, 0),
            _ => (1, 125000, 0, 130000, 0, 0),
        };
        let net = gross - disc;
        conn.execute(
            "INSERT OR IGNORE INTO daily_summary (date, total_transactions, gross_sales, total_discounts, net_sales, total_cash, total_qris, total_edc)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![date, total_tx, gross, disc, net, cash, qris, edc],
        ).ok();
    }

    conn.execute_batch("COMMIT").map_err(|e| format!("Tx commit error: {}", e))?;

    Ok("Dummy data seeded: 5 kategori, 25 produk, 28 batch stok, 7 transaksi, 2 promo, 7 ringkasan harian".to_string())
}
