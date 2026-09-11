use tauri::Manager;

mod db;
mod commands;
mod models;
mod fifo;
mod printer;
mod scales;
mod backup;

#[tauri::command]
fn check_db(state: tauri::State<'_, db::connection::Database>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .map_err(|e| format!("Query error: {}", e))?;
    let tables: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(tables)
}

fn find_migrations_dir() -> std::path::PathBuf {
    let candidates = vec![
        std::path::PathBuf::from("migrations"),
        std::path::PathBuf::from("src-tauri/migrations"),
    ];
    for path in &candidates {
        if path.exists() {
            return path.clone();
        }
    }
    std::path::PathBuf::from("migrations")
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");

            let db_path = app_dir.join("posgrosir.db");
            let database = db::connection::Database::new(&db_path)?;

            {
                let conn = database.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
                let migrations_dir = find_migrations_dir();
                db::migrations::run_migrations(&conn, &migrations_dir)?;
                let _ = commands::auth::seed_default_admin_inner(&conn);
            }

            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_db,
            commands::auth::login_user,
            commands::auth::seed_default_admin,
            commands::auth::change_password,
            commands::auth::list_users,
            commands::auth::create_user,
            commands::auth::delete_user,
            commands::products::search_products,
            commands::products::get_unit_conversions,
            commands::products::list_products,
            commands::products::get_product,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::list_categories,
            commands::products::create_category,
            commands::products::update_category,
            commands::products::delete_category,
            commands::products::set_unit_conversions,
            commands::stocks::list_batches,
            commands::stocks::get_batch,
            commands::stocks::create_batch,
            commands::stocks::update_batch,
            commands::stocks::delete_batch,
            commands::stocks::get_low_stock_products,
            commands::stocks::get_stock_opname_data,
            commands::stocks::save_stock_opname,
            commands::stocks::list_stock_opname,
            commands::transactions::create_transaction,
            commands::promotions::get_active_promotions,
            commands::promotions::calculate_discounts,
            commands::promotions::list_promotions,
            commands::promotions::create_promotion,
            commands::promotions::update_promotion,
            commands::promotions::toggle_promotion,
            commands::promotions::delete_promotion,
            commands::reports::get_daily_summary,
            commands::reports::get_top_products,
            commands::reports::get_dashboard_stats,
            commands::reports::list_transactions,
            commands::reports::get_transaction_detail,
            commands::reports::void_transaction,
            commands::reports::refund_transaction,
            commands::reports::export_report_csv,
            commands::reports::generate_daily_summary,
            commands::printer::list_printers,
            commands::printer::print_receipt,
            commands::printer::test_print,
            commands::scales::list_serial_ports,
            commands::scales::read_scale,
            commands::backup::list_backups,
            commands::backup::create_backup,
            commands::backup::restore_backup,
            commands::backup::delete_backup,
            commands::backup::import_backup_file,
            commands::products::import_products_xlsx,
            commands::products::download_product_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
