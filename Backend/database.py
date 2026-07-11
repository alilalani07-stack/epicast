import sqlite3
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

DB_FILE = "epicast.db"

#Schema migrations

MIGRATIONS = [
    (1, """
        CREATE TABLE IF NOT EXISTS schema_version (
            version     INTEGER PRIMARY KEY,
            applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """),
    (2, """
        CREATE TABLE IF NOT EXISTS areas (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            area_id             TEXT    UNIQUE NOT NULL,
            area_name           TEXT    NOT NULL,
            facility_type       TEXT    NOT NULL DEFAULT 'clinic',
            lat                 REAL    NOT NULL,
            lon                 REAL    NOT NULL,
            population_density  INTEGER NOT NULL DEFAULT 0,
            state               TEXT    NOT NULL DEFAULT '',
            created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
        );
    """),
    (3, """
        CREATE TABLE IF NOT EXISTS reports (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type  TEXT    NOT NULL CHECK(report_type IN ('case', 'death')),
            area_id      TEXT    NOT NULL REFERENCES areas(area_id),
            disease_name TEXT    NOT NULL,
            count        INTEGER NOT NULL CHECK(count > 0),
            timestamp    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_reports_area_disease
            ON reports(area_id, disease_name);
        CREATE INDEX IF NOT EXISTS idx_reports_timestamp
            ON reports(timestamp);
    """),
    (4, """
        CREATE TABLE IF NOT EXISTS alerts (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            area_id      TEXT    NOT NULL REFERENCES areas(area_id),
            disease_name TEXT    NOT NULL,
            message      TEXT    NOT NULL,
            status       TEXT    NOT NULL DEFAULT 'new'
                             CHECK(status IN ('new', 'acknowledged', 'resolved')),
            created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedup
            ON alerts(area_id, disease_name)
            WHERE status = 'new';
    """),
    (5, """
        ALTER TABLE alerts ADD COLUMN severity TEXT NOT NULL DEFAULT 'moderate' 
            CHECK(severity IN ('critical', 'high', 'moderate'));
    """),
    (6, """
        ALTER TABLE reports ADD COLUMN clinic_id TEXT DEFAULT NULL;
    """),
    (7, """
        ALTER TABLE reports ADD COLUMN notes TEXT DEFAULT NULL;
        ALTER TABLE reports ADD COLUMN lat REAL DEFAULT NULL;
        ALTER TABLE reports ADD COLUMN lng REAL DEFAULT NULL;
    """),
]

#Connection management

def get_raw_connection() -> sqlite3.Connection:
    """Return a raw connection with row_factory set."""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # Better concurrency
    conn.execute("PRAGMA foreign_keys=ON")    # Enforce FK constraints
    return conn


@contextmanager
def get_db():
    """Context manager — yields a connection, commits on success, rolls back on error."""
    conn = get_raw_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

#Migrations

def run_migrations():
    """Apply any pending schema migrations in order."""
    with get_db() as conn:
        # Bootstrap: make sure schema_version table exists first
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version    INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.commit()

        applied = {row[0] for row in conn.execute("SELECT version FROM schema_version")}

        for version, sql in MIGRATIONS:
            if version in applied:
                continue
            logger.info(f"Applying migration v{version}…")
            # Use individual execute() calls instead of executescript().
            # executescript() issues an implicit COMMIT before running, which
            # breaks transactional guarantees: if the script fails halfway, the
            # partial changes are already committed but the version row is not,
            # causing the migration to re-run on next startup.
            for stmt in sql.strip().split(";"):
                stmt = stmt.strip()
                if stmt:
                    conn.execute(stmt)
            conn.execute(
                "INSERT INTO schema_version (version) VALUES (?)", (version,)
            )
            conn.commit()
            logger.info(f"Migration v{version} applied.")

    logger.info("✅ Database migrations complete.")

#Convenience helpers

def fetchone(conn: sqlite3.Connection, sql: str, params: tuple = ()):
    return conn.execute(sql, params).fetchone()


def fetchall(conn: sqlite3.Connection, sql: str, params: tuple = ()):
    return conn.execute(sql, params).fetchall()


def area_exists(conn: sqlite3.Connection, area_id: str) -> bool:
    row = fetchone(conn, "SELECT 1 FROM areas WHERE area_id = ?", (area_id,))
    return row is not None