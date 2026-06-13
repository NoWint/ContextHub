use crate::AppState;
use crate::db::models::{Analysis, FileEntry, LlmConfig};
use crate::pipeline::analysis::local_rules::analyze_locally;
use crate::pipeline::analysis::llm::refine_with_llm;
use crate::pipeline::traits::RawProject;
use tauri::State;

#[tauri::command]
pub fn analyze_project(
    state: State<'_, AppState>,
    project_id: String,
    use_llm: bool,
) -> Result<Analysis, String> {
    // Phase 1: Read all needed data from DB, then drop the lock
    let (files, next_version, llm_config) = {
        let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT id, project_id, path, language, size_bytes, relevance_score, content, is_entry FROM files WHERE project_id = ?1")
            .map_err(|e| e.to_string())?;
        let files: Vec<FileEntry> = stmt
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

        let current_version: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM analyses WHERE project_id = ?1",
                [&project_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        let next_version = current_version + 1;

        let llm_config = if use_llm {
            Some(conn
                .query_row(
                    "SELECT id, provider, api_key, endpoint, model, is_default FROM llm_configs WHERE is_default = 1 LIMIT 1",
                    [],
                    |row| {
                        Ok(LlmConfig {
                            id: row.get(0)?,
                            provider: row.get(1)?,
                            api_key: row.get(2)?,
                            endpoint: row.get(3)?,
                            model: row.get(4)?,
                            is_default: row.get::<_, i32>(5)? != 0,
                        })
                    },
                )
                .map_err(|e| format!("No LLM configured: {}", e))?)
        } else {
            None
        };

        (files, next_version, llm_config)
    }; // Lock is dropped here

    // Phase 2: Execute LLM call without holding the lock
    let raw = RawProject {
        total_size: files.iter().filter_map(|f| f.size_bytes).map(|s| s as u64).sum(),
        files: files.clone(),
    };

    let local_result = analyze_locally(&raw, project_id.clone(), next_version)
        .map_err(|e| e.to_string())?;
    let mut analysis = local_result.to_analysis(project_id.clone(), next_version);

    if let Some(config) = llm_config {
        match refine_with_llm(&raw, &local_result, &config) {
            Ok((overview, architecture, decisions)) => {
                analysis.overview = Some(overview);
                analysis.architecture = Some(architecture);
                analysis.decisions = Some(decisions);
            }
            Err(e) => {
                eprintln!("LLM refinement failed: {}, continuing with local analysis", e);
            }
        }
    }

    // Phase 3: Re-acquire the lock only to write the result
    {
        let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO analyses (id, project_id, version, overview, architecture, decisions, dependencies, api_endpoints, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                &analysis.id,
                &analysis.project_id,
                &analysis.version,
                &analysis.overview,
                &analysis.architecture,
                &analysis.decisions,
                &analysis.dependencies,
                &analysis.api_endpoints,
                &analysis.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(analysis)
}
