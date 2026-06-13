mod db;
mod pipeline;
mod commands;

use db::Database;
use std::path::PathBuf;
use tauri::Manager;

pub struct AppState {
    pub db: Database,
}

impl AppState {
    pub fn initialize(app_dir: &PathBuf) -> Result<Self, anyhow::Error> {
        std::fs::create_dir_all(app_dir)?;
        let db_path = app_dir.join("contexthub.db");
        let db = Database::initialize(&db_path)?;
        Ok(Self { db })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");
            let state = AppState::initialize(&app_dir)
                .expect("Failed to initialize database");
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::project::list_projects,
            commands::project::create_project,
            commands::project::delete_project,
            commands::ingestion::ingest_project,
            commands::analysis::analyze_project,
            commands::compression::compress_project,
            commands::export::export_context,
            commands::settings::save_llm_config,
            commands::settings::list_llm_configs,
            commands::settings::delete_llm_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
