# ContextHub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri desktop app that imports projects, analyzes and compresses their context, and exports structured context files for AI coding tools.

**Architecture:** Pipeline architecture with strict unidirectional data flow — Ingestion → Analysis → Compression → Storage → Export. Rust backend handles all heavy operations; React frontend handles display and interaction. SQLite as sole persistence layer.

**Tech Stack:** Tauri v2, Rust, SQLite (rusqlite), Tree-sitter, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Vitest, Playwright

---

## File Structure

```
src-tauri/
├── Cargo.toml
├── src/
│   ├── main.rs                    # Tauri entry point
│   ├── lib.rs                     # Module declarations
│   ├── db/
│   │   ├── mod.rs                 # Database module
│   │   ├── schema.rs              # SQLite schema & migrations
│   │   └── models.rs              # Data models (Project, File, Analysis, Export, LlmConfig)
│   ├── pipeline/
│   │   ├── mod.rs                 # Pipeline module & PipelineError
│   │   ├── traits.rs              # Core trait definitions
│   │   ├── ingestion/
│   │   │   ├── mod.rs
│   │   │   ├── local_folder.rs    # Local folder ingestion
│   │   │   ├── github.rs          # GitHub repo ingestion
│   │   │   ├── zip.rs             # Zip file ingestion
│   │   │   └── filter.rs          # .gitignore + built-in filter
│   │   ├── analysis/
│   │   │   ├── mod.rs
│   │   │   ├── local_rules.rs     # Tree-sitter + static analysis
│   │   │   ├── llm.rs             # LLM refinement
│   │   │   └── language_detect.rs # Language detection
│   │   ├── compression/
│   │   │   ├── mod.rs
│   │   │   ├── scorer.rs          # Relevance scoring
│   │   │   ├── ranker.rs          # Content ranking & truncation
│   │   │   └── levels.rs          # Compression level definitions
│   │   └── export/
│   │       ├── mod.rs
│   │       ├── claude.rs          # CLAUDE.md export
│   │       ├── gemini.rs          # GEMINI.md export
│   │       ├── cursor.rs          # .cursorrules export
│   │       └── markdown.rs        # Universal markdown export
│   └── commands/
│       ├── mod.rs                 # Tauri command module
│       ├── project.rs             # Project CRUD commands
│       ├── ingestion.rs           # Ingestion commands
│       ├── analysis.rs            # Analysis commands
│       ├── compression.rs         # Compression commands
│       ├── export.rs              # Export commands
│       └── settings.rs            # LLM config commands
├── migrations/
│   └── 001_init.sql               # Initial schema
src/
├── App.tsx                        # Root app with router
├── main.tsx                       # React entry
├── index.css                      # Tailwind imports
├── lib/
│   ├── api.ts                     # Tauri IPC invoke wrappers
│   └── store.ts                   # Zustand store
├── pages/
│   ├── Dashboard.tsx              # Project list + import entry
│   ├── ProjectView.tsx            # File tree + analysis + actions
│   ├── AnalysisView.tsx           # Analysis results display
│   ├── ExportView.tsx             # Format selection + preview + export
│   └── Settings.tsx               # LLM config + preferences
├── components/
│   ├── Sidebar.tsx                # Navigation sidebar
│   ├── FileTree.tsx               # Project file tree
│   ├── CodePreview.tsx            # Code preview with Shiki
│   ├── ExportPreview.tsx          # Export format preview
│   └── Toast.tsx                  # Toast notification
└── hooks/
    └── useProject.ts              # Project state hook
```

---

### Task 1: Scaffold Tauri + React Project

**Files:**
- Create: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`

- [ ] **Step 1: Create Tauri v2 project with React template**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub
npm create tauri-app@latest . -- --template react-ts
```
Accept defaults. This creates `src-tauri/`, `src/`, and config files.

- [ ] **Step 2: Install frontend dependencies**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub
npm install zustand react-router-dom @tauri-apps/api @tauri-apps/plugin-clipboard-manager @tauri-apps/plugin-dialog @tauri-apps/plugin-shell
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react
```

- [ ] **Step 3: Install Rust dependencies**

Edit `src-tauri/Cargo.toml` to add:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-clipboard-manager = "2"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
walkdir = "2"
ignore = "0.4"           # .gitignore parsing
tree-sitter = "0.24"
tree-sitter-rust = "0.23"
tree-sitter-javascript = "0.23"
tree-sitter-typescript = "0.23"
tree-sitter-python = "0.23"
tree-sitter-go = "0.23"
zip = "2"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
anyhow = "1"
thiserror = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
keyring = "3"
```

- [ ] **Step 4: Configure Tailwind**

Edit `src/index.css`:

```css
@import "tailwindcss";
```

Edit `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub
npm run dev
```
Expected: Tauri dev window opens with default React page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri v2 + React + TypeScript project"
```

---

### Task 2: SQLite Storage Layer

**Files:**
- Create: `src-tauri/src/db/mod.rs`, `src-tauri/src/db/schema.rs`, `src-tauri/src/db/models.rs`
- Create: `src-tauri/migrations/001_init.sql`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`

- [ ] **Step 1: Write database schema migration**

Create `src-tauri/migrations/001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS files (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    language   TEXT,
    size_bytes INTEGER,
    relevance_score REAL,
    content    TEXT,
    is_entry   INTEGER NOT NULL DEFAULT 0,
    UNIQUE(project_id, path)
);

CREATE TABLE IF NOT EXISTS analyses (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    overview    TEXT,
    architecture TEXT,
    decisions   TEXT,
    dependencies TEXT,
    api_endpoints TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, version)
);

CREATE TABLE IF NOT EXISTS exports (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    format      TEXT NOT NULL,
    compression TEXT NOT NULL,
    content     TEXT NOT NULL,
    token_count INTEGER,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS llm_configs (
    id       TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    api_key  TEXT,
    endpoint TEXT,
    model    TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Write database module**

Create `src-tauri/src/db/mod.rs`:

```rust
pub mod schema;
pub mod models;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn initialize(db_path: &Path) -> Result<Self, anyhow::Error> {
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let schema = include_str!("../../migrations/001_init.sql");
        conn.execute_batch(schema)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}
```

- [ ] **Step 3: Write data models**

Create `src-tauri/src/db/models.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub source_type: String,
    pub source_path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: String,
    pub project_id: String,
    pub path: String,
    pub language: Option<String>,
    pub size_bytes: Option<i64>,
    pub relevance_score: Option<f64>,
    pub content: Option<String>,
    pub is_entry: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Analysis {
    pub id: String,
    pub project_id: String,
    pub version: i64,
    pub overview: Option<String>,
    pub architecture: Option<String>,
    pub decisions: Option<String>,
    pub dependencies: Option<String>,
    pub api_endpoints: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Export {
    pub id: String,
    pub project_id: String,
    pub format: String,
    pub compression: String,
    pub content: String,
    pub token_count: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub id: String,
    pub provider: String,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub model: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProjectSource {
    LocalFolder { path: String },
    GitHubRepo { url: String, branch: Option<String> },
    ZipFile { path: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompressionLevel {
    Minimal,
    Standard,
    Detailed,
}

impl CompressionLevel {
    pub fn retention_ratio(&self) -> f64 {
        match self {
            CompressionLevel::Minimal => 0.05,
            CompressionLevel::Standard => 0.15,
            CompressionLevel::Detailed => 0.30,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            CompressionLevel::Minimal => "minimal",
            CompressionLevel::Standard => "standard",
            CompressionLevel::Detailed => "detailed",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Claude,
    Gemini,
    Cursor,
    Markdown,
}

impl ExportFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            ExportFormat::Claude => "claude",
            ExportFormat::Gemini => "gemini",
            ExportFormat::Cursor => "cursor",
            ExportFormat::Markdown => "markdown",
        }
    }
}
```

- [ ] **Step 4: Wire database into Tauri app**

Edit `src-tauri/src/lib.rs`:

```rust
mod db;
mod pipeline;
mod commands;

use db::Database;
use std::path::PathBuf;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Edit `src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    contexthub_lib::run()
}
```

- [ ] **Step 5: Write initial Tauri commands for project CRUD**

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod project;
```

Create `src-tauri/src/commands/project.rs`:

```rust
use crate::AppState;
use crate::db::models::Project;
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
```

- [ ] **Step 6: Create pipeline module stubs**

Create `src-tauri/src/pipeline/mod.rs`:

```rust
pub mod traits;
pub mod ingestion;
pub mod analysis;
pub mod compression;
pub mod export;
```

Create `src-tauri/src/pipeline/traits.rs`:

```rust
use crate::db::models::{FileEntry, ProjectSource, Analysis, CompressionLevel, ExportFormat};

pub struct RawProject {
    pub files: Vec<FileEntry>,
    pub total_size: u64,
}

pub struct CompressedContext {
    pub content: String,
    pub token_count: usize,
    pub files_included: usize,
}

pub trait IngestionAdapter {
    fn ingest(&self, source: ProjectSource, project_id: String) -> Result<RawProject, anyhow::Error>;
}

pub trait AnalysisEngine {
    fn analyze(&self, raw: &RawProject) -> Result<Analysis, anyhow::Error>;
}

pub trait CompressionEngine {
    fn compress(&self, analysis: &Analysis, files: &[FileEntry], level: CompressionLevel) -> Result<CompressedContext, anyhow::Error>;
}

pub trait ExportAdapter {
    fn export(&self, context: &CompressedContext, format: ExportFormat, project_name: &str) -> Result<String, anyhow::Error>;
}
```

Create stub files for each sub-module (ingestion, analysis, compression, export) with empty `mod.rs`.

- [ ] **Step 7: Verify Rust compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```
Expected: Compiles with no errors (warnings OK).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add SQLite storage layer, data models, and project CRUD commands"
```

---

### Task 3: Ingestion Pipeline — Local Folder

**Files:**
- Create: `src-tauri/src/pipeline/ingestion/mod.rs`, `src-tauri/src/pipeline/ingestion/local_folder.rs`, `src-tauri/src/pipeline/ingestion/filter.rs`
- Modify: `src-tauri/src/commands/project.rs`

- [ ] **Step 1: Write file filter**

Create `src-tauri/src/pipeline/ingestion/filter.rs`:

```rust
use ignore::gitignore::GitignoreBuilder;
use std::path::Path;

const BUILTIN_IGNORE_PATTERNS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "__pycache__",
    ".venv",
    "venv",
    ".env",
    ".DS_Store",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.lock",
    "Gemfile.lock",
    "poetry.lock",
    "*.min.js",
    "*.min.css",
    "*.map",
];

pub struct FileFilter {
    gitignore: ignore::gitignore::Gitignore,
}

impl FileFilter {
    pub fn new(project_root: &Path) -> Result<Self, anyhow::Error> {
        let mut builder = GitignoreBuilder::new(project_root);
        for pattern in BUILTIN_IGNORE_PATTERNS {
            builder.add_line(None, pattern)?;
        }
        // Also load .gitignore if present
        let gitignore_path = project_root.join(".gitignore");
        if gitignore_path.exists() {
            builder.add(&gitignore_path);
        }
        let gitignore = builder.build()?;
        Ok(Self { gitignore })
    }

    pub fn should_include(&self, path: &Path, is_dir: bool) -> bool {
        match self.gitignore.matched(path, is_dir) {
            ignore::Match::None => true,
            ignore::Match::Ignore(_) => false,
            ignore::Match::Whitelist(_) => true,
        }
    }
}
```

- [ ] **Step 2: Write local folder ingestion**

Create `src-tauri/src/pipeline/ingestion/local_folder.rs`:

```rust
use crate::db::models::{FileEntry, ProjectSource};
use crate::pipeline::traits::{IngestionAdapter, RawProject};
use super::filter::FileFilter;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use walkdir::WalkDir;

pub struct LocalFolderIngestion;

impl IngestionAdapter for LocalFolderIngestion {
    fn ingest(&self, source: ProjectSource, project_id: String) -> Result<RawProject, anyhow::Error> {
        let root_path = match &source {
            ProjectSource::LocalFolder { path } => Path::new(path),
            _ => anyhow::bail!("LocalFolderIngestion only handles LocalFolder source"),
        };

        if !root_path.exists() {
            anyhow::bail!("Path does not exist: {}", root_path.display());
        }

        let filter = FileFilter::new(root_path)?;
        let mut files = Vec::new();
        let mut total_size: u64 = 0;

        let language_map = build_language_map();

        for entry in WalkDir::new(root_path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                continue;
            }
            let relative = path.strip_prefix(root_path)?.to_path_buf();
            if !filter.should_include(&relative, false) {
                continue;
            }
            let metadata = fs::metadata(path)?;
            let size = metadata.len();
            total_size += size;

            // Skip files larger than 1MB
            if size > 1_048_576 {
                continue;
            }

            let content = fs::read_to_string(path).ok();
            let language = relative
                .extension()
                .and_then(|ext| ext.to_str())
                .and_then(|ext| language_map.get(ext).map(|s| s.as_str()));

            files.push(FileEntry {
                id: Uuid::new_v4().to_string(),
                project_id: project_id.clone(),
                path: relative.to_string_lossy().to_string(),
                language: language.map(|s| s.to_string()),
                size_bytes: Some(size as i64),
                relevance_score: None,
                content,
                is_entry: false,
            });
        }

        Ok(RawProject { files, total_size })
    }
}

fn build_language_map() -> HashMap<&'static str, String> {
    let mut map = HashMap::new();
    map.insert("rs", "Rust".to_string());
    map.insert("ts", "TypeScript".to_string());
    map.insert("tsx", "TypeScript".to_string());
    map.insert("js", "JavaScript".to_string());
    map.insert("jsx", "JavaScript".to_string());
    map.insert("py", "Python".to_string());
    map.insert("go", "Go".to_string());
    map.insert("java", "Java".to_string());
    map.insert("rb", "Ruby".to_string());
    map.insert("cpp", "C++".to_string());
    map.insert("c", "C".to_string());
    map.insert("cs", "C#".to_string());
    map.insert("swift", "Swift".to_string());
    map.insert("kt", "Kotlin".to_string());
    map.insert("scala", "Scala".to_string());
    map.insert("html", "HTML".to_string());
    map.insert("css", "CSS".to_string());
    map.insert("scss", "SCSS".to_string());
    map.insert("json", "JSON".to_string());
    map.insert("yaml", "YAML".to_string());
    map.insert("yml", "YAML".to_string());
    map.insert("toml", "TOML".to_string());
    map.insert("md", "Markdown".to_string());
    map.insert("sql", "SQL".to_string());
    map.insert("sh", "Shell".to_string());
    map
}
```

Create `src-tauri/src/pipeline/ingestion/mod.rs`:

```rust
pub mod local_folder;
pub mod filter;
```

- [ ] **Step 3: Add ingestion Tauri command**

Create `src-tauri/src/commands/ingestion.rs`:

```rust
use crate::AppState;
use crate::db::models::{FileEntry, ProjectSource};
use crate::pipeline::ingestion::local_folder::LocalFolderIngestion;
use crate::pipeline::traits::IngestionAdapter;
use tauri::State;

#[tauri::command]
pub fn ingest_project(
    state: State<'_, AppState>,
    project_id: String,
    source: ProjectSource,
) -> Result<Vec<FileEntry>, String> {
    let ingestion = LocalFolderIngestion;
    let raw = ingestion.ingest(source, project_id.clone()).map_err(|e| e.to_string())?;

    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;
    for file in &raw.files {
        conn.execute(
            "INSERT OR REPLACE INTO files (id, project_id, path, language, size_bytes, content, is_entry) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            [
                &file.id,
                &file.project_id,
                &file.path,
                &file.language.as_deref().unwrap_or(""),
                &file.size_bytes.map(|s| s.to_string()).unwrap_or_default(),
                &file.content.as_deref().unwrap_or(""),
                &if file.is_entry { "1" } else { "0" },
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(raw.files)
}
```

Update `src-tauri/src/commands/mod.rs`:

```rust
pub mod project;
pub mod ingestion;
```

Update `src-tauri/src/lib.rs` invoke_handler to include:

```rust
commands::ingestion::ingest_project,
```

- [ ] **Step 4: Verify compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```
Expected: Compiles with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add local folder ingestion with gitignore-aware filtering"
```

---

### Task 4: Ingestion Pipeline — GitHub Repo

**Files:**
- Create: `src-tauri/src/pipeline/ingestion/github.rs`
- Modify: `src-tauri/src/pipeline/ingestion/mod.rs`

- [ ] **Step 1: Write GitHub repo ingestion**

Create `src-tauri/src/pipeline/ingestion/github.rs`:

```rust
use crate::db::models::ProjectSource;
use crate::pipeline::ingestion::local_folder::LocalFolderIngestion;
use crate::pipeline::traits::{IngestionAdapter, RawProject};
use std::path::PathBuf;
use std::process::Command;

pub struct GitHubIngestion;

impl IngestionAdapter for GitHubIngestion {
    fn ingest(&self, source: ProjectSource, project_id: String) -> Result<RawProject, anyhow::Error> {
        let (url, branch) = match &source {
            ProjectSource::GitHubRepo { url, branch } => (url.clone(), branch.clone()),
            _ => anyhow::bail!("GitHubIngestion only handles GitHubRepo source"),
        };

        // Clone to temp directory
        let temp_dir = std::env::temp_dir().join(format!("contexthub-{}", project_id));
        if temp_dir.exists() {
            std::fs::remove_dir_all(&temp_dir)?;
        }

        let mut cmd = Command::new("git");
        cmd.arg("clone");
        cmd.arg("--depth").arg("1");
        if let Some(ref b) = branch {
            cmd.arg("--branch").arg(b);
        }
        cmd.arg(&url);
        cmd.arg(&temp_dir);

        let status = cmd.status()?;
        if !status.success() {
            anyhow::bail!("Failed to clone repository: {}", url);
        }

        // Reuse LocalFolderIngestion on cloned directory
        let local_source = ProjectSource::LocalFolder {
            path: temp_dir.to_string_lossy().to_string(),
        };
        let local_ingestion = LocalFolderIngestion;
        let result = local_ingestion.ingest(local_source, project_id)?;

        // Cleanup temp dir
        let _ = std::fs::remove_dir_all(&temp_dir);

        Ok(result)
    }
}
```

Update `src-tauri/src/pipeline/ingestion/mod.rs`:

```rust
pub mod local_folder;
pub mod filter;
pub mod github;
```

- [ ] **Step 2: Update ingestion command to support GitHub**

Edit `src-tauri/src/commands/ingestion.rs` to add GitHub support:

```rust
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
            [
                &file.id,
                &file.project_id,
                &file.path,
                &file.language.as_deref().unwrap_or(""),
                &file.size_bytes.map(|s| s.to_string()).unwrap_or_default(),
                &file.content.as_deref().unwrap_or(""),
                &if file.is_entry { "1" } else { "0" },
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(raw.files)
}
```

- [ ] **Step 3: Verify compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add GitHub repo ingestion via git clone"
```

---

### Task 5: Analysis Engine — Local Rules

**Files:**
- Create: `src-tauri/src/pipeline/analysis/mod.rs`, `src-tauri/src/pipeline/analysis/local_rules.rs`, `src-tauri/src/pipeline/analysis/language_detect.rs`

- [ ] **Step 1: Write language detection**

Create `src-tauri/src/pipeline/analysis/language_detect.rs`:

```rust
use crate::db::models::FileEntry;
use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize)]
pub struct LanguageStats {
    pub languages: Vec<LanguageEntry>,
    pub total_files: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LanguageEntry {
    pub language: String,
    pub file_count: usize,
    pub percentage: f64,
}

pub fn detect_languages(files: &[FileEntry]) -> LanguageStats {
    let mut counts: HashMap<String, usize> = HashMap::new();
    let total = files.len();

    for file in files {
        if let Some(ref lang) = file.language {
            *counts.entry(lang.clone()).or_insert(0) += 1;
        } else {
            *counts.entry("Other".to_string()).or_insert(0) += 1;
        }
    }

    let mut languages: Vec<LanguageEntry> = counts
        .into_iter()
        .map(|(language, file_count)| LanguageEntry {
            language,
            percentage: if total > 0 { (file_count as f64 / total as f64) * 100.0 } else { 0.0 },
            file_count,
        })
        .filter(|e| e.percentage >= 1.0)
        .collect();

    languages.sort_by(|a, b| b.file_count.cmp(&a.file_count));

    LanguageStats {
        languages,
        total_files: total,
    }
}
```

- [ ] **Step 2: Write local rules analysis**

Create `src-tauri/src/pipeline/analysis/local_rules.rs`:

```rust
use crate::db::models::{Analysis, FileEntry};
use crate::pipeline::analysis::language_detect::{detect_languages, LanguageStats};
use crate::pipeline::traits::RawProject;
use chrono::Utc;
use serde_json;
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize)]
pub struct LocalAnalysisResult {
    pub language_stats: LanguageStats,
    pub entry_files: Vec<String>,
    pub config_files: Vec<String>,
    pub dependency_files: Vec<String>,
    pub directory_structure: String,
}

impl LocalAnalysisResult {
    pub fn to_analysis(&self, project_id: String, version: i64) -> Analysis {
        let dependencies = extract_dependencies(&self.dependency_files);
        Analysis {
            id: Uuid::new_v4().to_string(),
            project_id,
            version,
            overview: None, // Filled by LLM
            architecture: None, // Filled by LLM
            decisions: None,
            dependencies: Some(serde_json::to_string(&dependencies).unwrap_or_default()),
            api_endpoints: None,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

pub fn analyze_locally(raw: &RawProject, project_id: String, version: i64) -> Result<LocalAnalysisResult, anyhow::Error> {
    let language_stats = detect_languages(&raw.files);

    let entry_files = find_entry_files(&raw.files);
    let config_files = find_config_files(&raw.files);
    let dependency_files = find_dependency_files(&raw.files);
    let directory_structure = build_directory_structure(&raw.files);

    Ok(LocalAnalysisResult {
        language_stats,
        entry_files,
        config_files,
        dependency_files,
        directory_structure,
    })
}

fn find_entry_files(files: &[FileEntry]) -> Vec<String> {
    let entry_patterns = ["main.rs", "main.ts", "main.js", "main.py", "main.go", "index.ts", "index.js", "app.tsx", "app.jsx", "index.html"];
    files
        .iter()
        .filter(|f| {
            let name = std::path::Path::new(&f.path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            entry_patterns.contains(&name)
        })
        .map(|f| f.path.clone())
        .collect()
}

fn find_config_files(files: &[FileEntry]) -> Vec<String> {
    let config_patterns = [".env.example", "config.yaml", "config.json", "docker-compose.yml", "Dockerfile", ".eslintrc", "tsconfig.json"];
    files
        .iter()
        .filter(|f| {
            let name = std::path::Path::new(&f.path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            config_patterns.iter().any(|p| name == *p)
        })
        .map(|f| f.path.clone())
        .collect()
}

fn find_dependency_files(files: &[FileEntry]) -> Vec<String> {
    let dep_patterns = ["package.json", "Cargo.toml", "go.mod", "requirements.txt", "pyproject.toml", "Gemfile", "pom.xml"];
    files
        .iter()
        .filter(|f| {
            let name = std::path::Path::new(&f.path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            dep_patterns.iter().any(|p| name == *p)
        })
        .map(|f| f.path.clone())
        .collect()
}

fn build_directory_structure(files: &[FileEntry]) -> String {
    let mut dirs: Vec<String> = files
        .iter()
        .filter_map(|f| {
            let path = std::path::Path::new(&f.path);
            path.parent().and_then(|p| p.to_str()).map(|s| s.to_string())
        })
        .collect();
    dirs.sort();
    dirs.dedup();
    dirs.join("\n")
}

fn extract_dependencies(dep_files: &[String]) -> Vec<String> {
    // Return file paths; actual parsing happens during LLM refinement
    dep_files.to_vec()
}
```

Create `src-tauri/src/pipeline/analysis/mod.rs`:

```rust
pub mod local_rules;
pub mod language_detect;
pub mod llm;
```

- [ ] **Step 3: Verify compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add local rules analysis with language detection and file classification"
```

---

### Task 6: Analysis Engine — LLM Refinement

**Files:**
- Create: `src-tauri/src/pipeline/analysis/llm.rs`
- Create: `src-tauri/src/commands/analysis.rs`, `src-tauri/src/commands/settings.rs`
- Modify: `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Write LLM refinement module**

Create `src-tauri/src/pipeline/analysis/llm.rs`:

```rust
use crate::db::models::{Analysis, LlmConfig};
use crate::pipeline::analysis::local_rules::LocalAnalysisResult;
use crate::pipeline::traits::RawProject;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct LlmRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct LlmResponse {
    choices: Vec<Choice>,
    usage: Usage,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: MessageContent,
}

#[derive(Debug, Deserialize)]
struct MessageContent {
    content: String,
}

#[derive(Debug, Deserialize)]
struct Usage {
    total_tokens: u32,
}

#[derive(Debug, Serialize)]
struct AnalysisResult {
    overview: String,
    architecture: String,
    decisions: Vec<String>,
}

pub fn refine_with_llm(
    raw: &RawProject,
    local_result: &LocalAnalysisResult,
    config: &LlmConfig,
) -> Result<(String, String, String), anyhow::Error> {
    let keyring_entry = keyring::Entry::new("contexthub", &config.id)?;
    let api_key = keyring_entry.get_password()?;

    let prompt = build_analysis_prompt(raw, local_result);

    let endpoint = config.endpoint.as_deref().unwrap_or(match config.provider.as_str() {
        "openai" => "https://api.openai.com/v1/chat/completions",
        "claude" => "https://api.anthropic.com/v1/messages",
        "ollama" => "http://localhost:11434/v1/chat/completions",
        _ => "https://api.openai.com/v1/chat/completions",
    });

    let client = reqwest::blocking::Client::new();

    let request = LlmRequest {
        model: config.model.clone(),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        max_tokens: 2000,
    };

    let response = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()?;

    if !response.status().is_success() {
        anyhow::bail!("LLM API error: {}", response.status());
    }

    let llm_response: LlmResponse = response.json()?;
    let content = llm_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default();

    // Parse the LLM response into structured fields
    let (overview, architecture, decisions) = parse_llm_response(&content);

    Ok((overview, architecture, decisions))
}

fn build_analysis_prompt(raw: &RawProject, local: &LocalAnalysisResult) -> String {
    let lang_summary: String = local
        .language_stats
        .languages
        .iter()
        .map(|l| format!("  - {}: {} files ({:.1}%)", l.language, l.file_count, l.percentage))
        .collect::<Vec<_>>()
        .join("\n");

    let entry_summary = local.entry_files.join(", ");
    let dep_summary = local.dependency_files.join(", ");

    // Include content of key files (limit to avoid token overflow)
    let key_file_contents: String = raw
        .files
        .iter()
        .filter(|f| local.entry_files.contains(&f.path) || local.dependency_files.contains(&f.path))
        .filter_map(|f| f.content.as_ref().map(|c| format!("--- {} ---\n{}\n", f.path, truncate(c, 2000))))
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"Analyze this project and provide a structured response.

## Project Statistics
- Total files: {}
- Languages:
{}

## Entry Points
{}

## Dependency Files
{}

## Directory Structure
{}

## Key File Contents
{}

Please respond in this exact format:

OVERVIEW:
[One paragraph describing what this project does]

ARCHITECTURE:
[Description of the core modules and how they relate to each other]

DECISIONS:
- [Technology choice 1 and why]
- [Technology choice 2 and why]
- [Key architectural decision and why]"#,
        raw.files.len(),
        lang_summary,
        entry_summary,
        dep_summary,
        local.directory_structure,
        key_file_contents,
    )
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.len() <= max_chars {
        s.to_string()
    } else {
        format!("{}... (truncated)", &s[..max_chars])
    }
}

fn parse_llm_response(content: &str) -> (String, String, String) {
    let mut overview = String::new();
    let mut architecture = String::new();
    let mut decisions = String::new();

    let mut current_section = "";

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("OVERVIEW:") {
            current_section = "overview";
            continue;
        } else if trimmed.starts_with("ARCHITECTURE:") {
            current_section = "architecture";
            continue;
        } else if trimmed.starts_with("DECISIONS:") {
            current_section = "decisions";
            continue;
        }

        match current_section {
            "overview" => {
                if !overview.is_empty() {
                    overview.push(' ');
                }
                overview.push_str(trimmed);
            }
            "architecture" => {
                if !architecture.is_empty() {
                    architecture.push('\n');
                }
                architecture.push_str(line);
            }
            "decisions" => {
                if !decisions.is_empty() {
                    decisions.push('\n');
                }
                decisions.push_str(line);
            }
            _ => {}
        }
    }

    (overview, architecture, decisions)
}
```

- [ ] **Step 2: Write analysis and settings commands**

Create `src-tauri/src/commands/analysis.rs`:

```rust
use crate::AppState;
use crate::db::models::{Analysis, FileEntry, LlmConfig};
use crate::pipeline::analysis::local_rules::{analyze_locally, LocalAnalysisResult};
use crate::pipeline::analysis::llm::refine_with_llm;
use crate::pipeline::traits::RawProject;
use tauri::State;

#[tauri::command]
pub fn analyze_project(
    state: State<'_, AppState>,
    project_id: String,
    use_llm: bool,
) -> Result<Analysis, String> {
    let conn = state.db.conn.lock().map_err(|e| e.to_string())?;

    // Get files for this project
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

    // Get current version
    let current_version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM analyses WHERE project_id = ?1",
            [&project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let next_version = current_version + 1;

    let raw = RawProject {
        total_size: files.iter().filter_map(|f| f.size_bytes).sum(),
        files: files.clone(),
    };

    // Local analysis
    let local_result = analyze_locally(&raw, project_id.clone(), next_version)
        .map_err(|e| e.to_string())?;
    let mut analysis = local_result.to_analysis(project_id.clone(), next_version);

    // LLM refinement (optional)
    if use_llm {
        let llm_config = conn
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
            .map_err(|e| format!("No LLM configured: {}", e))?;

        match refine_with_llm(&raw, &local_result, &llm_config) {
            Ok((overview, architecture, decisions)) => {
                analysis.overview = Some(overview);
                analysis.architecture = Some(architecture);
                analysis.decisions = Some(decisions);
            }
            Err(e) => {
                // LLM failed, continue with local-only results
                eprintln!("LLM refinement failed: {}, continuing with local analysis", e);
            }
        }
    }

    // Save analysis
    conn.execute(
        "INSERT INTO analyses (id, project_id, version, overview, architecture, decisions, dependencies, api_endpoints, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        [
            &analysis.id,
            &analysis.project_id,
            &analysis.version.to_string(),
            &analysis.overview.as_deref().unwrap_or(""),
            &analysis.architecture.as_deref().unwrap_or(""),
            &analysis.decisions.as_deref().unwrap_or(""),
            &analysis.dependencies.as_deref().unwrap_or(""),
            &analysis.api_endpoints.as_deref().unwrap_or(""),
            &analysis.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(analysis)
}
```

Create `src-tauri/src/commands/settings.rs`:

```rust
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

    // Store API key in OS keyring
    let keyring_entry = keyring::Entry::new("contexthub", &id)
        .map_err(|e| e.to_string())?;
    keyring_entry.set_password(&api_key).map_err(|e| e.to_string())?;

    // If this is default, unset other defaults
    if is_default {
        conn.execute("UPDATE llm_configs SET is_default = 0", [])
            .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "INSERT INTO llm_configs (id, provider, api_key, endpoint, model, is_default) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        [&id, &provider, "", &endpoint.unwrap_or_default(), &model, &if is_default { "1" } else { "0" }],
    )
    .map_err(|e| e.to_string())?;

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
                api_key: row.get(2)?,
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
    // Remove from keyring
    if let Ok(entry) = keyring::Entry::new("contexthub", &config_id) {
        let _ = entry.delete_credential();
    }
    conn.execute("DELETE FROM llm_configs WHERE id = ?1", [&config_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 3: Update commands module and lib.rs**

Update `src-tauri/src/commands/mod.rs`:

```rust
pub mod project;
pub mod ingestion;
pub mod analysis;
pub mod settings;
```

Update `src-tauri/src/lib.rs` invoke_handler to include all new commands:

```rust
.invoke_handler(tauri::generate_handler![
    commands::project::list_projects,
    commands::project::create_project,
    commands::project::delete_project,
    commands::ingestion::ingest_project,
    commands::analysis::analyze_project,
    commands::settings::save_llm_config,
    commands::settings::list_llm_configs,
    commands::settings::delete_llm_config,
])
```

- [ ] **Step 4: Verify compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add LLM refinement analysis and settings commands with OS keyring"
```

---

### Task 7: Smart Compression Engine

**Files:**
- Create: `src-tauri/src/pipeline/compression/mod.rs`, `src-tauri/src/pipeline/compression/scorer.rs`, `src-tauri/src/pipeline/compression/ranker.rs`, `src-tauri/src/pipeline/compression/levels.rs`
- Create: `src-tauri/src/commands/compression.rs`
- Modify: `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Write relevance scorer**

Create `src-tauri/src/pipeline/compression/scorer.rs`:

```rust
use crate::db::models::FileEntry;

const HIGH_SCORE_PATTERNS: &[&str] = [
    "main.rs", "main.ts", "main.js", "main.py", "main.go",
    "mod.rs", "lib.rs",
    "index.ts", "index.js",
    "app.tsx", "app.jsx",
    "router.ts", "router.js",
    "config.ts", "config.js",
];

const MEDIUM_SCORE_PATTERNS: &[&str] = [
    "test_", "_test.", ".spec.", ".test.",
    "README", "CHANGELOG",
];

const LOW_SCORE_PATTERNS: &[&str] = [
    ".min.js", ".min.css", ".map",
    "generated", "autogenerated",
];

pub fn score_file(file: &FileEntry) -> f64 {
    let mut score = 0.5; // Base score

    let path_lower = file.path.to_lowercase();

    // High score for entry points
    if HIGH_SCORE_PATTERNS.iter().any(|p| path_lower.contains(p)) {
        score += 0.3;
    }

    // Medium score for tests and docs
    if MEDIUM_SCORE_PATTERNS.iter().any(|p| path_lower.contains(p)) {
        score += 0.1;
    }

    // Low score for generated/minified files
    if LOW_SCORE_PATTERNS.iter().any(|p| path_lower.contains(p)) {
        score -= 0.3;
    }

    // Bonus for source code files
    if let Some(ref lang) = file.language {
        match lang.as_str() {
            "Rust" | "TypeScript" | "JavaScript" | "Python" | "Go" => score += 0.15,
            "HTML" | "CSS" | "SCSS" => score += 0.05,
            "JSON" | "YAML" | "TOML" => score += 0.02,
            _ => {}
        }
    }

    // Bonus for entry files
    if file.is_entry {
        score += 0.2;
    }

    // Penalty for very large files (likely generated)
    if let Some(size) = file.size_bytes {
        if size > 100_000 {
            score -= 0.1;
        }
    }

    score.clamp(0.0, 1.0)
}

pub fn score_all_files(files: &[FileEntry]) -> Vec<(FileEntry, f64)> {
    files
        .iter()
        .map(|f| {
            let score = score_file(f);
            (f.clone(), score)
        })
        .collect()
}
```

- [ ] **Step 2: Write content ranker**

Create `src-tauri/src/pipeline/compression/ranker.rs`:

```rust
use crate::db::models::{CompressionLevel, FileEntry};
use super::scorer::score_all_files;

pub struct RankedContent {
    pub included_files: Vec<FileEntry>,
    pub excluded_files: Vec<String>,
    pub total_tokens: usize,
}

pub fn rank_content(
    files: &[FileEntry],
    level: &CompressionLevel,
    max_tokens: usize,
) -> RankedContent {
    let mut scored = score_all_files(files);
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let target_tokens = (max_tokens as f64 * level.retention_ratio()) as usize;
    let mut included = Vec::new();
    let mut excluded = Vec::new();
    let mut current_tokens = 0;

    for (file, _score) in scored {
        let file_tokens = estimate_tokens(&file);
        if current_tokens + file_tokens <= target_tokens {
            current_tokens += file_tokens;
            included.push(file);
        } else {
            excluded.push(file.path);
        }
    }

    RankedContent {
        included_files: included,
        excluded_files: excluded,
        total_tokens: current_tokens,
    }
}

fn estimate_tokens(file: &FileEntry) -> usize {
    // Rough estimate: ~4 chars per token for code
    match &file.content {
        Some(content) => content.len() / 4,
        None => file.size_bytes.map(|s| s as usize / 4).unwrap_or(0),
    }
}
```

- [ ] **Step 3: Write compression levels**

Create `src-tauri/src/pipeline/compression/levels.rs`:

```rust
use crate::db::models::CompressionLevel;

pub fn max_tokens_for_level(level: &CompressionLevel) -> usize {
    match level {
        CompressionLevel::Minimal => 10_000,
        CompressionLevel::Standard => 30_000,
        CompressionLevel::Detailed => 60_000,
    }
}
```

Create `src-tauri/src/pipeline/compression/mod.rs`:

```rust
pub mod scorer;
pub mod ranker;
pub mod levels;
```

- [ ] **Step 4: Write compression command**

Create `src-tauri/src/commands/compression.rs`:

```rust
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

    // Get latest analysis
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

    // Get files
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

    // Build compressed context
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
```

- [ ] **Step 5: Update commands and lib.rs**

Update `src-tauri/src/commands/mod.rs`:

```rust
pub mod project;
pub mod ingestion;
pub mod analysis;
pub mod settings;
pub mod compression;
```

Add `commands::compression::compress_project` to invoke_handler in `src-tauri/src/lib.rs`.

- [ ] **Step 6: Verify compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add smart compression with relevance scoring and content ranking"
```

---

### Task 8: Context Export Adapters

**Files:**
- Create: `src-tauri/src/pipeline/export/mod.rs`, `src-tauri/src/pipeline/export/claude.rs`, `src-tauri/src/pipeline/export/gemini.rs`, `src-tauri/src/pipeline/export/cursor.rs`, `src-tauri/src/pipeline/export/markdown.rs`
- Create: `src-tauri/src/commands/export.rs`
- Modify: `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`

- [ ] **Step 1: Write Claude export adapter**

Create `src-tauri/src/pipeline/export/claude.rs`:

```rust
use crate::db::models::ExportFormat;
use crate::pipeline::traits::CompressedContext;

pub fn export_claude(context: &CompressedContext, project_name: &str) -> String {
    format!(
r#"# Project: {project_name}

{content}

## Notes
- This context was generated by ContextHub
- Compression level and file selection are optimized for Claude's context window
"#,
        project_name = project_name,
        content = context.content,
    )
}
```

- [ ] **Step 2: Write Gemini export adapter**

Create `src-tauri/src/pipeline/export/gemini.rs`:

```rust
use crate::pipeline::traits::CompressedContext;

pub fn export_gemini(context: &CompressedContext, project_name: &str) -> String {
    format!(
r#"# {project_name} - Project Context

<!-- Generated by ContextHub for Gemini -->

{content}

---
*Context size: ~{token_count} tokens, {files_included} files included*
"#,
        project_name = project_name,
        content = context.content,
        token_count = context.token_count,
        files_included = context.files_included,
    )
}
```

- [ ] **Step 3: Write Cursor export adapter**

Create `src-tauri/src/pipeline/export/cursor.rs`:

```rust
use crate::pipeline::traits::CompressedContext;

pub fn export_cursor(context: &CompressedContext, project_name: &str) -> String {
    format!(
r#"# {project_name} Rules

## Project Context
{content}

## Code Style Guidelines
- Follow existing patterns in the codebase
- Maintain consistency with the architecture described above
"#,
        project_name = project_name,
        content = context.content,
    )
}
```

- [ ] **Step 4: Write universal Markdown export adapter**

Create `src-tauri/src/pipeline/export/markdown.rs`:

```rust
use crate::pipeline::traits::CompressedContext;

pub fn export_markdown(context: &CompressedContext, project_name: &str) -> String {
    format!(
r#"# {project_name} - Complete Project Context

> Generated by ContextHub
> Files included: {files_included}
> Estimated tokens: {token_count}

---

{content}
"#,
        project_name = project_name,
        content = context.content,
        token_count = context.token_count,
        files_included = context.files_included,
    )
}
```

Create `src-tauri/src/pipeline/export/mod.rs`:

```rust
pub mod claude;
pub mod gemini;
pub mod cursor;
pub mod markdown;
```

- [ ] **Step 5: Write export command**

Create `src-tauri/src/commands/export.rs`:

```rust
use crate::AppState;
use crate::db::models::{Analysis, Export, ExportFormat, CompressionLevel};
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
    let context = crate::commands::compression::compress_project(
        state.clone(),
        project_id.clone(),
        compression,
    )?;

    // Then format
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
        [
            &export_record.id,
            &export_record.project_id,
            &export_record.format,
            &export_record.compression,
            &export_record.content,
            &export_record.token_count.map(|t| t.to_string()).unwrap_or_default(),
            &export_record.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(export_record)
}
```

- [ ] **Step 6: Update commands and lib.rs**

Update `src-tauri/src/commands/mod.rs`:

```rust
pub mod project;
pub mod ingestion;
pub mod analysis;
pub mod settings;
pub mod compression;
pub mod export;
```

Add `commands::export::export_context` to invoke_handler in `src-tauri/src/lib.rs`.

- [ ] **Step 7: Verify compilation**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo check
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add export adapters for Claude, Gemini, Cursor, and Markdown formats"
```

---

### Task 9: Frontend — API Layer and State Management

**Files:**
- Create: `src/lib/api.ts`, `src/lib/store.ts`

- [ ] **Step 1: Write Tauri IPC wrapper**

Create `src/lib/api.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";

export interface Project {
  id: string;
  name: string;
  source_type: string;
  source_path: string;
  created_at: string;
  updated_at: string;
}

export interface FileEntry {
  id: string;
  project_id: string;
  path: string;
  language: string | null;
  size_bytes: number | null;
  relevance_score: number | null;
  content: string | null;
  is_entry: boolean;
}

export interface Analysis {
  id: string;
  project_id: string;
  version: number;
  overview: string | null;
  architecture: string | null;
  decisions: string | null;
  dependencies: string | null;
  api_endpoints: string | null;
  created_at: string;
}

export interface ExportRecord {
  id: string;
  project_id: string;
  format: string;
  compression: string;
  content: string;
  token_count: number | null;
  created_at: string;
}

export interface LlmConfig {
  id: string;
  provider: string;
  api_key: string | null;
  endpoint: string | null;
  model: string;
  is_default: boolean;
}

export interface CompressedContext {
  content: string;
  token_count: number;
  files_included: number;
}

export type ProjectSource =
  | { LocalFolder: { path: string } }
  | { GitHubRepo: { url: string; branch: string | null } }
  | { ZipFile: { path: string } };

export type CompressionLevel = "Minimal" | "Standard" | "Detailed";

export type ExportFormat = "Claude" | "Gemini" | "Cursor" | "Markdown";

export const api = {
  project: {
    list: (): Promise<Project[]> => invoke("list_projects"),
    create: (name: string, source_type: string, source_path: string): Promise<Project> =>
      invoke("create_project", { name, sourceType: source_type, sourcePath: source_path }),
    delete: (projectId: string): Promise<void> =>
      invoke("delete_project", { projectId }),
  },
  ingestion: {
    ingest: (projectId: string, source: ProjectSource): Promise<FileEntry[]> =>
      invoke("ingest_project", { projectId, source }),
  },
  analysis: {
    analyze: (projectId: string, useLlm: boolean): Promise<Analysis> =>
      invoke("analyze_project", { projectId, useLlm }),
  },
  compression: {
    compress: (projectId: string, compression: CompressionLevel): Promise<CompressedContext> =>
      invoke("compress_project", { projectId, compression }),
  },
  export: {
    exportContext: (
      projectId: string,
      projectName: string,
      format: ExportFormat,
      compression: CompressionLevel
    ): Promise<ExportRecord> =>
      invoke("export_context", { projectId, projectName, format, compression }),
  },
  settings: {
    saveLlmConfig: (
      provider: string,
      apiKey: string,
      endpoint: string | null,
      model: string,
      isDefault: boolean
    ): Promise<LlmConfig> =>
      invoke("save_llm_config", { provider, apiKey, endpoint, model, isDefault }),
    listLlmConfigs: (): Promise<LlmConfig[]> => invoke("list_llm_configs"),
    deleteLlmConfig: (configId: string): Promise<void> =>
      invoke("delete_llm_config", { configId }),
  },
};
```

- [ ] **Step 2: Write Zustand store**

Create `src/lib/store.ts`:

```typescript
import { create } from "zustand";
import { api, Project, FileEntry, Analysis, ExportRecord, LlmConfig, CompressedContext, CompressionLevel, ExportFormat } from "./api";

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  files: FileEntry[];
  analysis: Analysis | null;
  compressedContext: CompressedContext | null;
  exportResult: ExportRecord | null;
  llmConfigs: LlmConfig[];
  loading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => void;
  createProject: (name: string, sourceType: string, sourcePath: string) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  ingestProject: (source: Parameters<typeof api.ingestion.ingest>[1]) => Promise<void>;
  analyzeProject: (useLlm: boolean) => Promise<void>;
  compressProject: (level: CompressionLevel) => Promise<void>;
  exportProject: (format: ExportFormat, compression: CompressionLevel) => Promise<void>;
  loadLlmConfigs: () => Promise<void>;
  saveLlmConfig: (provider: string, apiKey: string, endpoint: string | null, model: string, isDefault: boolean) => Promise<void>;
  deleteLlmConfig: (configId: string) => Promise<void>;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  files: [],
  analysis: null,
  compressedContext: null,
  exportResult: null,
  llmConfigs: [],
  loading: false,
  error: null,

  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await api.project.list();
      set({ projects, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  selectProject: (project) => set({ currentProject: project, files: [], analysis: null, compressedContext: null, exportResult: null }),

  createProject: async (name, sourceType, sourcePath) => {
    set({ loading: true, error: null });
    try {
      const project = await api.project.create(name, sourceType, sourcePath);
      set((s) => ({ projects: [project, ...s.projects], loading: false }));
      return project;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  deleteProject: async (projectId) => {
    try {
      await api.project.delete(projectId);
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== projectId),
        currentProject: s.currentProject?.id === projectId ? null : s.currentProject,
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  ingestProject: async (source) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const files = await api.ingestion.ingest(currentProject.id, source);
      set({ files, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  analyzeProject: async (useLlm) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const analysis = await api.analysis.analyze(currentProject.id, useLlm);
      set({ analysis, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  compressProject: async (level) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const compressedContext = await api.compression.compress(currentProject.id, level);
      set({ compressedContext, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  exportProject: async (format, compression) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const exportResult = await api.export.exportContext(currentProject.id, currentProject.name, format, compression);
      set({ exportResult, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadLlmConfigs: async () => {
    try {
      const llmConfigs = await api.settings.listLlmConfigs();
      set({ llmConfigs });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  saveLlmConfig: async (provider, apiKey, endpoint, model, isDefault) => {
    try {
      const config = await api.settings.saveLlmConfig(provider, apiKey, endpoint, model, isDefault);
      set((s) => ({ llmConfigs: [...s.llmConfigs, config] }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteLlmConfig: async (configId) => {
    try {
      await api.settings.deleteLlmConfig(configId);
      set((s) => ({ llmConfigs: s.llmConfigs.filter((c) => c.id !== configId) }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add frontend API layer and Zustand state management"
```

---

### Task 10: Frontend — Pages and Components

**Files:**
- Create: `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/pages/ProjectView.tsx`, `src/pages/AnalysisView.tsx`, `src/pages/ExportView.tsx`, `src/pages/Settings.tsx`
- Create: `src/components/Sidebar.tsx`, `src/components/FileTree.tsx`, `src/components/CodePreview.tsx`, `src/components/ExportPreview.tsx`

- [ ] **Step 1: Write App.tsx with routing**

Write `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { ProjectView } from "./pages/ProjectView";
import { AnalysisView } from "./pages/AnalysisView";
import { ExportView } from "./pages/ExportView";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-zinc-950 text-zinc-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectView />} />
            <Route path="/project/:id/analysis" element={<AnalysisView />} />
            <Route path="/project/:id/export" element={<ExportView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 2: Write Sidebar component**

Create `src/components/Sidebar.tsx`:

```tsx
import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { useEffect } from "react";

export function Sidebar() {
  const { projects, loadProjects } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <aside className="w-64 border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold">ContextHub</h1>
      </div>
      <nav className="flex-1 overflow-auto p-2">
        <Link
          to="/"
          className={`block px-3 py-2 rounded-md text-sm ${location.pathname === "/" ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
        >
          Dashboard
        </Link>
        <div className="mt-4 mb-2 px-3 text-xs font-semibold text-zinc-500 uppercase">
          Projects
        </div>
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/project/${p.id}`}
            className={`block px-3 py-1.5 rounded-md text-sm truncate ${location.pathname.startsWith(`/project/${p.id}`) ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
          >
            {p.name}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-zinc-800">
        <Link
          to="/settings"
          className={`block px-3 py-2 rounded-md text-sm ${location.pathname === "/settings" ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Write Dashboard page**

Create `src/pages/Dashboard.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { open } from "@tauri-apps/plugin-dialog";

export function Dashboard() {
  const { createProject, ingestProject, selectProject } = useAppStore();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

  const handleImportFolder = async () => {
    setImporting(true);
    try {
      const selected = await open({ directory: true, multiple: false });
      if (!selected) return;
      const path = selected as string;
      const name = path.split("/").pop() || "Untitled";
      const project = await createProject(name, "local", path);
      selectProject(project);
      await ingestProject({ LocalFolder: { path } });
      navigate(`/project/${project.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Import Project</h2>
      <div className="space-y-4">
        <button
          onClick={handleImportFolder}
          disabled={importing}
          className="w-full p-6 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors text-left"
        >
          <div className="text-lg font-medium mb-1">Local Folder</div>
          <div className="text-sm text-zinc-400">
            {importing ? "Importing..." : "Select a local project directory"}
          </div>
        </button>
        <button
          className="w-full p-6 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 transition-colors text-left opacity-50 cursor-not-allowed"
          disabled
        >
          <div className="text-lg font-medium mb-1">GitHub Repository</div>
          <div className="text-sm text-zinc-400">Coming soon</div>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write ProjectView page**

Create `src/pages/ProjectView.tsx`:

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "../lib/store";
import { FileTree } from "../components/FileTree";

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, currentProject, selectProject, files, analysis, analyzeProject } = useAppStore();

  useEffect(() => {
    const project = projects.find((p) => p.id === id);
    if (project) selectProject(project);
  }, [id, projects]);

  if (!currentProject) return <div className="p-8">Project not found</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{currentProject.name}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => analyzeProject(false)}
            className="px-4 py-2 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm"
          >
            Analyze (Local)
          </button>
          <button
            onClick={() => analyzeProject(true)}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm"
          >
            Analyze (Local + LLM)
          </button>
        </div>
      </div>

      {analysis && (
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg">
          <h3 className="font-semibold mb-2">Analysis v{analysis.version}</h3>
          {analysis.overview && <p className="text-sm text-zinc-300 mb-2">{analysis.overview}</p>}
          <button
            onClick={() => navigate(`/project/${id}/analysis`)}
            className="text-sm text-blue-400 hover:underline"
          >
            View full analysis
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Files ({files.length})</h3>
          <FileTree files={files} />
        </div>
        <div>
          <h3 className="font-semibold mb-3">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate(`/project/${id}/export`)}
              className="w-full px-4 py-3 bg-zinc-800 rounded-md hover:bg-zinc-700 text-sm text-left"
            >
              Export Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write FileTree component**

Create `src/components/FileTree.tsx`:

```tsx
import { FileEntry } from "../lib/api";

interface Props {
  files: FileEntry[];
}

export function FileTree({ files }: Props) {
  return (
    <div className="bg-zinc-900 rounded-lg p-3 max-h-96 overflow-auto">
      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">No files imported yet</p>
      ) : (
        <ul className="space-y-0.5 text-sm font-mono">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 px-2 py-0.5 hover:bg-zinc-800 rounded">
              <span className="text-zinc-500">{f.language || "?"}</span>
              <span className="truncate">{f.path}</span>
              {f.is_entry && <span className="text-xs text-yellow-500">entry</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Write AnalysisView page**

Create `src/pages/AnalysisView.tsx`:

```tsx
import { useParams } from "react-router-dom";
import { useAppStore } from "../lib/store";

export function AnalysisView() {
  const { id } = useParams<{ id: string }>();
  const { analysis } = useAppStore();

  if (!analysis) return <div className="p-8">No analysis available. Run analysis first.</div>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Analysis v{analysis.version}</h2>

      {analysis.overview && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Overview</h3>
          <p className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg">{analysis.overview}</p>
        </section>
      )}

      {analysis.architecture && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Architecture</h3>
          <pre className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{analysis.architecture}</pre>
        </section>
      )}

      {analysis.decisions && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Key Decisions</h3>
          <pre className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{analysis.decisions}</pre>
        </section>
      )}

      {analysis.dependencies && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">Dependencies</h3>
          <pre className="text-sm text-zinc-300 bg-zinc-900 p-4 rounded-lg whitespace-pre-wrap">{analysis.dependencies}</pre>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Write ExportView page**

Create `src/pages/ExportView.tsx`:

```tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { CompressionLevel, ExportFormat } from "../lib/api";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";

export function ExportView() {
  const { id } = useParams<{ id: string }>();
  const { currentProject, exportProject, exportResult, loading } = useAppStore();
  const [format, setFormat] = useState<ExportFormat>("Claude");
  const [compression, setCompression] = useState<CompressionLevel>("Standard");

  const handleExport = async () => {
    if (!currentProject) return;
    await exportProject(format, compression);
  };

  const handleCopy = async () => {
    if (exportResult) {
      await writeText(exportResult.content);
    }
  };

  const handleSave = async () => {
    if (!exportResult) return;
    const extensions: Record<string, string> = {
      claude: "md",
      gemini: "md",
      cursor: "cursorrules",
      markdown: "md",
    };
    const filenames: Record<string, string> = {
      claude: "CLAUDE.md",
      gemini: "GEMINI.md",
      cursor: ".cursorrules",
      markdown: "context.md",
    };
    const filePath = await save({
      defaultPath: filenames[exportResult.format],
      filters: [{ name: "Markdown", extensions: [extensions[exportResult.format]] }],
    });
    if (filePath) {
      // Write file via Tauri FS (would need tauri-plugin-fs)
      // For MVP, copy to clipboard as fallback
      await writeText(exportResult.content);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Export Context</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
          >
            <option value="Claude">Claude (CLAUDE.md)</option>
            <option value="Gemini">Gemini (GEMINI.md)</option>
            <option value="Cursor">Cursor (.cursorrules)</option>
            <option value="Markdown">Universal Markdown</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Compression</label>
          <select
            value={compression}
            onChange={(e) => setCompression(e.target.value as CompressionLevel)}
            className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
          >
            <option value="Minimal">Minimal (~5%)</option>
            <option value="Standard">Standard (~15%)</option>
            <option value="Detailed">Detailed (~30%)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm mb-6"
      >
        {loading ? "Exporting..." : "Generate Export"}
      </button>

      {exportResult && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Preview</h3>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="px-3 py-1 bg-zinc-800 rounded text-xs hover:bg-zinc-700">
                Copy to Clipboard
              </button>
              <button onClick={handleSave} className="px-3 py-1 bg-zinc-800 rounded text-xs hover:bg-zinc-700">
                Save to File
              </button>
            </div>
          </div>
          <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-auto max-h-[500px] whitespace-pre-wrap">
            {exportResult.content}
          </pre>
          <p className="text-xs text-zinc-500 mt-2">
            ~{exportResult.token_count} tokens | {exportResult.format} format | {exportResult.compression} compression
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Write Settings page**

Create `src/pages/Settings.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";

export function Settings() {
  const { llmConfigs, loadLlmConfigs, saveLlmConfig, deleteLlmConfig } = useAppStore();
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    loadLlmConfigs();
  }, []);

  const handleSave = async () => {
    await saveLlmConfig(provider, apiKey, endpoint || null, model, isDefault);
    setApiKey("");
    setEndpoint("");
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <section className="mb-8">
        <h3 className="font-semibold mb-4">LLM Configuration</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                if (e.target.value === "openai") setModel("gpt-4o-mini");
                else if (e.target.value === "claude") setModel("claude-sonnet-4-20250514");
                else if (e.target.value === "ollama") setModel("llama3");
              }}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
              placeholder={provider === "ollama" ? "Not required for Ollama" : "sk-..."}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Custom Endpoint (optional)</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded"
            />
            Set as default
          </label>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-500 text-sm"
          >
            Save Configuration
          </button>
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-4">Saved Configurations</h3>
        {llmConfigs.length === 0 ? (
          <p className="text-sm text-zinc-500">No LLM configurations saved yet.</p>
        ) : (
          <div className="space-y-2">
            {llmConfigs.map((config) => (
              <div key={config.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg">
                <div>
                  <span className="font-medium text-sm">{config.provider}</span>
                  <span className="text-zinc-500 text-sm ml-2">{config.model}</span>
                  {config.is_default && <span className="text-xs text-yellow-500 ml-2">default</span>}
                </div>
                <button
                  onClick={() => deleteLlmConfig(config.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 9: Verify frontend build**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub
npm run build
```
Expected: Builds successfully.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add frontend pages and components for Dashboard, Project, Analysis, Export, and Settings"
```

---

### Task 11: Integration Test — End-to-End Flow

**Files:**
- Create: `src-tauri/tests/integration_test.rs`

- [ ] **Step 1: Write Rust integration test**

Create `src-tauri/tests/integration_test.rs`:

```rust
use std::path::PathBuf;
use tempfile::TempDir;

fn setup_test_db() -> (TempDir, rusqlite::Connection) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let conn = rusqlite::Connection::open(&db_path).unwrap();
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").unwrap();
    let schema = include_str!("../migrations/001_init.sql");
    conn.execute_batch(schema).unwrap();
    (temp_dir, conn)
}

#[test]
fn test_project_crud() {
    let (_temp, conn) = setup_test_db();

    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path) VALUES ('test-1', 'Test Project', 'local', '/tmp/test')",
        [],
    ).unwrap();

    let name: String = conn
        .query_row("SELECT name FROM projects WHERE id = 'test-1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(name, "Test Project");

    conn.execute("DELETE FROM projects WHERE id = 'test-1'", []).unwrap();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 0);
}

#[test]
fn test_file_storage() {
    let (_temp, conn) = setup_test_db();

    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path) VALUES ('p1', 'P', 'local', '/tmp')",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO files (id, project_id, path, language, size_bytes, content, is_entry) VALUES ('f1', 'p1', 'src/main.rs', 'Rust', 100, 'fn main() {}', 1)",
        [],
    ).unwrap();

    let path: String = conn
        .query_row("SELECT path FROM files WHERE id = 'f1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(path, "src/main.rs");
}

#[test]
fn test_analysis_versioning() {
    let (_temp, conn) = setup_test_db();

    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path) VALUES ('p1', 'P', 'local', '/tmp')",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO analyses (id, project_id, version, overview) VALUES ('a1', 'p1', 1, 'First analysis')",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO analyses (id, project_id, version, overview) VALUES ('a2', 'p1', 2, 'Second analysis')",
        [],
    ).unwrap();

    let version: i64 = conn
        .query_row(
            "SELECT MAX(version) FROM analyses WHERE project_id = 'p1'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(version, 2);
}
```

- [ ] **Step 2: Add tempfile dev dependency**

Add to `src-tauri/Cargo.toml` under `[dev-dependencies]`:

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 3: Run integration tests**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo test
```
Expected: All 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add integration tests for project CRUD, file storage, and analysis versioning"
```

---

### Task 12: Final Build Verification

- [ ] **Step 1: Run full Rust test suite**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub/src-tauri
cargo test
```
Expected: All tests pass.

- [ ] **Step 2: Build Tauri app**

Run:
```bash
cd /Users/xiatian/Desktop/ContextHub
npm run tauri build
```
Expected: Build succeeds, produces `.dmg` for macOS.

- [ ] **Step 3: Manual smoke test**

Launch the built app and verify:
1. Import a local folder
2. Run local analysis
3. Compress with Standard level
4. Export as Claude format
5. Copy to clipboard

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify final build and integration"
```
