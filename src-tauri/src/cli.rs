use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "contexthub", version, about = "AI project context management system")]
pub struct Cli {
    /// Path to project directory to import
    pub path: Option<String>,

    /// Export format (outputs to stdout and exits)
    #[arg(long, value_name = "FORMAT")]
    pub export: Option<String>,

    /// Compression level for export
    #[arg(long, default_value = "standard", value_name = "LEVEL")]
    pub compression: String,

    /// Show version
    #[arg(short, long)]
    pub version: bool,
}

impl Cli {
    pub fn parse_args() -> Self {
        Self::parse()
    }
}
