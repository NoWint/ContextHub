use crate::AppState;
use crate::db::models::LlmConfig;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn save_llm_config(
    state: State<'_, AppState>,
    provider: String,
    api_key: String,
    endpoint: Option<String>,
    model: String,
    is_default: bool,
) -> Result<LlmConfig, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    if is_default {
        conn.execute("UPDATE llm_configs SET is_default = 0", [])
            .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "INSERT INTO llm_configs (id, provider, api_key, endpoint, model, is_default) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![&id, &provider, "", &endpoint, &model, &is_default],
    )
    .map_err(|e| e.to_string())?;

    // Write to keyring after DB; if keyring fails, roll back the DB record
    let keyring_entry = keyring::Entry::new("contexthub", &id)
        .map_err(|e| e.to_string())?;
    if let Err(e) = keyring_entry.set_password(&api_key) {
        conn.execute("DELETE FROM llm_configs WHERE id = ?1", [&id])
            .map_err(|del_err| format!("Keyring write failed: {}, and DB rollback also failed: {}", e, del_err))?;
        return Err(format!("Keyring write failed: {}", e));
    }

    Ok(LlmConfig {
        id,
        provider,
        api_key: None,
        endpoint,
        model,
        is_default,
    })
}

#[tauri::command]
pub fn list_llm_configs(state: State<'_, AppState>) -> Result<Vec<LlmConfig>, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, provider, api_key, endpoint, model, is_default FROM llm_configs")
        .map_err(|e| e.to_string())?;
    let configs = stmt
        .query_map([], |row| {
            Ok(LlmConfig {
                id: row.get(0)?,
                provider: row.get(1)?,
                api_key: None,
                endpoint: row.get(3)?,
                model: row.get(4)?,
                is_default: row.get::<_, i32>(5)? != 0,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(configs)
}

#[tauri::command]
pub fn delete_llm_config(state: State<'_, AppState>, config_id: String) -> Result<(), String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    if let Ok(entry) = keyring::Entry::new("contexthub", &config_id) {
        let _ = entry.delete_credential();
    }
    conn.execute("DELETE FROM llm_configs WHERE id = ?1", [&config_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
