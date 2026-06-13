use crate::AppState;
use crate::db::models::{FileEntry, Analysis, Project};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, source_type, source_path, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;
    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                source_type: row.get(2)?,
                source_path: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(projects)
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    name: String,
    source_type: String,
    source_path: String,
) -> Result<Project, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [&id, &name, &source_type, &source_path, &now, &now],
    )
    .map_err(|e| e.to_string())?;
    Ok(Project {
        id,
        name,
        source_type,
        source_path,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, project_id: String) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM projects WHERE id = ?1", [&project_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_project_files(state: State<'_, AppState>, project_id: String) -> Result<Vec<FileEntry>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, project_id, path, language, size_bytes, relevance_score, content, is_entry FROM files WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let files = stmt
        .query_map([&project_id], |row| {
            Ok(FileEntry {
                id: row.get(0)?,
                project_id: row.get(1)?,
                path: row.get(2)?,
                language: row.get(3)?,
                size_bytes: row.get(4)?,
                relevance_score: row.get(5)?,
                content: row.get(6)?,
                is_entry: row.get::<_, i32>(7)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(files)
}

#[tauri::command]
pub fn get_project_analysis(state: State<'_, AppState>, project_id: String) -> Result<Option<Analysis>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let result = conn.query_row(
        "SELECT id, project_id, version, overview, architecture, decisions, dependencies, api_endpoints, created_at FROM analyses WHERE project_id = ?1 ORDER BY version DESC LIMIT 1",
        [&project_id],
        |row| {
            Ok(Analysis {
                id: row.get(0)?,
                project_id: row.get(1)?,
                version: row.get(2)?,
                overview: row.get(3)?,
                architecture: row.get(4)?,
                decisions: row.get(5)?,
                dependencies: row.get(6)?,
                api_endpoints: row.get(7)?,
                created_at: row.get(8)?,
            })
        },
    );
    match result {
        Ok(analysis) => Ok(Some(analysis)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
