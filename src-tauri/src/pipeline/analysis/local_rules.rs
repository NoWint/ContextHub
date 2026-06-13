use crate::db::models::{Analysis, FileEntry};
use crate::pipeline::traits::RawProject;
use chrono::Utc;
use serde_json;
use std::collections::HashMap;
use uuid::Uuid;

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
            overview: None,
            architecture: None,
            decisions: None,
            dependencies: Some(serde_json::to_string(&dependencies).unwrap_or_default()),
            api_endpoints: None,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

pub fn analyze_locally(raw: &RawProject, _project_id: String, _version: i64) -> Result<LocalAnalysisResult, anyhow::Error> {
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
    dep_files.to_vec()
}

fn detect_languages(files: &[FileEntry]) -> LanguageStats {
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
