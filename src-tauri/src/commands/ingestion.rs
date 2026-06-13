use crate::AppState;
use crate::db::models::{FileEntry, ProjectSource};
use crate::pipeline::ingestion::local_folder::LocalFolderIngestion;
use crate::pipeline::ingestion::github::GitHubIngestion;
use crate::pipeline::traits::IngestionAdapter;
use tauri::State;

#[tauri::command]
pub fn ingest_project(
    state: State<'_, AppState>,
    project_id: String,
    source: ProjectSource,
) -> Result<Vec<FileEntry>, String> {
    let raw = match &source {
        ProjectSource::LocalFolder { .. } => {
            let ingestion = LocalFolderIngestion;
            ingestion.ingest(source, project_id.clone()).map_err(|e| e.to_string())?
        }
        ProjectSource::GitHubRepo { .. } => {
            let ingestion = GitHubIngestion;
            ingestion.ingest(source, project_id.clone()).map_err(|e| e.to_string())?
        }
        ProjectSource::ZipFile { .. } => {
            return Err("Zip import not yet implemented".to_string());
        }
    };

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    for file in &raw.files {
        conn.execute(
            "INSERT OR REPLACE INTO files (id, project_id, path, language, size_bytes, content, is_entry) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![
                &file.id,
                &file.project_id,
                &file.path,
                &file.language,
                &file.size_bytes,
                &file.content,
                &file.is_entry,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(raw.files)
}
