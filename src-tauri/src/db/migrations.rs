use rusqlite::Connection;
use std::path::Path;

pub fn run_migrations(conn: &Connection, migrations_dir: &Path) -> Result<(), String> {
    let current_version: i32 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(|e| format!("Failed to read user_version: {}", e))?;

    let mut migration_files: Vec<_> = std::fs::read_dir(migrations_dir)
        .map_err(|e| format!("Failed to read migrations directory: {}", e))?
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

    for (version, path) in &migration_files {
        if *version <= current_version {
            continue;
        }

        let sql = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read migration {}: {}", path.display(), e))?;

        conn.execute_batch(&sql)
            .map_err(|e| format!("Migration {} failed: {}", version, e))?;

        conn.pragma_update(None, "user_version", *version)
            .map_err(|e| format!("Failed to update user_version to {}: {}", version, e))?;

        println!("Migration {} applied successfully", version);
    }

    Ok(())
}
