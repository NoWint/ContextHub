use crate::db::models::{FileEntry, ProjectSource};
use crate::pipeline::traits::{IngestionAdapter, RawProject};
use super::filter::FileFilter;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;
use walkdir::WalkDir;

const BINARY_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "bmp", "ico", "svg", "webp",
    "woff", "woff2", "ttf", "otf", "eot",
    "mp3", "mp4", "avi", "mov", "wmv", "flv", "webm",
    "zip", "tar", "gz", "bz2", "xz", "7z", "rar",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "exe", "dll", "so", "dylib", "bin", "dat",
    "pyc", "pyo", "class", "o", "obj",
    "sqlite", "db",
];

fn is_binary_extension(ext: &str) -> bool {
    let ext_lower = ext.to_lowercase();
    BINARY_EXTENSIONS.contains(&ext_lower.as_str())
}

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

        for entry in WalkDir::new(root_path)
            .into_iter()
            .filter_entry(|e| {
                if e.path().is_dir() {
                    let relative = e.path().strip_prefix(root_path).ok();
                    match relative {
                        Some(rel) => filter.should_include(rel, true),
                        None => true,
                    }
                } else {
                    true
                }
            })
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if path.is_dir() {
                continue;
            }
            let relative = match path.strip_prefix(root_path) {
                Ok(r) => r.to_path_buf(),
                Err(_) => continue,
            };
            if !filter.should_include(&relative, false) {
                continue;
            }

            // Skip binary files by extension
            let ext = relative.extension().and_then(|e| e.to_str()).unwrap_or("");
            if is_binary_extension(ext) {
                continue;
            }

            let metadata = match fs::metadata(path) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let size = metadata.len();
            total_size += size;

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
