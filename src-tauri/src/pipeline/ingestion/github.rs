use crate::db::models::ProjectSource;
use crate::pipeline::ingestion::local_folder::LocalFolderIngestion;
use crate::pipeline::traits::{IngestionAdapter, RawProject};
use std::process::Command;

pub struct GitHubIngestion;

impl IngestionAdapter for GitHubIngestion {
    fn ingest(&self, source: ProjectSource, project_id: String) -> Result<RawProject, anyhow::Error> {
        let (url, branch) = match &source {
            ProjectSource::GitHubRepo { url, branch } => (url.clone(), branch.clone()),
            _ => anyhow::bail!("GitHubIngestion only handles GitHubRepo source"),
        };

        let temp_dir = std::env::temp_dir().join(format!("contexthub-{}", project_id));
        if temp_dir.exists() {
            std::fs::remove_dir_all(&temp_dir)?;
        }

        let mut cmd = Command::new("git");
        cmd.arg("clone");
        cmd.arg("--depth").arg("1");
        if let Some(ref b) = branch {
            cmd.arg("--branch").arg(b);
        }
        cmd.arg(&url);
        cmd.arg(&temp_dir);

        let status = cmd.status()?;
        if !status.success() {
            anyhow::bail!("Failed to clone repository: {}", url);
        }

        let local_source = ProjectSource::LocalFolder {
            path: temp_dir.to_string_lossy().to_string(),
        };
        let local_ingestion = LocalFolderIngestion;
        let result = local_ingestion.ingest(local_source, project_id)?;

        let _ = std::fs::remove_dir_all(&temp_dir);

        Ok(result)
    }
}
