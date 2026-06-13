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
    #[serde(skip_serializing)]
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
