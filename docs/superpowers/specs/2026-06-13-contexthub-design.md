# ContextHub Design Spec

## Overview

ContextHub is an AI project context management system that helps users maintain long-term project memory. It ingests project source code, analyzes and compresses it, and exports structured context files compatible with various AI coding tools.

**Target Users:** Individual developers and teams who use multiple AI coding tools (Claude, Gemini, Cursor) and need to maintain consistent project context across them.

**Core Principle:** Extreme practicality and extreme long-termism — every design decision must serve immediate utility while remaining extensible for future growth.

## Architecture: Pipeline

Strict unidirectional data flow through independent, testable stages:

```
Project Source → Ingestion Pipeline → Analysis Engine → Compression Engine → SQLite Storage → Export Adapter
```

**Key decisions:**
- Rust backend handles all heavy operations (file traversal, AST parsing, compression)
- React frontend handles display and interaction only
- Pipeline stages communicate through typed trait interfaces
- SQLite as the sole persistence layer
- Tauri IPC bridges frontend and backend

## 1. Ingestion Pipeline

### Supported Sources

| Source | Implementation | MVP Priority |
|--------|---------------|-------------|
| Local Folder | Tauri filesystem API + walkdir | P0 |
| GitHub Repo | GitHub API Clone (requires Git) | P0 |
| Zip File | Rust zip crate, extract to temp dir | P1 |

### Flow

```
Source → File Walker → Filter → File Tree Builder → Raw Content Store
```

1. **File Walker**: Recursively traverse directories, collect file paths and metadata (size, modified time)
2. **Filter**: Based on `.gitignore` rules + built-in blacklist (`node_modules`, `.git`, `target/`, etc.)
3. **File Tree Builder**: Build project file tree structure for frontend rendering
4. **Raw Content Store**: Store file contents in SQLite, associated with project ID

### Core Trait

```rust
trait IngestionAdapter {
    fn ingest(&self, source: ProjectSource) -> Result<RawProject>;
}

enum ProjectSource {
    LocalFolder { path: PathBuf },
    GitHubRepo { url: String, branch: Option<String> },
    ZipFile { path: PathBuf },
}
```

## 2. Analysis Engine

Two-layer analysis: local rules first, then LLM refinement.

### Layer 1: Local Rule Analysis (Tree-sitter + Static Rules)

| Analysis Item | Method | Output |
|---------------|--------|--------|
| Project structure | File tree + directory naming patterns | Module breakdown description |
| Language detection | File extension statistics | Primary language + ratios |
| Dependencies | Parse `package.json`/`Cargo.toml`/`go.mod` etc. | Dependency list |
| Entry points | Tree-sitter identifies `main`/`export`/`pub fn` | Key entry functions |
| API interfaces | Tree-sitter identifies route definitions, handlers | API endpoint list |
| Configuration | Parse `.env.example`/`config.yaml` | Configuration item descriptions |

### Layer 2: LLM Refinement

Sends Layer 1 output + key file contents to LLM, generating:
- **Project Overview**: One-paragraph description of what the project does
- **Architecture Summary**: Core modules and their relationships
- **Key Decisions**: Inferred technology choices and their rationale

### LLM Configuration

- Support OpenAI / Claude / local Ollama endpoints
- User configures API Key and Provider in Settings
- Token usage statistics displayed in frontend per analysis

## 3. Smart Compression

**Goal:** Extract the most important 20% from 100% of content, adapting to different AI tools' context windows.

### Strategy

```
Analysis Result → Relevance Scorer → Content Ranker → Template Renderer → Compressed Context
```

1. **Relevance Scorer**: Score each file/code segment
   - Entry files: high score
   - Core business logic: high score
   - Test files: medium score
   - Boilerplate/generated code: low score
   - Dependency lock files: very low score

2. **Content Ranker**: Sort by score, truncate based on target context window size
   - Claude: ~200K tokens → can accommodate more
   - Gemini: ~1M tokens → most generous
   - Cursor: ~128K tokens → needs more refinement

3. **Template Renderer**: Render in target format
   - Each export format has a corresponding template
   - Preserve structured information (headings, code blocks, lists)

### Compression Levels

| Level | Retention Ratio | Use Case |
|-------|----------------|----------|
| Minimal | ~5% | Quick overview |
| Standard | ~15% | Daily development |
| Detailed | ~30% | Deep understanding |

## 4. Context Export

Four export formats, each with a dedicated Adapter:

### Claude Context → `CLAUDE.md`

```markdown
# Project: {name}

## Overview
{project_overview}

## Architecture
{architecture_summary}

## Key Files
{key_files_with_descriptions}

## Conventions
{coding_conventions}

## Important Decisions
{historical_decisions}
```

### Gemini Context → `GEMINI.md`

Similar structure to Claude, with Gemini-preferred section markers.

### Cursor Context → `.cursorrules`

```
# {project_name} Rules

## Project Context
{overview}

## Code Style
{conventions}

## Architecture
{architecture}

## Key Patterns
{patterns}
```

### Universal Markdown → `context.md`

Full structured Markdown with all analysis results, no tool-specific preferences.

### Export Flow

```
Compressed Context → Export Adapter → Formatted File → User Download / Copy to Clipboard
```

- Export to file (Tauri file dialog)
- Copy to clipboard
- Preview in frontend after export

## 5. Data Model

### SQLite Schema

```sql
-- Projects
CREATE TABLE projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    source_type TEXT NOT NULL,     -- 'local' | 'github' | 'zip'
    source_path TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File Index
CREATE TABLE files (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path       TEXT NOT NULL,
    language   TEXT,
    size_bytes INTEGER,
    relevance_score REAL,
    content    TEXT,
    is_entry   BOOLEAN DEFAULT FALSE,
    UNIQUE(project_id, path)
);

-- Analysis Results
CREATE TABLE analyses (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    overview    TEXT,
    architecture TEXT,
    decisions   TEXT,              -- JSON array
    dependencies TEXT,             -- JSON array
    api_endpoints TEXT,            -- JSON array
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version)
);

-- Export Records
CREATE TABLE exports (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    format      TEXT NOT NULL,     -- 'claude' | 'gemini' | 'cursor' | 'markdown'
    compression TEXT NOT NULL,     -- 'minimal' | 'standard' | 'detailed'
    content     TEXT NOT NULL,
    token_count INTEGER,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LLM Configuration
CREATE TABLE llm_configs (
    id       TEXT PRIMARY KEY,
    provider TEXT NOT NULL,        -- 'openai' | 'claude' | 'ollama'
    api_key  TEXT,                 -- stored via OS keyring (Tauri keyring plugin)
    endpoint TEXT,                 -- custom endpoint
    model    TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE
);
```

### Long-termism Considerations

- `analyses.version` supports version comparison, future diff capability
- `files.relevance_score` persists scores, avoids recomputation
- `exports` records export history, future one-click update
- `llm_configs` supports multi-provider switching

## 6. Frontend UI Architecture

### Page Structure

```
┌──────────────────────────────────────────────┐
│  Sidebar          │  Main Content Area        │
│                   │                           │
│  ┌─────────────┐  │  ┌─────────────────────┐  │
│  │ Project List │  │  │  Project Dashboard  │  │
│  │             │  │  │                     │  │
│  │ - Project A │  │  │  [Import] [Analyze] │  │
│  │ - Project B │  │  │  [Compress] [Export]│  │
│  │             │  │  │                     │  │
│  │ + Add       │  │  │  File Tree │ Preview│  │
│  └─────────────┘  │  └─────────────────────┘  │
│                   │                           │
│  ┌─────────────┐  │                           │
│  │ Settings    │  │                           │
│  │ - LLM Keys  │  │                           │
│  │ - Export    │  │                           │
│  └─────────────┘  │                           │
└──────────────────────────────────────────────┘
```

### Core Pages

| Page | Function |
|------|----------|
| Dashboard | Project list, quick import entry |
| Project View | File tree + analysis results + action buttons |
| Analysis View | Analysis results display, editable corrections |
| Export View | Format selection + compression level + preview + export |
| Settings | LLM config, default compression level, export preferences |

### Tech Stack

- **UI Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Routing**: React Router v6
- **Code Highlighting**: Shiki (Tree-sitter theme consistency)

## 7. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Tauri v2 |
| Backend Language | Rust |
| Database | SQLite (via rusqlite) |
| AST Parsing | Tree-sitter |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| LLM Integration | OpenAI / Claude / Ollama APIs |
| File Traversal | walkdir |
| Zip Handling | zip crate |

## 8. Error Handling & Testing

### Error Handling

**Rust Backend:** `anyhow` + `thiserror` combination
- Pipeline stages return `Result<T, PipelineError>`
- Error enum: `IngestionError`, `AnalysisError`, `CompressionError`, `ExportError`
- Frontend receives structured errors via Tauri IPC, displays user-friendly messages

**Frontend:** React Error Boundary + Toast notifications
- Global Error Boundary catches render crashes
- API call failures shown via Toast, distinguishing network / business / config errors

### Testing Strategy

| Level | Tool | Coverage |
|-------|------|----------|
| Rust unit tests | `#[test]` + `assert!` | Pipeline stage logic, data models |
| Rust integration tests | `#[tokio::test]` | End-to-end Pipeline flow |
| Frontend unit tests | Vitest | Component logic, state management |
| Frontend E2E | Playwright | Critical user flows |
| Snapshot tests | Vitest | Export format output stability |

### Key Test Scenarios

- Import project with `.gitignore`, verify filter correctness
- When LLM unavailable, pure local rule analysis still produces basic results
- Token count accuracy across compression levels
- Syntax correctness of each export format

## MVP Scope

1. Import project (Local Folder + GitHub Repo)
2. Auto-summarize (hybrid: local rules + LLM refinement)
3. Context compression (3 levels: minimal/standard/detailed)
4. Export (Claude, Gemini, Cursor, Universal Markdown)

**Out of MVP scope:** Team collaboration, project version diff, real-time file watching, cloud sync.
