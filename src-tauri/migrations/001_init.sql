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
