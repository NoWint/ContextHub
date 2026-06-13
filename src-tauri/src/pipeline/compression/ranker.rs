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
    match &file.content {
        Some(content) => content.len() / 4,
        None => file.size_bytes.map(|s| s as usize / 4).unwrap_or(0),
    }
}
