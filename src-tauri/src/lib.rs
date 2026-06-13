mod cli;
mod db;
mod pipeline;
mod commands;

use db::Database;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Database,
    pub watchers: Mutex<HashMap<String, Box<dyn Send + Sync>>>,
    pub startup_path: Mutex<Option<String>>,
}

impl AppState {
    pub fn initialize(app_dir: &PathBuf) -> Result<Self, anyhow::Error> {
        std::fs::create_dir_all(app_dir)?;
        let db_path = app_dir.join("contexthub.db");
        let db = Database::initialize(&db_path)?;
        Ok(Self {
            db,
            watchers: Mutex::new(HashMap::new()),
            startup_path: Mutex::new(None),
        })
    }
}

pub fn run_cli_export(
    path: &Option<String>,
    format: &str,
    compression: &str,
) -> Result<String, anyhow::Error> {
    let project_path = path.as_deref()
        .ok_or_else(|| anyhow::anyhow!("Project path is required for export"))?;

    let project_path = std::path::Path::new(project_path);
    if !project_path.exists() {
        anyhow::bail!("Path does not exist: {}", project_path.display());
    }

    // Create temp database for CLI mode
    let temp_dir = tempfile::tempdir()?;
    let db_path = temp_dir.path().join("cli.db");
    let db = Database::initialize(&db_path)?;

    // Ingest
    let project_id = uuid::Uuid::new_v4().to_string();
    let source = db::models::ProjectSource::LocalFolder {
        path: project_path.to_string_lossy().to_string(),
    };
    let ingestion = pipeline::ingestion::local_folder::LocalFolderIngestion;
    let raw = ingestion.ingest(source, project_id.clone())?;

    // Analyze (local only, no LLM in CLI mode)
    let local_result = pipeline::analysis::local_rules::analyze_locally(&raw, project_id.clone(), 1)?;
    let analysis = local_result.to_analysis(project_id.clone(), 1);

    // Compress
    let compression_level = match compression {
        "minimal" => db::models::CompressionLevel::Minimal,
        "detailed" => db::models::CompressionLevel::Detailed,
        _ => db::models::CompressionLevel::Standard,
    };

    let max_tokens = pipeline::compression::levels::max_tokens_for_level(&compression_level);
    let ranked = pipeline::compression::ranker::rank_content(&raw.files, &compression_level, max_tokens);

    let mut content = String::new();
    if let Some(ref overview) = analysis.overview {
        content.push_str(&format!("## Overview\n{}\n\n", overview));
    }
    if let Some(ref arch) = analysis.architecture {
        content.push_str(&format!("## Architecture\n{}\n\n", arch));
    }
    if let Some(ref deps) = analysis.dependencies {
        content.push_str(&format!("## Dependencies\n{}\n\n", deps));
    }
    content.push_str("## Key Files\n\n");
    for file in &ranked.included_files {
        if let Some(ref file_content) = file.content {
            content.push_str(&format!("### {}\n```{}\n{}\n```\n\n",
                file.path,
                file.language.as_deref().unwrap_or("").to_lowercase(),
                file_content
            ));
        }
    }

    let compressed = pipeline::traits::CompressedContext {
        content,
        token_count: ranked.total_tokens,
        files_included: ranked.included_files.len(),
    };

    // Export
    let project_name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project");

    let output = match format {
        "claude" => pipeline::export::claude::export_claude(&compressed, project_name),
        "gemini" => pipeline::export::gemini::export_gemini(&compressed, project_name),
        "cursor" => pipeline::export::cursor::export_cursor(&compressed, project_name),
        "markdown" | "md" => pipeline::export::markdown::export_markdown(&compressed, project_name),
        _ => anyhow::bail!("Unknown format: {}. Supported: claude, gemini, cursor, markdown", format),
    };

    Ok(output)
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

            // Check for CLI path argument (first non-flag argument)
            let startup_path = std::env::args().nth(1).filter(|arg| !arg.starts_with('-'));
            *state.startup_path.lock().unwrap() = startup_path;

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::project::list_projects,
            commands::project::create_project,
            commands::project::delete_project,
            commands::project::get_project_files,
            commands::project::get_project_analysis,
            commands::project::get_analysis_history,
            commands::project::get_startup_path,
            commands::ingestion::ingest_project,
            commands::analysis::analyze_project,
            commands::compression::compress_project,
            commands::export::export_context,
            commands::settings::save_llm_config,
            commands::settings::list_llm_configs,
            commands::settings::delete_llm_config,
            commands::watcher::start_watching,
            commands::watcher::stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
