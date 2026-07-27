use crate::db::connection::Database;
use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::params;

#[derive(Debug, Serialize, Deserialize)]
pub struct Promotion {
    pub id: i64,
    pub name: String,
    #[serde(rename = "type")]
    pub promo_type: String,
    pub value: f64,
    pub scope: String,
    pub scope_id: Option<i64>,
    pub start_date: String,
    pub end_date: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePromotionInput {
    pub name: String,
    pub promo_type: String,
    pub value: f64,
    pub scope: String,
    pub scope_id: Option<i64>,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Serialize)]
pub struct ItemDiscount {
    pub product_id: i64,
    pub discount: i64,
    pub promo_name: String,
}

#[derive(Debug, Deserialize)]
pub struct DiscountRequestItem {
    pub product_id: i64,
    pub category_id: Option<i64>,
    pub quantity: f64,
    #[allow(dead_code)]
    pub selling_price: i64,
    pub subtotal: i64,
}

// ── Queries ──

#[tauri::command]
pub fn get_active_promotions(state: State<'_, Database>) -> Result<Vec<Promotion>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, value, scope, scope_id, start_date, end_date, is_active, created_at
             FROM promotions
             WHERE is_active = 1
               AND start_date <= date('now','localtime')
               AND end_date >= date('now','localtime')
             ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map([], |row| {
            Ok(Promotion {
                id: row.get(0)?,
                name: row.get(1)?,
                promo_type: row.get(2)?,
                value: row.get(3)?,
                scope: row.get(4)?,
                scope_id: row.get(5)?,
                start_date: row.get(6)?,
                end_date: row.get(7)?,
                is_active: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

#[tauri::command]
pub fn calculate_discounts(
    items: Vec<DiscountRequestItem>,
    state: State<'_, Database>,
) -> Result<Vec<ItemDiscount>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, value, scope, scope_id
             FROM promotions
             WHERE is_active = 1
               AND start_date <= date('now','localtime')
               AND end_date >= date('now','localtime')",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let promotions: Vec<(i64, String, String, f64, String, Option<i64>)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, Option<i64>>(5)?,
            ))
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    let mut result: Vec<ItemDiscount> = Vec::new();

    for item in &items {
        let mut best_discount: i64 = 0;
        let mut best_promo = String::new();

        for (_id, name, promo_type, value, scope, scope_id) in &promotions {
            let applies = match scope.as_str() {
                "product" => scope_id.map_or(false, |sid| sid == item.product_id),
                "category" => scope_id.map_or(false, |sid| Some(sid) == item.category_id),
                "all" => true,
                _ => false,
            };

            if !applies {
                continue;
            }

            let disc = match promo_type.as_str() {
                "percentage" => (item.subtotal as f64 * value / 100.0).round() as i64,
                "nominal" => (value.round() as i64) * item.quantity.round() as i64,
                _ => 0,
            };

            if disc > best_discount {
                best_discount = disc;
                best_promo = name.clone();
            }
        }

        result.push(ItemDiscount {
            product_id: item.product_id,
            discount: best_discount.min(item.subtotal),
            promo_name: best_promo,
        });
    }

    Ok(result)
}

// ── CRUD ──

#[tauri::command]
pub fn list_promotions(state: State<'_, Database>) -> Result<Vec<Promotion>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, type, value, scope, scope_id, start_date, end_date, is_active, created_at
             FROM promotions ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map([], |row| {
            Ok(Promotion {
                id: row.get(0)?,
                name: row.get(1)?,
                promo_type: row.get(2)?,
                value: row.get(3)?,
                scope: row.get(4)?,
                scope_id: row.get(5)?,
                start_date: row.get(6)?,
                end_date: row.get(7)?,
                is_active: row.get::<_, i64>(8)? != 0,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

#[tauri::command]
pub fn create_promotion(
    input: CreatePromotionInput,
    state: State<'_, Database>,
) -> Result<Promotion, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    if input.name.trim().is_empty() {
        return Err("Nama promo tidak boleh kosong".to_string());
    }
    if input.value <= 0.0 {
        return Err("Nilai promo harus positif".to_string());
    }
    if !["percentage", "nominal"].contains(&input.promo_type.as_str()) {
        return Err("Tipe promo harus 'percentage' atau 'nominal'".to_string());
    }
    if input.promo_type == "percentage" && input.value > 100.0 {
        return Err("Diskon persen tidak boleh lebih dari 100".to_string());
    }

    conn.execute(
        "INSERT INTO promotions (name, type, value, scope, scope_id, start_date, end_date, is_active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
        params![
            input.name.trim(),
            input.promo_type,
            input.value,
            input.scope,
            input.scope_id,
            input.start_date,
            input.end_date,
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    let id = conn.last_insert_rowid();
    let created_at: String = conn
        .query_row("SELECT datetime('now','localtime')", [], |row| row.get(0))
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(Promotion {
        id,
        name: input.name.trim().to_string(),
        promo_type: input.promo_type,
        value: input.value,
        scope: input.scope,
        scope_id: input.scope_id,
        start_date: input.start_date,
        end_date: input.end_date,
        is_active: true,
        created_at,
    })
}

#[tauri::command]
pub fn update_promotion(
    id: i64,
    input: CreatePromotionInput,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    conn.execute(
        "UPDATE promotions SET name=?1, type=?2, value=?3, scope=?4, scope_id=?5, start_date=?6, end_date=?7, updated_at=datetime('now','localtime')
         WHERE id=?8",
        params![
            input.name.trim(),
            input.promo_type,
            input.value,
            input.scope,
            input.scope_id,
            input.start_date,
            input.end_date,
            id,
        ],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn toggle_promotion(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "UPDATE promotions SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at=datetime('now','localtime') WHERE id=?1",
        params![id],
    )
    .map_err(|e| format!("Update error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_promotion(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM promotions WHERE id=?1", params![id])
        .map_err(|e| format!("Delete error: {}", e))?;
    Ok(())
}
