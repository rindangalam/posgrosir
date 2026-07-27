use crate::db::connection::Database;
use crate::models::product::{Category, Product, ProductWithStock};
use serde::Deserialize;
use tauri::State;
use rusqlite::params;

// ── Product CRUD ──

#[derive(Debug, Deserialize)]
pub struct CreateProductInput {
    pub plu_code: String,
    pub barcode: Option<String>,
    pub name: String,
    pub description: String,
    pub category_id: Option<i64>,
    pub base_unit: String,
    pub purchase_price: i64,
    pub selling_price: i64,
    pub stock_threshold: i64,
}

fn row_to_product(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    Ok(Product {
        id: row.get(0)?,
        plu_code: row.get(1)?,
        barcode: row.get(2)?,
        name: row.get(3)?,
        description: row.get(4)?,
        category_id: row.get(5)?,
        base_unit: row.get(6)?,
        purchase_price: row.get(7)?,
        selling_price: row.get(8)?,
        stock_threshold: row.get(9)?,
        is_active: row.get::<_, i64>(10)? != 0,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

#[tauri::command]
pub fn list_products(
    search: Option<String>,
    category_id: Option<i64>,
    page: Option<i64>,
    limit: Option<i64>,
    state: State<'_, Database>,
) -> Result<Vec<ProductWithStock>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let page = page.unwrap_or(1).max(1);
    let limit = limit.unwrap_or(50).max(1).min(200);
    let offset = (page - 1) * limit;

    let base_sql = String::from(
        "SELECT p.id, p.plu_code, p.barcode, p.name, p.description,
                p.category_id, p.base_unit, p.purchase_price,
                p.selling_price, p.stock_threshold, p.is_active,
                p.created_at, p.updated_at,
                COALESCE(SUM(sb.quantity), 0) as total_stock
         FROM products p
         LEFT JOIN stock_batches sb ON sb.product_id = p.id AND sb.is_deleted = 0
         WHERE p.is_active = 1"
    );

    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(cat_id) = category_id {
        conditions.push(format!("p.category_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(cat_id));
    }

    if let Some(ref s) = search {
        if !s.is_empty() {
            let idx = param_values.len() + 1;
            conditions.push(format!("(p.barcode = ?{idx} OR p.plu_code = ?{idx} OR p.name LIKE ?{idx2})", idx = idx, idx2 = idx + 1));
            param_values.push(Box::new(s.clone()));
            param_values.push(Box::new(format!("%{}%", s)));
        }
    }

    let mut sql = base_sql;
    if !conditions.is_empty() {
        sql.push_str(" AND ");
        sql.push_str(&conditions.join(" AND "));
    }
    sql.push_str(" GROUP BY p.id ORDER BY p.name LIMIT ?1 OFFSET ?2");

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Query error: {}", e))?;

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let results = stmt
        .query_map(rusqlite::params_from_iter(std::iter::once(&limit as &dyn rusqlite::types::ToSql).chain(std::iter::once(&offset as &dyn rusqlite::types::ToSql)).chain(params_refs)), |row| {
            Ok(ProductWithStock {
                product: row_to_product(row)?,
                total_stock: row.get::<_, i64>(13)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

#[tauri::command]
pub fn get_product(id: i64, state: State<'_, Database>) -> Result<ProductWithStock, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.plu_code, p.barcode, p.name, p.description,
                    p.category_id, p.base_unit, p.purchase_price,
                    p.selling_price, p.stock_threshold, p.is_active,
                    p.created_at, p.updated_at,
                    COALESCE(SUM(sb.quantity), 0) as total_stock
             FROM products p
             LEFT JOIN stock_batches sb ON sb.product_id = p.id AND sb.is_deleted = 0
             WHERE p.id = ?1
             GROUP BY p.id",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    stmt.query_row(params![id], |row| {
        Ok(ProductWithStock {
            product: row_to_product(row)?,
            total_stock: row.get::<_, i64>(13)?,
        })
    })
    .map_err(|e| format!("Product not found: {}", e))
}

#[tauri::command]
pub fn create_product(
    input: CreateProductInput,
    state: State<'_, Database>,
) -> Result<Product, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    if input.plu_code.trim().is_empty() {
        return Err("PLU code tidak boleh kosong".to_string());
    }
    if input.name.trim().is_empty() {
        return Err("Nama produk tidak boleh kosong".to_string());
    }
    if input.selling_price <= 0 {
        return Err("Harga jual harus lebih dari 0".to_string());
    }

    let barcode = input.barcode.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO products (plu_code, barcode, name, description, category_id, base_unit, purchase_price, selling_price, stock_threshold)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            input.plu_code.trim(),
            barcode,
            input.name.trim(),
            input.description.trim(),
            input.category_id,
            input.base_unit.trim(),
            input.purchase_price,
            input.selling_price,
            input.stock_threshold,
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    let id = conn.last_insert_rowid();
    let now: String = conn
        .query_row("SELECT datetime('now','localtime')", [], |row| row.get(0))
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(Product {
        id,
        plu_code: input.plu_code.trim().to_string(),
        barcode: barcode.map(String::from),
        name: input.name.trim().to_string(),
        description: input.description.trim().to_string(),
        category_id: input.category_id,
        base_unit: input.base_unit.trim().to_string(),
        purchase_price: input.purchase_price,
        selling_price: input.selling_price,
        stock_threshold: input.stock_threshold,
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_product(
    id: i64,
    plu_code: Option<String>,
    barcode: Option<String>,
    name: Option<String>,
    description: Option<String>,
    category_id: Option<i64>,
    base_unit: Option<String>,
    purchase_price: Option<i64>,
    selling_price: Option<i64>,
    stock_threshold: Option<i64>,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT plu_code, barcode, name, description, category_id, base_unit, purchase_price, selling_price, stock_threshold FROM products WHERE id = ?1")
        .map_err(|e| format!("Query error: {}", e))?;

    let (old_plu, old_barcode, old_name, old_desc, old_cat_id, old_unit, old_purchase, old_sell, old_thresh) = stmt
        .query_row(params![id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<i64>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
            ))
        })
        .map_err(|e| format!("Product not found: {}", e))?;

    let new_plu = plu_code.unwrap_or(old_plu);
    if new_plu.trim().is_empty() {
        return Err("PLU code tidak boleh kosong".to_string());
    }
    let new_barcode = match barcode {
        Some(ref b) if b.trim().is_empty() => None,
        Some(b) => Some(b.trim().to_string()),
        None => old_barcode,
    };
    let new_name = name.unwrap_or(old_name);
    if new_name.trim().is_empty() {
        return Err("Nama produk tidak boleh kosong".to_string());
    }
    let new_desc = description.unwrap_or(old_desc);
    let new_cat_id = category_id.or(old_cat_id);
    let new_unit = base_unit.unwrap_or(old_unit);
    let new_purchase = purchase_price.unwrap_or(old_purchase);
    let new_sell = selling_price.unwrap_or(old_sell);
    if new_sell <= 0 {
        return Err("Harga jual harus lebih dari 0".to_string());
    }
    let new_thresh = stock_threshold.unwrap_or(old_thresh);

    conn.execute(
        "UPDATE products SET plu_code=?1, barcode=?2, name=?3, description=?4, category_id=?5, base_unit=?6, purchase_price=?7, selling_price=?8, stock_threshold=?9, updated_at=datetime('now','localtime') WHERE id=?10",
        params![new_plu.trim(), new_barcode, new_name.trim(), new_desc.trim(), new_cat_id, new_unit.trim(), new_purchase, new_sell, new_thresh, id],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_product(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE products SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Delete error: {}", e))?;
    Ok(())
}

// ── Category CRUD ──

#[tauri::command]
pub fn list_categories(state: State<'_, Database>) -> Result<Vec<Category>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, name, description, parent_id, created_at, updated_at FROM categories ORDER BY name")
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                parent_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

// ── Import XLSX ──

#[derive(Debug, serde::Serialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
    pub products: Vec<String>,
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut lookup = [255u8; 256];
    for (i, &c) in CHARS.iter().enumerate() {
        lookup[c as usize] = i as u8;
    }
    let input = input.trim();
    let mut output = Vec::with_capacity(input.len() * 3 / 4);
    let bytes = input.as_bytes();
    let mut buf: u32 = 0;
    let mut bits = 0;
    for &b in bytes {
        if b == b'=' { break; }
        let val = lookup[b as usize];
        if val == 255 { continue; }
        buf = (buf << 6) | val as u32;
        bits += 6;
        if bits >= 24 {
            output.push((buf >> 16) as u8);
            output.push((buf >> 8) as u8);
            output.push(buf as u8);
            buf = 0; bits = 0;
        }
    }
    if bits == 12 { buf >>= 4; output.push(buf as u8); }
    else if bits == 18 { buf >>= 2; output.push((buf >> 8) as u8); output.push(buf as u8); }
    Ok(output)
}

#[tauri::command]
pub fn import_products_xlsx(
    base64_content: String,
    state: State<'_, Database>,
) -> Result<ImportResult, String> {
    use calamine::Reader;
    let bytes = decode_base64(&base64_content)?;
    let tmp_dir = std::env::temp_dir();
    let tmp_path = tmp_dir.join("posgrosir_import.xlsx");
    std::fs::write(&tmp_path, &bytes).map_err(|e| format!("Gagal tulis temp file: {}", e))?;
    let mut workbook: calamine::Xlsx<_> = calamine::open_workbook(&tmp_path)                                                                   
        .map_err(|e| format!("Gagal buka file XLSX: {}", e))?;
    let _ = std::fs::remove_file(&tmp_path);
    let sheet_name = workbook.sheet_names().first().cloned()
        .ok_or("File XLSX tidak memiliki sheet")?;
    let range = workbook.worksheet_range(&sheet_name)
        .map_err(|e| format!("Gagal baca sheet: {}", e))?;

    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut result = ImportResult { imported: 0, skipped: 0, errors: Vec::new(), products: Vec::new() };

    for (i, row) in range.rows().enumerate() {
        if i == 0 { continue; }
        let row_num = i + 1;
        let get = |col: usize| -> String {
            row.get(col).map(|c| match c {
                calamine::Data::String(s) => s.trim().to_string(),
                calamine::Data::Float(f) => f.to_string(),
                calamine::Data::Int(i) => i.to_string(),
                calamine::Data::DateTimeIso(s) => s.trim().to_string(),
                _ => String::new(),
            }).unwrap_or_default()
        };
        let plu = get(0);
        let name = get(2);
        if plu.is_empty() || name.is_empty() {
            result.skipped += 1;
            result.errors.push(format!("Baris {}: PLU atau nama kosong", row_num));
            continue;
        }
        let sell = get(6).parse::<i64>().unwrap_or(0);
        if sell <= 0 {
            result.skipped += 1;
            result.errors.push(format!("Baris {}: Harga jual harus > 0", row_num));
            continue;
        }
        let category = get(3);
        let category_id: Option<i64> = if !category.is_empty() {
            let cid = conn.query_row(
                "SELECT id FROM categories WHERE name = ?1",
                rusqlite::params![category.trim()],
                |row| row.get::<_, i64>(0),
            ).unwrap_or_else(|_| {
                conn.execute("INSERT INTO categories (name, description) VALUES (?1, '')", rusqlite::params![category.trim()]).ok();
                conn.last_insert_rowid()
            });
            Some(cid)
        } else { None };
        let barcode = if get(1).is_empty() { None } else { Some(get(1).trim().to_string()) };
        let base_unit = if get(4).is_empty() { "pcs".to_string() } else { get(4).trim().to_string() };
        let purchase = get(5).parse::<i64>().unwrap_or(0);
        let thresh = get(7).parse::<i64>().unwrap_or(0);

        match conn.execute(
            "INSERT INTO products (plu_code, barcode, name, description, category_id, base_unit, purchase_price, selling_price, stock_threshold)
             VALUES (?1, ?2, ?3, '', ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![plu.trim(), barcode, name.trim(), category_id, base_unit, purchase, sell, thresh],
        ) {
            Ok(_) => { result.imported += 1; result.products.push(name.trim().to_string()); }
            Err(e) => { result.skipped += 1; result.errors.push(format!("Baris {}: {}", row_num, e)); }
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn download_product_template() -> Result<Vec<u8>, String> {
    use rust_xlsxwriter::*;
    let mut workbook = Workbook::new();
    let sheet = workbook.add_worksheet();

    let header_fmt = Format::new()
        .set_bold()
        .set_background_color(Color::RGB(0x059669))
        .set_font_color(Color::White)
        .set_border(FormatBorder::Thin);

    let headers = ["PLU Code", "Barcode", "Nama Produk", "Kategori", "Satuan", "Harga Beli", "Harga Jual", "Threshold Stok"];
    for (col, h) in headers.iter().enumerate() {
        sheet.write_string(0, col as u16, *h).map_err(|e| format!("Write header error: {}", e))?;
        sheet.write_string_with_format(0, col as u16, *h, &header_fmt).ok();
    }

    let widths = [12u16, 18, 30, 20, 8, 12, 12, 14];
    for (col, w) in widths.iter().enumerate() { sheet.set_column_width(col as u16, *w).ok(); }
    sheet.set_freeze_panes(1, 0).ok();
    sheet.autofilter(0, 0, 0, 7).ok();

    let example_fmt = Format::new().set_font_color(Color::RGB(0x6B7280)).set_italic();
    sheet.write_string_with_format(1, 0, "BRG001", &example_fmt).ok();
    sheet.write_string_with_format(1, 1, "8991234567890", &example_fmt).ok();
    sheet.write_string_with_format(1, 2, "Contoh Produk", &example_fmt).ok();
    sheet.write_string_with_format(1, 3, "Contoh Kategori", &example_fmt).ok();
    sheet.write_string_with_format(1, 4, "pcs", &example_fmt).ok();
    sheet.write_number_with_format(1, 5, 5000.0, &example_fmt).ok();
    sheet.write_number_with_format(1, 6, 7500.0, &example_fmt).ok();
    sheet.write_number_with_format(1, 7, 10.0, &example_fmt).ok();

    workbook.save_to_buffer().map_err(|e| format!("Gagal generate template: {}", e))
}
#[tauri::command]
pub fn create_category(
    name: String,
    description: Option<String>,
    parent_id: Option<i64>,
    state: State<'_, Database>,
) -> Result<Category, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    if name.trim().is_empty() { return Err("Nama kategori tidak boleh kosong".to_string()); }

    conn.execute(
        "INSERT INTO categories (name, description, parent_id) VALUES (?1, ?2, ?3)",
        params![name.trim(), description.as_deref().unwrap_or("").trim(), parent_id],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    let id = conn.last_insert_rowid();
    let now: String = conn.query_row("SELECT datetime('now','localtime')", [], |row| row.get(0))
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(Category {
        id,
        name: name.trim().to_string(),
        description: description.unwrap_or_default().trim().to_string(),
        parent_id,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_category(
    id: i64,
    name: String,
    description: Option<String>,
    parent_id: Option<Option<i64>>,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    if name.trim().is_empty() { return Err("Nama kategori tidak boleh kosong".to_string()); }

    let desc = description.as_deref().unwrap_or("").trim().to_string();
    let pid = match parent_id {
        Some(Some(pid)) => Some(pid),
        Some(None) => None,
        None => {
            conn.query_row("SELECT parent_id FROM categories WHERE id=?1", params![id], |row| row.get(0))
                .unwrap_or(None)
        }
    };

    conn.execute(
        "UPDATE categories SET name=?1, description=?2, parent_id=?3, updated_at=datetime('now','localtime') WHERE id=?4",
        params![name.trim(), desc, pid, id],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_category(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("UPDATE products SET category_id = NULL, updated_at = datetime('now','localtime') WHERE category_id = ?1", params![id])
        .map_err(|e| format!("Update error: {}", e))?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(|e| format!("Delete error: {}", e))?;
    Ok(())
}

// ── Unit Conversions ──

#[derive(Debug, Deserialize)]
pub struct ConversionInput {
    pub from_unit: String,
    pub to_unit: String,
    pub factor: f64,
    pub is_default: bool,
}

#[tauri::command]
pub fn set_unit_conversions(
    product_id: i64,
    conversions: Vec<ConversionInput>,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    conn.execute("DELETE FROM unit_conversions WHERE product_id = ?1", params![product_id])
        .map_err(|e| format!("Delete error: {}", e))?;

    for conv in &conversions {
        if conv.from_unit.trim().is_empty() || conv.to_unit.trim().is_empty() {
            continue;
        }
        conn.execute(
            "INSERT INTO unit_conversions (product_id, from_unit, to_unit, factor, is_default) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![product_id, conv.from_unit.trim(), conv.to_unit.trim(), conv.factor, conv.is_default as i64],
        )
        .map_err(|e| format!("Insert conversion error: {}", e))?;
    }

    Ok(())
}

// ── Existing commands kept unchanged ──

#[tauri::command]
pub fn search_products(
    query: String,
    state: State<'_, Database>,
) -> Result<Vec<ProductWithStock>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let pattern = format!("%{}%", query);
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.plu_code, p.barcode, p.name, p.description,
                    p.category_id, p.base_unit, p.purchase_price,
                    p.selling_price, p.stock_threshold, p.is_active,
                    p.created_at, p.updated_at,
                    COALESCE(SUM(sb.quantity), 0) as total_stock
             FROM products p
             LEFT JOIN stock_batches sb ON sb.product_id = p.id AND sb.is_deleted = 0
             WHERE (p.barcode = ?1 OR p.plu_code = ?1 OR p.name LIKE ?2)
               AND p.is_active = 1
             GROUP BY p.id
             ORDER BY
                 CASE
                     WHEN p.barcode = ?1 THEN 0
                     WHEN p.plu_code = ?1 THEN 1
                     ELSE 2
                 END,
                 p.name
             LIMIT 20",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map(params![&query, &pattern], |row| {
            Ok(ProductWithStock {
                product: row_to_product(row)?,
                total_stock: row.get::<_, i64>(13)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

#[tauri::command]
pub fn get_unit_conversions(
    product_id: i64,
    state: State<'_, Database>,
) -> Result<Vec<crate::models::product::UnitConversion>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, product_id, from_unit, to_unit, factor, is_default
             FROM unit_conversions
             WHERE product_id = ?1
             ORDER BY is_default DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map(params![product_id], |row| {
            Ok(crate::models::product::UnitConversion {
                id: row.get(0)?,
                product_id: row.get(1)?,
                from_unit: row.get(2)?,
                to_unit: row.get(3)?,
                factor: row.get(4)?,
                is_default: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}
