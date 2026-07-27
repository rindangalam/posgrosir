use crate::backup as backup_logic;
use crate::db::connection::Database;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct BackupInfo {
    pub filename: String,
    pub display_name: String,
    pub size_bytes: u64,
    pub created_at: String,
}

#[tauri::command]
pub fn list_backups(_state: State<'_, Database>) -> Result<Vec<BackupInfo>, String> {
    let app_dir = get_app_dir()?;
    backup_logic::list_backups(&app_dir)
}

#[tauri::command]
pub fn create_backup(label: Option<String>, _state: State<'_, Database>) -> Result<BackupInfo, String> {
    let app_dir = get_app_dir()?;
    let db_path = app_dir.join("posgrosir.db");
    backup_logic::create_backup(&db_path, &app_dir, label)
}

#[tauri::command]
pub fn restore_backup(filename: String, state: State<'_, Database>) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    let db_path = app_dir.join("posgrosir.db");
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    backup_logic::restore_backup(&db_path, &app_dir, &filename, &conn)?;
    Ok(())
}

#[tauri::command]
pub fn delete_backup(filename: String, _state: State<'_, Database>) -> Result<(), String> {
    let app_dir = get_app_dir()?;
    backup_logic::delete_backup(&app_dir, &filename)
}

#[tauri::command]
pub fn import_backup_file(content: Vec<u8>, _state: State<'_, Database>) -> Result<BackupInfo, String> {
    let app_dir = get_app_dir()?;
    let db_path = app_dir.join("posgrosir.db");
    backup_logic::import_backup_file(&db_path, &app_dir, &content)
}

fn get_app_dir() -> Result<std::path::PathBuf, String> {
    let dirs = std::path::PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| ".".into()));
    let app_dir = dirs.join("com.posgrosir.app");
    std::fs::create_dir_all(&app_dir).map_err(|e| format!("Gagal buat app dir: {}", e))?;
    Ok(app_dir)
}
