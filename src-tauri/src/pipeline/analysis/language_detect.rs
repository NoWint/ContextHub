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
