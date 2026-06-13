pub mod schema;
pub mod models;

use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn initialize(db_path: &Path) -> Result<Self, anyhow::Error> {
        let conn = Connection::open(db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let schema = include_str!("../../migrations/001_init.sql");
        conn.execute_batch(schema)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}
