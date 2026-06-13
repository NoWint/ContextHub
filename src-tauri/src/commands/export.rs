use crate::AppState;
use crate::db::models::{Export, ExportFormat, CompressionLevel};
use crate::pipeline::export;
use crate::pipeline::traits::CompressedContext;
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn export_context(
    state: State<'_, AppState>,
    project_id: String,
    project_name: String,
    format: ExportFormat,
    compression: CompressionLevel,
) -> Result<Export, String> {
    // First compress
    let context = {
        let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

        // Get latest analysis
        let analysis = conn
            .query_row(
                "SELECT id, project_id, version, overview, architecture, decisions, dependencies, api_endpoints, created_at FROM analyses WHERE project_id = ?1 ORDER BY version DESC LIMIT 1",
                [&project_id],
                |row| {
                    Ok(crate::db::models::Analysis {
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

        // Get files
        let mut stmt = conn
            .prepare("SELECT id, project_id, path, language, size_bytes, relevance_score, content, is_entry FROM files WHERE project_id = ?1")
            .map_err(|e| e.to_string())?;
        let files: Vec<crate::db::models::FileEntry> = stmt
            .query_map([&project_id], |row| {
                Ok(crate::db::models::FileEntry {
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

        // Compress
        let max_tokens = crate::pipeline::compression::levels::max_tokens_for_level(&compression);
        let ranked = crate::pipeline::compression::ranker::rank_content(&files, &compression, max_tokens);

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

        CompressedContext {
            content,
            token_count: ranked.total_tokens,
            files_included: ranked.included_files.len(),
        }
    };

    // Format
    let formatted = match format {
        ExportFormat::Claude => export::claude::export_claude(&context, &project_name),
        ExportFormat::Gemini => export::gemini::export_gemini(&context, &project_name),
        ExportFormat::Cursor => export::cursor::export_cursor(&context, &project_name),
        ExportFormat::Markdown => export::markdown::export_markdown(&context, &project_name),
    };

    let export_record = Export {
        id: Uuid::new_v4().to_string(),
        project_id,
        format: format.as_str().to_string(),
        compression: compression.as_str().to_string(),
        content: formatted,
        token_count: Some(context.token_count as i64),
        created_at: Utc::now().to_rfc3339(),
    };

    // Save export record
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO exports (id, project_id, format, compression, content, token_count, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            &export_record.id,
            &export_record.project_id,
            &export_record.format,
            &export_record.compression,
            &export_record.content,
            &export_record.token_count,
            &export_record.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(export_record)
}
