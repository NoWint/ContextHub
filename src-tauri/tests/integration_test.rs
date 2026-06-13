use tempfile::TempDir;

fn setup_test_db() -> (TempDir, rusqlite::Connection) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let conn = rusqlite::Connection::open(&db_path).unwrap();
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;").unwrap();
    let schema = include_str!("../migrations/001_init.sql");
    conn.execute_batch(schema).unwrap();
    (temp_dir, conn)
}

#[test]
fn test_project_crud() {
    let (_temp, conn) = setup_test_db();

    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path) VALUES ('test-1', 'Test Project', 'local', '/tmp/test')",
        [],
    ).unwrap();

    let name: String = conn
        .query_row("SELECT name FROM projects WHERE id = 'test-1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(name, "Test Project");

    conn.execute("DELETE FROM projects WHERE id = 'test-1'", []).unwrap();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
        .unwrap();
    assert_eq!(count, 0);
}

#[test]
fn test_file_storage() {
    let (_temp, conn) = setup_test_db();

    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path) VALUES ('p1', 'P', 'local', '/tmp')",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO files (id, project_id, path, language, size_bytes, content, is_entry) VALUES ('f1', 'p1', 'src/main.rs', 'Rust', 100, 'fn main() {}', 1)",
        [],
    ).unwrap();

    let path: String = conn
        .query_row("SELECT path FROM files WHERE id = 'f1'", [], |row| row.get(0))
        .unwrap();
    assert_eq!(path, "src/main.rs");
}

#[test]
fn test_analysis_versioning() {
    let (_temp, conn) = setup_test_db();

    conn.execute(
        "INSERT INTO projects (id, name, source_type, source_path) VALUES ('p1', 'P', 'local', '/tmp')",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO analyses (id, project_id, version, overview) VALUES ('a1', 'p1', 1, 'First analysis')",
        [],
    ).unwrap();

    conn.execute(
        "INSERT INTO analyses (id, project_id, version, overview) VALUES ('a2', 'p1', 2, 'Second analysis')",
        [],
    ).unwrap();

    let version: i64 = conn
        .query_row(
            "SELECT MAX(version) FROM analyses WHERE project_id = 'p1'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(version, 2);
}
