use crate::commands::backup::BackupInfo;
use rusqlite::Connection;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

fn backup_dir(app_dir: &Path) -> std::path::PathBuf {
    let dir = app_dir.join("backups");
    fs::create_dir_all(&dir).ok();
    dir
}

pub fn list_backups(app_dir: &Path) -> Result<Vec<BackupInfo>, String> {
    let dir = backup_dir(app_dir);
    let mut list = Vec::new();
    if !dir.exists() {
        return Ok(list);
    }
    for entry in fs::read_dir(&dir).map_err(|e| format!("Gagal baca backup dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Entry error: {}", e))?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "db") {
            let metadata = fs::metadata(&path).map_err(|e| format!("Metadata error: {}", e))?;
            let filename = path.file_name().unwrap().to_string_lossy().to_string();
            let size_bytes = metadata.len();
            let created = metadata
                .created()
                .unwrap_or(SystemTime::now())
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            let display_name = filename
                .replace("posgrosir-", "")
                .replace(".db", "")
                .replace("-", " ")
                .replace("_", " ");
            let datetime = format_ts(created as i64);
            list.push(BackupInfo {
                filename,
                display_name,
                size_bytes,
                created_at: datetime,
            });
        }
    }
    list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(list)
}

pub fn create_backup(db_path: &Path, app_dir: &Path, label: Option<String>) -> Result<BackupInfo, String> {
    let dir = backup_dir(app_dir);
    let ts = chrono_like_now();
    let suffix = label
        .filter(|l| !l.trim().is_empty())
        .map(|l| format!("_{}", l.trim().replace(' ', "_")))
        .unwrap_or_default();
    let backup_name = format!("posgrosir-{}{}.db", ts, suffix);
    let backup_path = dir.join(&backup_name);

    if !db_path.exists() {
        return Err("Database tidak ditemukan".to_string());
    }

    fs::copy(db_path, &backup_path).map_err(|e| format!("Gagal copy backup: {}", e))?;

    let metadata = fs::metadata(&backup_path).map_err(|e| format!("Metadata error: {}", e))?;
    let size_bytes = metadata.len();
    let display_name = backup_name
        .replace("posgrosir-", "")
        .replace(".db", "")
        .replace("-", " ")
        .replace("_", " ");

    Ok(BackupInfo {
        filename: backup_name,
        display_name,
        size_bytes,
        created_at: ts,
    })
}

pub fn restore_backup(db_path: &Path, app_dir: &Path, filename: &str, conn: &Connection) -> Result<(), String> {
    let dir = backup_dir(app_dir);
    let backup_path = dir.join(filename);

    if !backup_path.exists() {
        return Err("File backup tidak ditemukan".to_string());
    }

    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", [])
        .map_err(|e| format!("Checkpoint error: {}", e))?;

    fs::copy(&backup_path, db_path).map_err(|e| format!("Gagal restore backup: {}", e))?;

    Ok(())
}

pub fn delete_backup(app_dir: &Path, filename: &str) -> Result<(), String> {
    let dir = backup_dir(app_dir);
    let backup_path = dir.join(filename);

    if !backup_path.exists() {
        return Err("File backup tidak ditemukan".to_string());
    }

    fs::remove_file(&backup_path).map_err(|e| format!("Gagal hapus backup: {}", e))?;
    Ok(())
}

pub fn import_backup_file(db_path: &Path, app_dir: &Path, content: &[u8]) -> Result<BackupInfo, String> {
    let dir = backup_dir(app_dir);
    let ts = chrono_like_now();
    let backup_name = format!("posgrosir-{}-import.db", ts);
    let backup_path = dir.join(&backup_name);

    fs::write(&backup_path, content).map_err(|e| format!("Gagal simpan file import: {}", e))?;

    let metadata = fs::metadata(&backup_path).map_err(|e| format!("Metadata error: {}", e))?;
    let size_bytes = metadata.len();
    let display_name = backup_name
        .replace("posgrosir-", "")
        .replace(".db", "")
        .replace("-", " ")
        .replace("_", " ");

    // Verify it's a valid SQLite file
    let test_conn = Connection::open(&backup_path)
        .map_err(|_| "File bukan database SQLite yang valid".to_string())?;
    test_conn
        .prepare("SELECT COUNT(*) FROM sqlite_master")
        .map_err(|_| "File bukan database SQLite yang valid".to_string())?;

    // Copy over the live db
    conn_execute_checkpoint(db_path)?;
    fs::copy(&backup_path, db_path).map_err(|e| format!("Gagal restore imported backup: {}", e))?;

    Ok(BackupInfo {
        filename: backup_name,
        display_name,
        size_bytes,
        created_at: ts,
    })
}

fn conn_execute_checkpoint(db_path: &Path) -> Result<(), String> {
    let conn = Connection::open(db_path).map_err(|e| format!("Open error: {}", e))?;
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", [])
        .map_err(|e| format!("Checkpoint error: {}", e))?;
    drop(conn);
    Ok(())
}

fn chrono_like_now() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    format_ts(secs as i64)
}

fn format_ts(secs: i64) -> String {
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Simple date calculation from 1970-01-01
    let mut y = 1970i64;
    let mut remaining = days;
    loop {
        let days_in_year = if is_leap(y) { 366 } else { 365 };
        if remaining < days_in_year {
            break;
        }
        remaining -= days_in_year;
        y += 1;
    }
    let months_days = if is_leap(y) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut m = 0usize;
    for md in months_days.iter() {
        if remaining < *md {
            break;
        }
        remaining -= *md;
        m += 1;
    }
    m += 1;

    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
        y,
        m,
        remaining + 1,
        hours,
        minutes,
        seconds
    )
}

fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}
