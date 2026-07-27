use rusqlite::params;

#[derive(Debug)]
pub struct BatchAllocation {
    pub batch_id: i64,
    pub quantity_to_take: i64,
}

pub fn allocate_stock(
    conn: &rusqlite::Connection,
    product_id: i64,
    base_quantity: i64,
) -> Result<Vec<BatchAllocation>, String> {
    if base_quantity <= 0 {
        return Err("Quantity must be positive".to_string());
    }

    let mut stmt = conn
        .prepare(
            "SELECT id, quantity
             FROM stock_batches
             WHERE product_id = ?1
               AND quantity > 0
               AND is_deleted = 0
               AND (expiry_date IS NULL OR expiry_date >= date('now','localtime'))
             ORDER BY expiry_date ASC, received_date ASC, id ASC",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let batches: Vec<(i64, i64)> = stmt
        .query_map(params![product_id], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    let mut remaining = base_quantity;
    let mut allocations: Vec<BatchAllocation> = Vec::new();

    for (batch_id, qty) in batches {
        if remaining <= 0 {
            break;
        }
        let take = if qty >= remaining { remaining } else { qty };
        allocations.push(BatchAllocation {
            batch_id,
            quantity_to_take: take,
        });
        remaining -= take;
    }

    if remaining > 0 {
        return Err(format!(
            "Stok tidak mencukupi. Kekurangan: {} unit",
            remaining
        ));
    }

    Ok(allocations)
}

pub fn reduce_stock(
    conn: &rusqlite::Connection,
    batch_id: i64,
    quantity: i64,
) -> Result<(), String> {
    if quantity <= 0 {
        return Err("Quantity must be positive".to_string());
    }

    let affected = conn
        .execute(
            "UPDATE stock_batches SET quantity = quantity - ?1, updated_at = datetime('now','localtime')
             WHERE id = ?2 AND quantity >= ?1",
            params![quantity, batch_id],
        )
        .map_err(|e| format!("Update error: {}", e))?;

    if affected == 0 {
        return Err(format!(
            "Batch {} tidak memiliki cukup stok atau tidak ditemukan",
            batch_id
        ));
    }

    conn.execute(
        "UPDATE stock_batches SET is_deleted = 1, updated_at = datetime('now','localtime')
         WHERE id = ?1 AND quantity <= 0",
        params![batch_id],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE stock_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                purchase_price INTEGER NOT NULL DEFAULT 0,
                expiry_date TEXT,
                received_date TEXT DEFAULT (date('now','localtime')),
                batch_code TEXT DEFAULT '',
                supplier TEXT DEFAULT '',
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            );"
        ).unwrap();
        conn
    }

    fn insert_batch(conn: &Connection, product_id: i64, qty: i64, expiry: &str, received: &str) -> i64 {
        conn.execute(
            "INSERT INTO stock_batches (product_id, quantity, expiry_date, received_date) VALUES (?1, ?2, ?3, ?4)",
            params![product_id, qty, expiry, received],
        ).unwrap();
        conn.last_insert_rowid()
    }

    #[test]
    fn test_allocate_single_batch() {
        let conn = setup_db();
        insert_batch(&conn, 1, 100, "2099-12-31", "2024-01-01");
        let allocs = allocate_stock(&conn, 1, 50).unwrap();
        assert_eq!(allocs.len(), 1);
        assert_eq!(allocs[0].quantity_to_take, 50);
    }

    #[test]
    fn test_allocate_exact_batch() {
        let conn = setup_db();
        insert_batch(&conn, 1, 100, "2099-12-31", "2024-01-01");
        let allocs = allocate_stock(&conn, 1, 100).unwrap();
        assert_eq!(allocs.len(), 1);
        assert_eq!(allocs[0].quantity_to_take, 100);
    }

    #[test]
    fn test_allocate_fifo_order() {
        let conn = setup_db();
        insert_batch(&conn, 1, 50, "2099-12-31", "2024-03-01");
        insert_batch(&conn, 1, 50, "2099-12-31", "2024-01-01");
        insert_batch(&conn, 1, 50, "2099-06-01", "2024-02-01");
        let allocs = allocate_stock(&conn, 1, 120).unwrap();
        assert_eq!(allocs.len(), 3);
        assert_eq!(allocs[0].quantity_to_take, 50);
        assert_eq!(allocs[1].quantity_to_take, 50);
        assert_eq!(allocs[2].quantity_to_take, 20);
    }

    #[test]
    fn test_allocate_multiple_batches() {
        let conn = setup_db();
        insert_batch(&conn, 1, 30, "2099-12-31", "2024-01-01");
        insert_batch(&conn, 1, 40, "2099-12-31", "2024-02-01");
        let allocs = allocate_stock(&conn, 1, 60).unwrap();
        assert_eq!(allocs.len(), 2);
        assert_eq!(allocs[0].quantity_to_take, 30);
        assert_eq!(allocs[1].quantity_to_take, 30);
    }

    #[test]
    fn test_allocate_insufficient_stock() {
        let conn = setup_db();
        insert_batch(&conn, 1, 10, "2099-12-31", "2024-01-01");
        let err = allocate_stock(&conn, 1, 20).unwrap_err();
        assert!(err.contains("tidak mencukupi"));
    }

    #[test]
    fn test_allocate_zero_quantity() {
        let conn = setup_db();
        let err = allocate_stock(&conn, 1, 0).unwrap_err();
        assert!(err.contains("positive"));
    }

    #[test]
    fn test_allocate_no_batches() {
        let conn = setup_db();
        let err = allocate_stock(&conn, 1, 5).unwrap_err();
        assert!(err.contains("tidak mencukupi"));
    }

    #[test]
    fn test_reduce_stock_normal() {
        let conn = setup_db();
        let bid = insert_batch(&conn, 1, 100, "2099-12-31", "2024-01-01");
        reduce_stock(&conn, bid, 30).unwrap();
        let remaining: i64 = conn.query_row(
            "SELECT quantity FROM stock_batches WHERE id=?1", params![bid], |row| row.get(0),
        ).unwrap();
        assert_eq!(remaining, 70);
    }

    #[test]
    fn test_reduce_stock_exact() {
        let conn = setup_db();
        let bid = insert_batch(&conn, 1, 50, "2099-12-31", "2024-01-01");
        reduce_stock(&conn, bid, 50).unwrap();
        let is_deleted: i64 = conn.query_row(
            "SELECT is_deleted FROM stock_batches WHERE id=?1", params![bid], |row| row.get(0),
        ).unwrap();
        assert_eq!(is_deleted, 1);
    }

    #[test]
    fn test_reduce_stock_insufficient() {
        let conn = setup_db();
        let bid = insert_batch(&conn, 1, 10, "2099-12-31", "2024-01-01");
        let err = reduce_stock(&conn, bid, 20).unwrap_err();
        assert!(err.contains("tidak memiliki"));
    }
}
