use std::path::Path;
use std::process::Command;

/// Test that the migration SQL applies correctly from version 0
#[test]
fn test_migration_applies() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();

    let version: i32 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap();
    assert_eq!(version, 0);

    let migrations_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
    assert!(migrations_dir.exists(), "migrations directory must exist");

    let mut migration_files: Vec<_> = std::fs::read_dir(&migrations_dir)
        .unwrap()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().extension().map_or(false, |ext| ext == "sql"))
        .filter_map(|entry| {
            let path = entry.path();
            let stem = path.file_stem()?.to_str()?;
            let parts: Vec<&str> = stem.splitn(2, '_').collect();
            let version: i32 = parts.first()?.parse().ok()?;
            Some((version, path))
        })
        .collect();

    migration_files.sort_by_key(|(v, _)| *v);

    assert!(!migration_files.is_empty(), "must have at least one migration");

    for (version, path) in &migration_files {
        let sql = std::fs::read_to_string(path).unwrap();
        conn.execute_batch(&sql).unwrap();
        conn.pragma_update(None, "user_version", *version).unwrap();
    }

    let final_version: i32 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap();
    assert_eq!(final_version, migration_files.last().unwrap().0);

    let tables: Vec<String> = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .unwrap()
        .query_map([], |row| row.get(0))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    assert!(tables.contains(&"products".to_string()), "products table must exist");
    assert!(tables.contains(&"stock_batches".to_string()), "stock_batches table must exist");
    assert!(tables.contains(&"transactions".to_string()), "transactions table must exist");
    assert!(tables.contains(&"promotions".to_string()), "promotions table must exist");
    assert!(tables.contains(&"categories".to_string()), "categories table must exist");
    assert!(tables.contains(&"daily_summary".to_string()), "daily_summary table must exist");
}

/// Test that FIFO + migration combine correctly (products and batches table coexist)
#[test]
fn test_migration_tables_have_expected_columns() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    let migrations_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");
    let sql = std::fs::read_to_string(migrations_dir.join("001_initial.sql")).unwrap();
    conn.execute_batch(&sql).unwrap();

    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(products)")
        .unwrap()
        .query_map([], |row| row.get(1))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();
    assert!(cols.contains(&"plu_code".to_string()));
    assert!(cols.contains(&"selling_price".to_string()));
    assert!(cols.contains(&"stock_threshold".to_string()));

    let batch_cols: Vec<String> = conn
        .prepare("PRAGMA table_info(stock_batches)")
        .unwrap()
        .query_map([], |row| row.get(1))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();
    assert!(batch_cols.contains(&"expiry_date".to_string()));
    assert!(batch_cols.contains(&"batch_code".to_string()));
}

/// Test that cargo check passes
#[test]
fn test_cargo_check() {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = Command::new("cargo")
        .args(["check", "--manifest-path", &manifest_dir.join("Cargo.toml").to_string_lossy()])
        .output()
        .expect("cargo check must execute");

    assert!(output.status.success(), "cargo check failed:\n{}",
        String::from_utf8_lossy(&output.stderr));
}
