use serde::Serialize;
use crate::db::models::{FileEntry, ProjectSource, Analysis, CompressionLevel, ExportFormat};

pub struct RawProject {
    pub files: Vec<FileEntry>,
    pub total_size: u64,
}

#[derive(Serialize)]
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
