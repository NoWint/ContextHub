use crate::AppState;
use notify::{Config as NotifyConfig, Event, EventKind, RecommendedWatcher, RecursiveMode};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn start_watching(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    // Get project path from DB
    let source_path = {
        let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
        let path: String = conn
            .query_row(
                "SELECT source_path FROM projects WHERE id = ?1",
                [&project_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        path
    };

    let watch_path = PathBuf::from(&source_path);
    if !watch_path.exists() {
        return Err(format!("Path does not exist: {}", source_path));
    }

    let (tx, rx) = mpsc::channel();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Only trigger on file content changes, not metadata
                if matches!(
                    event.kind,
                    EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                ) {
                    let _ = tx.send(event);
                }
            }
        },
        NotifyConfig::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    // Store watcher in app state
    let watcher_box: Box<dyn Send + Sync> = Box::new(watcher);
    state
        .watchers
        .lock()
        .unwrap()
        .insert(project_id.clone(), watcher_box);

    let pid = project_id.clone();
    let app_handle = app.clone();

    // Debounce: only re-ingest after 2 seconds of no changes
    std::thread::spawn(move || {
        let mut last_event = Instant::now();
        let debounce = Duration::from_secs(2);
        let mut triggered = false;

        loop {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(_) => {
                    last_event = Instant::now();
                    triggered = false;
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    if !triggered && last_event.elapsed() >= debounce {
                        triggered = true;
                        let _ = app_handle.emit("project-files-changed", &pid);
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    break;
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn stop_watching(
    state: tauri::State<'_, AppState>,
    project_id: String,
) -> Result<(), String> {
    state.watchers.lock().unwrap().remove(&project_id);
    Ok(())
}
