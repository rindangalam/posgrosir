use crate::db::connection::Database;
use serde::{Deserialize, Serialize};
use tauri::State;
use rusqlite::params;
use sha2::{Sha256, Digest};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserInfo {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub display_name: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub password: String,
    pub role: String,
    pub display_name: String,
}

fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[tauri::command]
pub fn login_user(
    input: LoginInput,
    state: State<'_, Database>,
) -> Result<UserInfo, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let hash = hash_password(&input.password);

    conn.query_row(
        "SELECT id, username, role, display_name FROM users WHERE username = ?1 AND password_hash = ?2 AND is_active = 1",
        params![input.username.trim(), hash],
        |row| Ok(UserInfo {
            id: row.get(0)?,
            username: row.get(1)?,
            role: row.get(2)?,
            display_name: row.get(3)?,
        }),
    )
    .map_err(|_| "Username atau password salah".to_string())
}

pub fn seed_default_admin_inner(conn: &rusqlite::Connection) -> Result<(), String> {
    let exists: bool = conn
        .query_row("SELECT COUNT(*) FROM users WHERE username = 'admin'", [], |row| {
            row.get::<_, i64>(0)
        })
        .map(|c| c > 0)
        .unwrap_or(false);

    if !exists {
        let hash = hash_password("admin123");
        conn.execute(
            "INSERT INTO users (username, password_hash, role, display_name) VALUES (?1, ?2, 'admin', 'Admin Utama')",
            params!["admin", hash],
        )
        .map_err(|e| format!("Insert error: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn seed_default_admin(state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    seed_default_admin_inner(&conn)
}

#[tauri::command]
pub fn change_password(
    id: i64,
    old_password: String,
    new_password: String,
    state: State<'_, Database>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    if new_password.len() < 4 {
        return Err("Password baru minimal 4 karakter".to_string());
    }
    let stored_hash: String = conn
        .query_row("SELECT password_hash FROM users WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|_| "User tidak ditemukan".to_string())?;

    if stored_hash != hash_password(&old_password) {
        return Err("Password lama salah".to_string());
    }

    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        params![hash_password(&new_password), id],
    )
    .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn list_users(state: State<'_, Database>) -> Result<Vec<UserInfo>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT id, username, role, display_name FROM users WHERE is_active = 1 ORDER BY username")
        .map_err(|e| format!("Query error: {}", e))?;

    let results = stmt
        .query_map([], |row| {
            Ok(UserInfo {
                id: row.get(0)?,
                username: row.get(1)?,
                role: row.get(2)?,
                display_name: row.get(3)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(results)
}

#[tauri::command]
pub fn create_user(
    input: CreateUserInput,
    state: State<'_, Database>,
) -> Result<UserInfo, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    if input.username.trim().is_empty() {
        return Err("Username tidak boleh kosong".to_string());
    }
    if input.password.len() < 4 {
        return Err("Password minimal 4 karakter".to_string());
    }
    if !["admin", "cashier"].contains(&input.role.as_str()) {
        return Err("Role harus admin atau cashier".to_string());
    }

    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE username = ?1",
            params![input.username.trim()],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    if exists {
        return Err("Username sudah digunakan".to_string());
    }

    conn.execute(
        "INSERT INTO users (username, password_hash, role, display_name) VALUES (?1, ?2, ?3, ?4)",
        params![
            input.username.trim(),
            hash_password(&input.password),
            input.role,
            input.display_name.trim(),
        ],
    )
    .map_err(|e| format!("Insert error: {}", e))?;

    let id = conn.last_insert_rowid();
    Ok(UserInfo {
        id,
        username: input.username.trim().to_string(),
        role: input.role,
        display_name: input.display_name.trim().to_string(),
    })
}

#[tauri::command]
pub fn delete_user(id: i64, state: State<'_, Database>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;

    let current_role: String = conn
        .query_row("SELECT role FROM users WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|_| "User tidak ditemukan".to_string())?;

    if current_role == "admin" {
        let admin_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1", [], |row| row.get(0))
            .unwrap_or(0);
        if admin_count <= 1 {
            return Err("Tidak bisa menghapus admin terakhir".to_string());
        }
    }

    conn.execute(
        "UPDATE users SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("Delete error: {}", e))?;

    Ok(())
}
