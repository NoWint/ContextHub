// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use contexthub_lib::cli::Cli;
use std::process;

fn main() {
    let cli = Cli::parse_args();

    if cli.version {
        println!("ContextHub {}", env!("CARGO_PKG_VERSION"));
        return;
    }

    // If --export is specified, run in CLI mode (no GUI)
    if let Some(format) = cli.export {
        match contexthub_lib::run_cli_export(&cli.path, &format, &cli.compression) {
            Ok(output) => {
                println!("{}", output);
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                process::exit(1);
            }
        }
        return;
    }

    // Otherwise, launch the GUI app
    contexthub_lib::run();
}
