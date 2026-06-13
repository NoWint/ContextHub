use crate::AppState;
use crate::db::models::{Analysis, CompressionLevel, FileEntry};
use crate::pipeline::compression::ranker::rank_content;
use crate::pipeline::compression::levels::max_tokens_for_level;
use crate::pipeline::traits::CompressedContext;
use tauri::State;

#[tauri::command]
pub fn compress_project(
    state: State<'_, AppState>,
    project_id: String,
    compression: CompressionLevel,
) -> Result<CompressedContext, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    let analysis: Analysis = conn
        .query_row(
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
        )
        .map_err(|e| format!("No analysis found: {}", e))?;

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

    let max_tokens = max_tokens_for_level(&compression);
    let ranked = rank_content(&files, &compression, max_tokens);

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

    Ok(CompressedContext {
        content,
        token_count: ranked.total_tokens,
        files_included: ranked.included_files.len(),
    })
}
