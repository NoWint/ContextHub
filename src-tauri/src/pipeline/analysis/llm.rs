use crate::db::models::LlmConfig;
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
