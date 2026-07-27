use crate::db::connection::Database;
use crate::fifo;
use crate::models::transaction::{PaymentInfo, TransactionResult};
use serde::Deserialize;
use tauri::State;
use rusqlite::params;

#[derive(Debug, Deserialize)]
pub struct TransactionItemInput {
    pub product_id: i64,
    #[allow(dead_code)]
    pub quantity: f64,
    pub unit: String,
    pub unit_conversion_factor: f64,
    pub base_quantity: f64,
    pub selling_price: i64,
    pub discount: i64,
    pub subtotal: i64,
}

#[derive(Debug, Deserialize)]
pub struct PaymentInput {
    pub method: String,
    pub amount: i64,
    pub reference: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionInput {
    pub items: Vec<TransactionItemInput>,
    pub payments: Vec<PaymentInput>,
}

fn generate_trx_number(conn: &rusqlite::Connection) -> Result<String, String> {
    let today: String = conn
        .query_row(
            "SELECT strftime('%Y%m%d', 'now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let prefix = format!("TRX-{}", today);

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM transactions WHERE transaction_number LIKE ?1",
            params![format!("{}%", prefix)],
            |row| row.get(0),
        )
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(format!("{}-{:04}", prefix, count + 1))
}

#[tauri::command]
pub fn create_transaction(
    input: CreateTransactionInput,
    state: State<'_, Database>,
) -> Result<TransactionResult, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    if input.items.is_empty() {
        return Err("Keranjang kosong".to_string());
    }
    if input.payments.is_empty() {
        return Err("Pilih metode pembayaran".to_string());
    }

    let subtotal: i64 = input.items.iter().map(|i| i.subtotal).sum();
    let discount_total: i64 = input.items.iter().map(|i| i.discount).sum();
    let grand_total = subtotal - discount_total;
    let amount_paid: i64 = input.payments.iter().map(|p| p.amount).sum();

    if amount_paid < grand_total {
        return Err(format!(
            "Pembayaran kurang: perlu {} bayar {}",
            grand_total, amount_paid
        ));
    }

    let cash_amount: i64 = input
        .payments
        .iter()
        .filter(|p| p.method == "cash")
        .map(|p| p.amount)
        .sum();
    let non_cash_total: i64 = amount_paid - cash_amount;
    let change = cash_amount - (grand_total - non_cash_total);
    if change < 0 {
        return Err("Pembayaran cash tidak mencukupi".to_string());
    }

    let trx_number = generate_trx_number(&conn)?;

    conn.execute_batch("BEGIN").map_err(|e| format!("Transaction error: {}", e))?;

    let result = (|| -> Result<TransactionResult, String> {
        conn.execute(
            "INSERT INTO transactions (transaction_number, subtotal, discount_total, grand_total, payment_status)
             VALUES (?1, ?2, ?3, ?4, 'completed')",
            params![trx_number, subtotal, discount_total, grand_total],
        )
        .map_err(|e| format!("Insert transaction error: {}", e))?;

        let trx_id: i64 = conn.last_insert_rowid();

        for item in &input.items {
            let base_qty_i64 = item.base_quantity.round() as i64;

            let allocations = fifo::allocate_stock(&conn, item.product_id, base_qty_i64)?;

            for alloc in &allocations {
                fifo::reduce_stock(&conn, alloc.batch_id, alloc.quantity_to_take)?;

                let item_subtotal = (alloc.quantity_to_take as f64 / item.base_quantity * item.subtotal as f64).round() as i64;
                let item_discount = (alloc.quantity_to_take as f64 / item.base_quantity * item.discount as f64).round() as i64;
                let alloc_qty = alloc.quantity_to_take as f64 / item.unit_conversion_factor;

                conn.execute(
                    "INSERT INTO transaction_items (transaction_id, product_id, stock_batch_id, quantity, unit, unit_conversion_factor, base_quantity, selling_price, discount, subtotal)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![
                        trx_id,
                        item.product_id,
                        alloc.batch_id,
                        alloc_qty,
                        item.unit,
                        item.unit_conversion_factor,
                        alloc.quantity_to_take,
                        item.selling_price,
                        item_discount,
                        item_subtotal,
                    ],
                )
                .map_err(|e| format!("Insert transaction_item error: {}", e))?;
            }
        }

        let mut payments: Vec<PaymentInfo> = Vec::new();
        for payment in &input.payments {
            conn.execute(
                "INSERT INTO payments (transaction_id, method, amount, reference)
                 VALUES (?1, ?2, ?3, ?4)",
                params![trx_id, payment.method, payment.amount, payment.reference],
            )
            .map_err(|e| format!("Insert payment error: {}", e))?;

            let pay_id: i64 = conn.last_insert_rowid();
            payments.push(PaymentInfo {
                id: pay_id,
                transaction_id: trx_id,
                method: payment.method.clone(),
                amount: payment.amount,
                reference: payment.reference.clone(),
                created_at: String::new(),
            });
        }

        let created_at: String = conn
            .query_row(
                "SELECT datetime('now','localtime')",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Query error: {}", e))?;

        Ok(TransactionResult {
            id: trx_id,
            transaction_number: trx_number,
            subtotal,
            discount_total,
            grand_total,
            payment_status: "completed".to_string(),
            payments,
            amount_paid,
            change,
            created_at,
        })
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
