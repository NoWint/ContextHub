use crate::db::models::CompressionLevel;

pub fn max_tokens_for_level(level: &CompressionLevel) -> usize {
    match level {
        CompressionLevel::Minimal => 10_000,
        CompressionLevel::Standard => 30_000,
        CompressionLevel::Detailed => 60_000,
    }
}
