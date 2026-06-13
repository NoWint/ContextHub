use ignore::gitignore::GitignoreBuilder;
use std::path::Path;

const BUILTIN_IGNORE_PATTERNS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "__pycache__",
    ".venv",
    "venv",
    "/.env",
    ".DS_Store",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "Cargo.lock",
    "Gemfile.lock",
    "poetry.lock",
    "*.min.js",
    "*.min.css",
    "*.map",
];

pub struct FileFilter {
    gitignore: ignore::gitignore::Gitignore,
}

impl FileFilter {
    pub fn new(project_root: &Path) -> Result<Self, anyhow::Error> {
        let mut builder = GitignoreBuilder::new(project_root);
        for pattern in BUILTIN_IGNORE_PATTERNS {
            builder.add_line(None, pattern)?;
        }
        let gitignore_path = project_root.join(".gitignore");
        if gitignore_path.exists() {
            builder.add(&gitignore_path);
        }
        let gitignore = builder.build()?;
        Ok(Self { gitignore })
    }

    pub fn should_include(&self, path: &Path, is_dir: bool) -> bool {
        match self.gitignore.matched(path, is_dir) {
            ignore::Match::None => true,
            ignore::Match::Ignore(_) => false,
            ignore::Match::Whitelist(_) => true,
        }
    }
}
