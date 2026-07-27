use crate::db::connection::Database;
use rusqlite::params;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct DailySummary {
    pub total_transactions: i64,
    pub gross_sales: i64,
    pub total_discounts: i64,
    pub net_sales: i64,
    pub total_cash: i64,
    pub total_qris: i64,
    pub total_edc: i64,
    pub average_per_trx: i64,
}

#[derive(Debug, Serialize)]
pub struct TopProduct {
    pub id: i64,
    pub name: String,
    pub total_qty: f64,
    pub total_revenue: i64,
}

#[derive(Debug, Serialize)]
pub struct TransactionBrief {
    pub id: i64,
    pub transaction_number: String,
    pub grand_total: i64,
    pub payment_status: String,
    pub payment_methods: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct TransactionDetailItem {
    pub product_name: String,
    pub quantity: f64,
    pub unit: String,
    pub selling_price: i64,
    pub discount: i64,
    pub subtotal: i64,
}

#[derive(Debug, Serialize)]
pub struct TransactionPayment {
    pub id: i64,
    pub method: String,
    pub amount: i64,
    pub reference: String,
}

#[derive(Debug, Serialize)]
pub struct TransactionDetail {
    pub id: i64,
    pub transaction_number: String,
    pub subtotal: i64,
    pub discount_total: i64,
    pub grand_total: i64,
    pub payment_status: String,
    pub created_at: String,
    pub items: Vec<TransactionDetailItem>,
    pub payments: Vec<TransactionPayment>,
}

// ── Daily Summary ──

#[tauri::command]
pub fn get_daily_summary(date: String, state: State<'_, Database>) -> Result<DailySummary, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let summary = conn
        .query_row(
            "SELECT
                COUNT(*) as total_trx,
                COALESCE(SUM(subtotal), 0) as gross,
                COALESCE(SUM(discount_total), 0) as disc,
                COALESCE(SUM(grand_total), 0) as net
             FROM transactions
             WHERE DATE(created_at) = ?1 AND payment_status = 'completed'",
            params![date],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let (total_trx, gross, disc, net) = summary;

    let avg = if total_trx > 0 { net / total_trx } else { 0 };

    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(SUM(p.amount), 0)
             FROM payments p
             JOIN transactions t ON t.id = p.transaction_id
             WHERE DATE(t.created_at) = ?1 AND t.payment_status = 'completed' AND p.method = ?2",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let total_cash: i64 = stmt
        .query_row(params![date, "cash"], |row| row.get(0))
        .unwrap_or(0);
    let total_qris: i64 = stmt
        .query_row(params![date, "qris"], |row| row.get(0))
        .unwrap_or(0);
    let total_edc: i64 = stmt
        .query_row(params![date, "edc"], |row| row.get(0))
        .unwrap_or(0);

    Ok(DailySummary {
        total_transactions: total_trx,
        gross_sales: gross,
        total_discounts: disc,
        net_sales: net,
        total_cash,
        total_qris,
        total_edc,
        average_per_trx: avg,
    })
}

// ── Top Products ──

#[tauri::command]
pub fn get_top_products(
    date: String,
    limit: Option<i64>,
    state: State<'_, Database>,
) -> Result<Vec<TopProduct>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let limit = limit.unwrap_or(10);
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, COALESCE(SUM(ti.quantity), 0), COALESCE(SUM(ti.subtotal), 0)
             FROM transaction_items ti
             JOIN products p ON p.id = ti.product_id
             JOIN transactions t ON t.id = ti.transaction_id
             WHERE DATE(t.created_at) = ?1 AND t.payment_status = 'completed'
             GROUP BY p.id
             ORDER BY SUM(ti.quantity) DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map(params![date, limit], |row| {
            Ok(TopProduct {
                id: row.get(0)?,
                name: row.get(1)?,
                total_qty: row.get(2)?,
                total_revenue: row.get(3)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

// ── Transaction History ──

#[tauri::command]
pub fn list_transactions(
    start_date: Option<String>,
    end_date: Option<String>,
    method: Option<String>,
    page: Option<i64>,
    limit: Option<i64>,
    state: State<'_, Database>,
) -> Result<Vec<TransactionBrief>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let page = page.unwrap_or(1).max(1);
    let limit = limit.unwrap_or(50).max(1).min(200);
    let offset = (page - 1) * limit;

    let mut conditions: Vec<String> = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref sd) = start_date {
        if !sd.is_empty() {
            conditions.push(format!("DATE(t.created_at) >= ?{}", param_values.len() + 1));
            param_values.push(Box::new(sd.clone()));
        }
    }
    if let Some(ref ed) = end_date {
        if !ed.is_empty() {
            conditions.push(format!("DATE(t.created_at) <= ?{}", param_values.len() + 1));
            param_values.push(Box::new(ed.clone()));
        }
    }
    if let Some(ref m) = method {
        if !m.is_empty() {
            conditions.push(format!("t.id IN (SELECT transaction_id FROM payments WHERE method = ?{})", param_values.len() + 1));
            param_values.push(Box::new(m.clone()));
        }
    }

    let base_sql = String::from(
        "SELECT t.id, t.transaction_number, t.grand_total, t.payment_status,
                COALESCE((SELECT GROUP_CONCAT(DISTINCT p.method) FROM payments p WHERE p.transaction_id = t.id), '') as methods,
                t.created_at
         FROM transactions t"
    );

    let sql = if conditions.is_empty() {
        format!("{} ORDER BY t.created_at DESC LIMIT ?1 OFFSET ?2", base_sql)
    } else {
        format!("{} WHERE {} ORDER BY t.created_at DESC LIMIT ?1 OFFSET ?2", base_sql, conditions.join(" AND "))
    };

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Query error: {}", e))?;

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let all_params: Vec<&dyn rusqlite::types::ToSql> = std::iter::once(&limit as &dyn rusqlite::types::ToSql)
        .chain(std::iter::once(&offset as &dyn rusqlite::types::ToSql))
        .chain(params_refs)
        .collect();

    let results = stmt
        .query_map(rusqlite::params_from_iter(all_params), |row| {
            Ok(TransactionBrief {
                id: row.get(0)?,
                transaction_number: row.get(1)?,
                grand_total: row.get(2)?,
                payment_status: row.get(3)?,
                payment_methods: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(results)
}

// ── Transaction Detail ──

#[tauri::command]
pub fn get_transaction_detail(
    id: i64,
    state: State<'_, Database>,
) -> Result<TransactionDetail, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let (subtotal, discount_total, grand_total, payment_status, created_at, trx_number) = conn
        .query_row(
            "SELECT subtotal, discount_total, grand_total, payment_status, created_at, transaction_number
             FROM transactions WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                ))
            },
        )
        .map_err(|e| format!("Transaction not found: {}", e))?;

    let mut item_stmt = conn
        .prepare(
            "SELECT COALESCE(p.name, 'Unknown'), ti.quantity, ti.unit, ti.selling_price, ti.discount, ti.subtotal
             FROM transaction_items ti
             LEFT JOIN products p ON p.id = ti.product_id
             WHERE ti.transaction_id = ?1
             ORDER BY ti.id",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let items: Vec<TransactionDetailItem> = item_stmt
        .query_map(params![id], |row| {
            Ok(TransactionDetailItem {
                product_name: row.get(0)?,
                quantity: row.get(1)?,
                unit: row.get(2)?,
                selling_price: row.get(3)?,
                discount: row.get(4)?,
                subtotal: row.get(5)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    let mut pay_stmt = conn
        .prepare(
            "SELECT id, method, amount, reference FROM payments WHERE transaction_id = ?1 ORDER BY id",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let payments: Vec<TransactionPayment> = pay_stmt
        .query_map(params![id], |row| {
            Ok(TransactionPayment {
                id: row.get(0)?,
                method: row.get(1)?,
                amount: row.get(2)?,
                reference: row.get(3)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(TransactionDetail {
        id,
        transaction_number: trx_number,
        subtotal,
        discount_total,
        grand_total,
        payment_status,
        created_at,
        items,
        payments,
    })
}

// ── Void Transaction ──

#[tauri::command]
pub fn void_transaction(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let status: String = conn
        .query_row(
            "SELECT payment_status FROM transactions WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Transaction not found: {}", e))?;

    if status != "completed" {
        return Err("Transaksi sudah void/refund".to_string());
    }

    conn.execute_batch("BEGIN").map_err(|e| format!("Transaction error: {}", e))?;

    let result = (|| -> Result<(), String> {
        let mut stmt = conn
            .prepare(
                "SELECT stock_batch_id, base_quantity FROM transaction_items WHERE transaction_id = ?1 AND stock_batch_id IS NOT NULL",
            )
            .map_err(|e| format!("Query error: {}", e))?;

        let restores: Vec<(i64, f64)> = stmt
            .query_map(params![id], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1)?))
            })
            .map_err(|e| format!("Query error: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        for (batch_id, qty) in &restores {
            let qty_i64 = qty.round() as i64;
            conn.execute(
                "UPDATE stock_batches SET quantity = quantity + ?1, is_deleted = 0, updated_at = datetime('now','localtime') WHERE id = ?2",
                params![qty_i64, batch_id],
            )
            .map_err(|e| format!("Restore stock error: {}", e))?;
        }

        conn.execute(
            "UPDATE transactions SET payment_status = 'voided', notes = 'Void: stock restored' WHERE id = ?1",
            params![id],
        )
        .map_err(|e| format!("Update error: {}", e))?;

        Ok(())
    })();

    match result {
        Ok(r) => {
            conn.execute_batch("COMMIT").map_err(|e| format!("Commit error: {}", e))?;
            Ok(r)
        }
        Err(e) => {
            conn.execute_batch("ROLLBACK").map_err(|_| "Rollback failed".to_string())?;
            Err(e)
        }
    }
}

// ── CSV Export ──

#[tauri::command]
pub fn export_report_csv(
    report_type: String,
    date: String,
    file_path: String,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let csv_content = match report_type.as_str() {
        "daily" => {
            let summary = get_daily_summary_inner(&conn, &date)?;
            format!(
                "Metric,Value\nTotal Transactions,{}\nGross Sales,{}\nTotal Discounts,{}\nNet Sales,{}\nTotal Cash,{}\nTotal QRIS,{}\nTotal EDC,{}\nAverage per Trx,{}\n",
                summary.total_transactions, summary.gross_sales, summary.total_discounts, summary.net_sales,
                summary.total_cash, summary.total_qris, summary.total_edc, summary.average_per_trx
            )
        }
        "top_products" => {
            let products = get_top_products_inner(&conn, &date, 100)?;
            let mut csv = String::from("Product ID,Name,Total Qty,Total Revenue\n");
            for p in &products {
                csv.push_str(&format!("{},{},{},{}\n", p.id, p.name, p.total_qty, p.total_revenue));
            }
            csv
        }
        _ => return Err("Unknown report type".to_string()),
    };

    std::fs::write(&file_path, csv_content)
        .map_err(|e| format!("Failed to write CSV: {}", e))?;

    Ok(())
}

fn get_daily_summary_inner(conn: &rusqlite::Connection, date: &str) -> Result<DailySummary, String> {
    let summary = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(subtotal),0), COALESCE(SUM(discount_total),0), COALESCE(SUM(grand_total),0)
             FROM transactions WHERE DATE(created_at) = ?1 AND payment_status = 'completed'",
            params![date],
            |row| Ok((row.get::<_,i64>(0)?, row.get::<_,i64>(1)?, row.get::<_,i64>(2)?, row.get::<_,i64>(3)?)),
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let (total_trx, gross, disc, net) = summary;
    let avg = if total_trx > 0 { net / total_trx } else { 0 };

    let total_cash: i64 = conn.query_row("SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE DATE(t.created_at)=?1 AND t.payment_status='completed' AND p.method='cash'", params![date], |row| row.get(0)).unwrap_or(0);
    let total_qris: i64 = conn.query_row("SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE DATE(t.created_at)=?1 AND t.payment_status='completed' AND p.method='qris'", params![date], |row| row.get(0)).unwrap_or(0);
    let total_edc: i64 = conn.query_row("SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN transactions t ON t.id=p.transaction_id WHERE DATE(t.created_at)=?1 AND t.payment_status='completed' AND p.method='edc'", params![date], |row| row.get(0)).unwrap_or(0);

    Ok(DailySummary { total_transactions: total_trx, gross_sales: gross, total_discounts: disc, net_sales: net, total_cash, total_qris, total_edc, average_per_trx: avg })
}

fn get_top_products_inner(conn: &rusqlite::Connection, date: &str, limit: i64) -> Result<Vec<TopProduct>, String> {
    let mut stmt = conn.prepare("SELECT p.id,p.name,COALESCE(SUM(ti.quantity),0),COALESCE(SUM(ti.subtotal),0) FROM transaction_items ti JOIN products p ON p.id=ti.product_id JOIN transactions t ON t.id=ti.transaction_id WHERE DATE(t.created_at)=?1 AND t.payment_status='completed' GROUP BY p.id ORDER BY SUM(ti.quantity) DESC LIMIT ?2").map_err(|e| format!("Query error: {}", e))?;
    let results = stmt.query_map(params![date, limit], |row| Ok(TopProduct { id: row.get(0)?, name: row.get(1)?, total_qty: row.get(2)?, total_revenue: row.get(3)? })).map_err(|e| format!("Query error: {}", e))?.filter_map(|r| r.ok()).collect();
    Ok(results)
}

// ── Generate Daily Summary ──

#[derive(Debug, Serialize)]
pub struct GeneratedSummary {
    pub date: String,
    pub total_transactions: i64,
    pub gross_sales: i64,
    pub total_discounts: i64,
    pub net_sales: i64,
    pub total_cash: i64,
    pub total_qris: i64,
    pub total_edc: i64,
}

#[tauri::command]
pub fn generate_daily_summary(date: String, state: State<'_, Database>) -> Result<GeneratedSummary, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let summary = get_daily_summary_inner(&conn, &date)?;

    conn.execute(
        "INSERT OR REPLACE INTO daily_summary (date, total_transactions, gross_sales, total_discounts, net_sales, total_cash, total_qris, total_edc)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            date,
            summary.total_transactions,
            summary.gross_sales,
            summary.total_discounts,
            summary.net_sales,
            summary.total_cash,
            summary.total_qris,
            summary.total_edc,
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    Ok(GeneratedSummary {
        date: date.clone(),
        total_transactions: summary.total_transactions,
        gross_sales: summary.gross_sales,
        total_discounts: summary.total_discounts,
        net_sales: summary.net_sales,
        total_cash: summary.total_cash,
        total_qris: summary.total_qris,
        total_edc: summary.total_edc,
    })
}

// ── Refund Transaction (mark refunded, no stock restore) ──

#[tauri::command]
pub fn refund_transaction(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let status: String = conn
        .query_row("SELECT payment_status FROM transactions WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|e| format!("Transaction not found: {}", e))?;

    if status != "completed" {
        return Err("Transaksi sudah void/refund".to_string());
    }

    conn.execute(
        "UPDATE transactions SET payment_status = 'refunded', notes = 'Refund' WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

// ── Dashboard Stats ──

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub today_omzet: i64,
    pub today_transactions: i64,
    pub total_products: i64,
    pub low_stock_count: i64,
}

#[tauri::command]
pub fn get_dashboard_stats(state: State<'_, Database>) -> Result<DashboardStats, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let today_omzet: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(grand_total), 0) FROM transactions WHERE DATE(created_at) = DATE('now','localtime') AND payment_status = 'completed'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let today_transactions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE DATE(created_at) = DATE('now','localtime') AND payment_status = 'completed'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_products: i64 = conn
        .query_row("SELECT COUNT(*) FROM products WHERE is_active = 1", [], |row| row.get(0))
        .unwrap_or(0);

    let low_stock_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM (SELECT p.id FROM products p LEFT JOIN stock_batches sb ON sb.product_id = p.id AND sb.is_deleted = 0 WHERE p.is_active = 1 GROUP BY p.id HAVING COALESCE(SUM(sb.quantity), 0) <= p.stock_threshold)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(DashboardStats {
        today_omzet,
        today_transactions,
        total_products,
        low_stock_count,
    })
}
