//! Embedded compiled database (`database.sqlite`).
//!
//! The whole game database — continents, countries, national competitions,
//! domestic cups, leagues, clubs, names, players — lives in a SQLite file
//! embedded at compile time. One table per entity, each row storing the
//! entity's JSON representation in a `data` column (see
//! `docs/superpowers/specs/2026-08-16-reference-data-sqlite-design.md`).
//! Unlike the old gzip blob this replaced, the file can be opened and
//! edited directly with any SQLite browser (DB Browser for SQLite,
//! DBeaver) — no `open-football-database` compiler step required.
//!
//! Parsing happens exactly once per process via [`OnceLock`]; every
//! `*Loader` reads from the cached [`CompiledDatabase`].

use std::sync::OnceLock;

use rusqlite::Connection;
use serde::Deserialize;

use super::club::ClubEntity;
use super::continent::ContinentEntity;
use super::country::CountryEntity;
use super::domestic_cup::DomesticCupEntity;
use super::league::LeagueEntity;
use super::names::NamesByCountryEntity;
use super::national::NationalCompetitionEntity;
use super::players::OdbPlayer;

pub const SUPPORTED_VERSION: &str = "1.0";

static DATABASE_BYTES: &[u8] = include_bytes!("../data/database.sqlite");

pub struct CompiledDatabase {
    pub continents: Vec<ContinentEntity>,
    pub countries: Vec<CountryEntity>,
    pub national_competitions: Vec<NationalCompetitionEntity>,
    pub domestic_cups: Vec<DomesticCupEntity>,
    pub leagues: Vec<LeagueEntity>,
    pub clubs: Vec<ClubEntity>,
    pub names: Vec<NamesByCountryEntity>,
    pub players: Vec<OdbPlayer>,
}

static DB: OnceLock<CompiledDatabase> = OnceLock::new();

/// Shared reference to the loaded database. First call opens the embedded
/// SQLite file and reads every table; subsequent calls return the cached
/// result. Panics if the embedded file is missing, malformed, or carries
/// an unsupported `meta.version` — all compile-time correctness issues
/// that should never reach a release binary.
pub fn compiled() -> &'static CompiledDatabase {
    DB.get_or_init(|| match load() {
        Ok(db) => db,
        Err(e) => panic!("failed to load embedded database.sqlite: {e}"),
    })
}

fn load() -> Result<CompiledDatabase, String> {
    let conn = open_embedded_connection()?;

    let version: String = conn
        .query_row("SELECT value FROM meta WHERE key = 'version'", [], |row| {
            row.get(0)
        })
        .map_err(|e| format!("read meta.version: {e}"))?;
    if version != SUPPORTED_VERSION {
        return Err(format!(
            "unsupported database.sqlite version '{version}' (expected '{SUPPORTED_VERSION}')"
        ));
    }

    Ok(CompiledDatabase {
        continents: query_all(&conn, "continents")?,
        countries: query_all(&conn, "countries")?,
        national_competitions: query_all(&conn, "national_competitions")?,
        domestic_cups: query_all(&conn, "domestic_cups")?,
        leagues: query_all(&conn, "leagues")?,
        clubs: query_all(&conn, "clubs")?,
        names: query_all(&conn, "names_by_country")?,
        players: query_all(&conn, "players")?,
    })
}

/// The embedded bytes are a full SQLite file, but `rusqlite` needs a real
/// filesystem path to open — write them to a per-process temp file once,
/// then open it normally. Cheap: this only runs the first time
/// `compiled()` is called (cached behind the `OnceLock` above).
fn open_embedded_connection() -> Result<Connection, String> {
    let mut path = std::env::temp_dir();
    path.push(format!(
        "open_football_reference_{}.sqlite",
        std::process::id()
    ));
    std::fs::write(&path, DATABASE_BYTES).map_err(|e| format!("write temp db: {e}"))?;
    Connection::open(&path).map_err(|e| format!("open sqlite: {e}"))
}

/// `table` is always one of the hardcoded literals passed at the call
/// sites in `load()` above — never external input — so interpolating it
/// into the query text is safe; every actual *value* still goes through
/// `rusqlite`'s row decoding, not string formatting.
fn query_all<T: for<'de> Deserialize<'de>>(
    conn: &Connection,
    table: &str,
) -> Result<Vec<T>, String> {
    let sql = format!("SELECT data FROM {table}");
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("prepare {table}: {e}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("query {table}: {e}"))?;
    rows.map(|r| {
        let json = r.map_err(|e| format!("row {table}: {e}"))?;
        serde_json::from_str::<T>(&json).map_err(|e| format!("parse {table} row: {e}"))
    })
    .collect()
}

/// Resolve a country code like "mt" → its numeric id. Returns 0 when the code
/// is empty or unknown (matching the old loader's silent-fallback behaviour).
pub fn country_id_for_code(code: &str) -> u32 {
    if code.is_empty() {
        return 0;
    }
    compiled()
        .countries
        .iter()
        .find(|c| c.code == code)
        .map(|c| c.id)
        .unwrap_or(0)
}
