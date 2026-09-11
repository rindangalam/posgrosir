use crate::db::connection::Database;
use crate::models::stock::StockBatch;
use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::params;

#[derive(Debug, Deserialize)]
pub struct CreateBatchInput {
    pub quantity: i64,
    pub purchase_price: i64,
    pub expiry_date: Option<String>,
    pub batch_code: String,
    pub supplier: String,
}

#[tauri::command]
pub fn list_batches(
    product_id: i64,
    state: State<'_, Database>,
) -> Result<Vec<StockBatch>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, product_id, quantity, purchase_price, expiry_date,
                    received_date, batch_code, supplier, is_deleted,
                    created_at, updated_at
             FROM stock_batches
             WHERE product_id = ?1 AND is_deleted = 0
             ORDER BY expiry_date ASC, received_date ASC, id ASC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map(params![product_id], |row| {
            Ok(StockBatch {
                id: row.get(0)?,
                product_id: row.get(1)?,
                quantity: row.get(2)?,
                purchase_price: row.get(3)?,
                expiry_date: row.get(4)?,
                received_date: row.get(5)?,
                batch_code: row.get(6)?,
                supplier: row.get(7)?,
                is_deleted: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

#[tauri::command]
pub fn create_batch(
    product_id: i64,
    input: CreateBatchInput,
    state: State<'_, Database>,
) -> Result<StockBatch, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    if input.quantity <= 0 {
        return Err("Quantity harus lebih dari 0".to_string());
    }

    conn.execute(
        "INSERT INTO stock_batches (product_id, quantity, purchase_price, expiry_date, batch_code, supplier)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            product_id,
            input.quantity,
            input.purchase_price,
            input.expiry_date,
            input.batch_code.trim(),
            input.supplier.trim(),
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    let id = conn.last_insert_rowid();
    let now: String = conn
        .query_row("SELECT datetime('now','localtime')", [], |row| row.get(0))
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(StockBatch {
        id,
        product_id,
        quantity: input.quantity,
        purchase_price: input.purchase_price,
        expiry_date: input.expiry_date,
        received_date: now.clone(),
        batch_code: input.batch_code.trim().to_string(),
        supplier: input.supplier.trim().to_string(),
        is_deleted: false,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_batch(
    id: i64,
    quantity: Option<i64>,
    purchase_price: Option<i64>,
    batch_code: Option<String>,
    supplier: Option<String>,
    expiry_date: Option<String>,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let current = conn.query_row(
        "SELECT quantity, purchase_price, batch_code, supplier, expiry_date FROM stock_batches WHERE id=?1 AND is_deleted=0",
        params![id],
        |row| Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, Option<String>>(4)?,
        )),
    ).map_err(|e| format!("Batch not found: {}", e))?;

    let (old_qty, old_price, old_code, old_supplier, old_expiry) = current;
    let qty = quantity.unwrap_or(old_qty);
    if qty < 0 { return Err("Quantity tidak boleh negatif".to_string()); }
    let price = purchase_price.unwrap_or(old_price);
    if price < 0 { return Err("Harga tidak boleh negatif".to_string()); }
    let code = batch_code.unwrap_or(old_code);
    let supp = supplier.unwrap_or(old_supplier);
    let exp = expiry_date.or(old_expiry);

    conn.execute(
        "UPDATE stock_batches SET quantity=?1, purchase_price=?2, batch_code=?3, supplier=?4, expiry_date=?5, updated_at=datetime('now','localtime') WHERE id=?6",
        params![qty, price, code.trim(), supp.trim(), exp, id],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn get_batch(id: i64, state: State<'_, Database>) -> Result<StockBatch, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.query_row(
        "SELECT id, product_id, quantity, purchase_price, expiry_date,
                received_date, batch_code, supplier, is_deleted,
                created_at, updated_at
         FROM stock_batches WHERE id = ?1",
        params![id],
        |row| {
            Ok(StockBatch {
                id: row.get(0)?,
                product_id: row.get(1)?,
                quantity: row.get(2)?,
                purchase_price: row.get(3)?,
                expiry_date: row.get(4)?,
                received_date: row.get(5)?,
                batch_code: row.get(6)?,
                supplier: row.get(7)?,
                is_deleted: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    )
    .map_err(|e| format!("Batch not found: {}", e))
}

#[tauri::command]
pub fn delete_batch(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE stock_batches SET is_deleted = 1, updated_at = datetime('now','localtime') WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Delete error: {}", e))?;
    Ok(())
}

#[derive(Debug, serde::Serialize)]
pub struct LowStockProduct {
    pub id: i64,
    pub plu_code: String,
    pub barcode: Option<String>,
    pub name: String,
    pub total_stock: i64,
    pub stock_threshold: i64,
    pub base_unit: String,
}

#[tauri::command]
pub fn get_low_stock_products(
    threshold: Option<i64>,
    state: State<'_, Database>,
) -> Result<Vec<LowStockProduct>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.plu_code, p.barcode, p.name,
                    COALESCE(SUM(sb.quantity), 0) as total_stock,
                    p.stock_threshold, p.base_unit
             FROM products p
             LEFT JOIN stock_batches sb ON sb.product_id = p.id AND sb.is_deleted = 0
             WHERE p.is_active = 1
             GROUP BY p.id
             HAVING total_stock <= COALESCE(?1, p.stock_threshold)
             ORDER BY total_stock ASC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map(params![threshold], |row| {
            Ok(LowStockProduct {
                id: row.get(0)?,
                plu_code: row.get(1)?,
                barcode: row.get(2)?,
                name: row.get(3)?,
                total_stock: row.get(4)?,
                stock_threshold: row.get(5)?,
                base_unit: row.get(6)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

// ── Stock Opname ──

#[derive(Debug, Serialize)]
pub struct OpnameProductItem {
    pub product_id: i64,
    pub product_name: String,
    pub plu_code: String,
    pub base_unit: String,
    pub system_stock: i64,
}

#[derive(Debug, Deserialize)]
pub struct OpnameSaveItem {
    pub product_id: i64,
    pub actual_quantity: i64,
    pub notes: String,
}

#[tauri::command]
pub fn get_stock_opname_data(
    category_id: Option<i64>,
    state: State<'_, Database>,
) -> Result<Vec<OpnameProductItem>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let base_sql = String::from(
        "SELECT p.id, p.name, p.plu_code, p.base_unit,
                COALESCE(SUM(sb.quantity), 0) as system_stock
         FROM products p
         LEFT JOIN stock_batches sb ON sb.product_id = p.id AND sb.is_deleted = 0
         WHERE p.is_active = 1"
    );

    let sql = if let Some(_cat_id) = category_id {
        format!("{} AND p.category_id = ?1 GROUP BY p.id ORDER BY p.name", base_sql)
    } else {
        format!("{} GROUP BY p.id ORDER BY p.name", base_sql)
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Query error: {}", e))?;

    let results = if let Some(cat_id) = category_id {
        stmt.query_map(params![cat_id], |row| {
            Ok(OpnameProductItem {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                plu_code: row.get(2)?,
                base_unit: row.get(3)?,
                system_stock: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect()
    } else {
        stmt.query_map([], |row| {
            Ok(OpnameProductItem {
                product_id: row.get(0)?,
                product_name: row.get(1)?,
                plu_code: row.get(2)?,
                base_unit: row.get(3)?,
                system_stock: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect()
    };

    Ok(results)
}

#[tauri::command]
pub fn save_stock_opname(
    items: Vec<OpnameSaveItem>,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    conn.execute_batch("BEGIN").map_err(|e| format!("Transaction error: {}", e))?;

    let result = (|| -> Result<(), String> {
        for item in &items {
            let system_stock: i64 = conn
                .query_row(
                    "SELECT COALESCE(SUM(sb.quantity), 0) FROM stock_batches sb
                     WHERE sb.product_id = ?1 AND sb.is_deleted = 0",
                    params![item.product_id],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            let diff = item.actual_quantity - system_stock;

            let batch_id: Option<i64> = conn
                .query_row(
                    "SELECT id FROM stock_batches WHERE product_id = ?1 AND is_deleted = 0 ORDER BY received_date DESC LIMIT 1",
                    params![item.product_id],
                    |row| row.get(0),
                )
                .ok();

            let batch_id = if let Some(bid) = batch_id {
                conn.execute(
                    "UPDATE stock_batches SET quantity = ?1, updated_at = datetime('now','localtime') WHERE id = ?2",
                    params![item.actual_quantity, bid],
                )
                .map_err(|e| format!("Update batch error: {}", e))?;
                bid
            } else {
                conn.execute(
                    "INSERT INTO stock_batches (product_id, quantity, purchase_price, batch_code, supplier)
                     VALUES (?1, ?2, 0, 'opname', 'opname')",
                    params![item.product_id, item.actual_quantity],
                )
                .map_err(|e| format!("Insert batch error: {}", e))?;
                conn.last_insert_rowid()
            };

            conn.execute(
                "INSERT INTO stock_opname (product_id, batch_id, system_quantity, actual_quantity, difference, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![item.product_id, batch_id, system_stock, item.actual_quantity, diff, item.notes.trim()],
            )
            .map_err(|e| format!("Insert opname error: {}", e))?;
        }
        Ok(())
    })();

    match result {
        Ok(r) => { conn.execute_batch("COMMIT").map_err(|e| format!("Commit error: {}", e))?; Ok(r) }
        Err(e) => { conn.execute_batch("ROLLBACK").map_err(|_| "Rollback failed".to_string())?; Err(e) }
    }
}

#[derive(Debug, serde::Serialize)]
pub struct StockOpnameRecord {
    pub id: i64,
    pub product_id: i64,
    pub product_name: String,
    pub plu_code: String,
    pub system_quantity: i64,
    pub actual_quantity: i64,
    pub difference: i64,
    pub notes: String,
    pub created_at: String,
}

#[tauri::command]
pub fn list_stock_opname(
    limit: Option<i64>,
    state: State<'_, Database>,
) -> Result<Vec<StockOpnameRecord>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let lim = limit.unwrap_or(50);
    let mut stmt = conn
        .prepare(
            "SELECT so.id, so.product_id, p.name, p.plu_code,
                    so.system_quantity, so.actual_quantity, so.difference,
                    so.notes, so.created_at
             FROM stock_opname so
             JOIN products p ON p.id = so.product_id
             ORDER BY so.created_at DESC
             LIMIT ?1",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map(params![lim], |row| {
            Ok(StockOpnameRecord {
                id: row.get(0)?,
                product_id: row.get(1)?,
                product_name: row.get(2)?,
                plu_code: row.get(3)?,
                system_quantity: row.get(4)?,
                actual_quantity: row.get(5)?,
                difference: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}
