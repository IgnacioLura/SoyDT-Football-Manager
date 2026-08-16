//! Embedded compiled database (`database.db`).
//!
//! The whole game database — continents, countries, national competitions,
//! leagues, clubs, names, players — is built by `open-football-database/compiler`
//! into a single gzip-compressed JSON document and embedded at compile time.
//!
//! Parsing happens exactly once per process via [`OnceLock`]; every `*Loader`
//! reads from the cached [`CompiledDatabase`].

use std::io::Read;
use std::sync::OnceLock;

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

static DATABASE_BYTES: &[u8] = include_bytes!("../data/database.db");

#[derive(Deserialize)]
pub struct CompiledDatabase {
    pub version: String,
    pub continents: Vec<ContinentEntity>,
    pub countries: Vec<CountryEntity>,
    pub national_competitions: Vec<NationalCompetitionEntity>,
    /// Named domestic cups, keyed by country slug. Optional — older
    /// databases predate the field and parse to an empty list.
    #[serde(default)]
    pub domestic_cups: Vec<DomesticCupEntity>,
    pub leagues: Vec<LeagueEntity>,
    pub clubs: Vec<ClubEntity>,
    pub names: Vec<NamesByCountryEntity>,
    pub players: Vec<OdbPlayer>,
}

static DB: OnceLock<CompiledDatabase> = OnceLock::new();

/// Shared reference to the decompressed, parsed database. First call parses;
/// subsequent calls return the cached result. Panics if the embedded file is
/// missing, malformed, or carries an unsupported version — all compile-time
/// correctness issues that should never reach a release binary.
pub fn compiled() -> &'static CompiledDatabase {
    DB.get_or_init(|| match decode(DATABASE_BYTES) {
        Ok(db) => db,
        Err(e) => panic!("failed to load embedded database.db: {e}"),
    })
}

fn decode(compressed: &[u8]) -> Result<CompiledDatabase, String> {
    let mut dec = flate2::read::GzDecoder::new(compressed);
    let mut json = String::new();
    dec.read_to_string(&mut json)
        .map_err(|e| format!("gunzip: {e}"))?;
    let parsed: CompiledDatabase =
        serde_json::from_str(&json).map_err(|e| format!("parse: {e}"))?;
    if parsed.version != SUPPORTED_VERSION {
        return Err(format!(
            "unsupported database.db version '{}' (expected '{}')",
            parsed.version, SUPPORTED_VERSION
        ));
    }
    Ok(parsed)
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

#[cfg(test)]
mod migrate_to_sqlite {
    use super::*;
    use rusqlite::Connection;

    /// One-time migration: decode the existing gzip `database.db` and write
    /// its contents into a fresh SQLite file at `src/data/database.sqlite`,
    /// one table per top-level entity, each row storing the entity as a
    /// JSON `data` column. Not part of the normal test suite — run
    /// explicitly once:
    ///   cargo test --manifest-path open-football/src/database/Cargo.toml \
    ///     --release -- --ignored migrate_database_to_sqlite
    #[test]
    #[ignore]
    fn migrate_database_to_sqlite() {
        let db = decode(DATABASE_BYTES).expect("decode existing database.db");

        let out_path = concat!(env!("CARGO_MANIFEST_DIR"), "/src/data/database.sqlite");
        let _ = std::fs::remove_file(out_path);
        let mut conn = Connection::open(out_path).expect("create database.sqlite");

        conn.execute_batch(
            "
            CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE continents (
                id INTEGER PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL
            );
            CREATE TABLE countries (
                id INTEGER PRIMARY KEY, code TEXT NOT NULL, slug TEXT NOT NULL,
                name TEXT NOT NULL, continent_id INTEGER NOT NULL, data TEXT NOT NULL
            );
            CREATE TABLE domestic_cups (
                slug TEXT PRIMARY KEY, country_slug TEXT NOT NULL, data TEXT NOT NULL
            );
            CREATE TABLE national_competitions (
                id INTEGER PRIMARY KEY, scope TEXT NOT NULL, continent_id INTEGER,
                data TEXT NOT NULL
            );
            CREATE TABLE leagues (
                id INTEGER PRIMARY KEY, slug TEXT NOT NULL, country_code TEXT NOT NULL,
                enabled INTEGER NOT NULL, tier INTEGER NOT NULL, data TEXT NOT NULL
            );
            CREATE TABLE clubs (
                id INTEGER PRIMARY KEY, name TEXT NOT NULL, country_code TEXT NOT NULL,
                data TEXT NOT NULL
            );
            CREATE TABLE names_by_country (
                country_code TEXT PRIMARY KEY, data TEXT NOT NULL
            );
            CREATE TABLE players (
                id INTEGER NOT NULL, club_id INTEGER NOT NULL,
                country_id INTEGER NOT NULL, current_ability INTEGER NOT NULL,
                data TEXT NOT NULL
            );
            CREATE INDEX idx_players_id ON players(id);
            ",
        )
        .expect("create schema");

        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('version', ?1)",
            [SUPPORTED_VERSION],
        )
        .expect("insert version");

        // One transaction for every row insert below — tens of thousands of
        // players otherwise means tens of thousands of autocommits, which is
        // dominated by fsync overhead rather than actual work.
        let tx = conn.transaction().expect("begin transaction");

        for c in &db.continents {
            tx.execute(
                "INSERT INTO continents (id, name, data) VALUES (?1, ?2, ?3)",
                rusqlite::params![c.id, c.name, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.countries {
            tx.execute(
                "INSERT INTO countries (id, code, slug, name, continent_id, data)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    c.id, c.code, c.slug, c.name, c.continent_id,
                    serde_json::to_string(c).unwrap()
                ],
            )
            .unwrap();
        }
        for c in &db.domestic_cups {
            tx.execute(
                "INSERT INTO domestic_cups (slug, country_slug, data) VALUES (?1, ?2, ?3)",
                rusqlite::params![c.slug, c.country_slug, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.national_competitions {
            tx.execute(
                "INSERT INTO national_competitions (id, scope, continent_id, data)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![
                    c.id, c.scope, c.continent_id, serde_json::to_string(c).unwrap()
                ],
            )
            .unwrap();
        }
        for c in &db.leagues {
            tx.execute(
                "INSERT INTO leagues (id, slug, country_code, enabled, tier, data)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    c.id, c.slug, c.country_code, c.enabled, c.tier,
                    serde_json::to_string(c).unwrap()
                ],
            )
            .unwrap();
        }
        for c in &db.clubs {
            tx.execute(
                "INSERT INTO clubs (id, name, country_code, data) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![c.id, c.name, c.country_code, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.names {
            tx.execute(
                "INSERT INTO names_by_country (country_code, data) VALUES (?1, ?2)",
                rusqlite::params![c.country_code, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.players {
            tx.execute(
                "INSERT INTO players (id, club_id, country_id, current_ability, data)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    c.id, c.club_id, c.country_id, c.current_ability,
                    serde_json::to_string(c).unwrap()
                ],
            )
            .unwrap();
        }

        tx.commit().expect("commit transaction");

        let file_len = std::fs::metadata(out_path).unwrap().len();
        println!("wrote {file_len} bytes to {out_path}");
        assert!(file_len > 0);
    }
}
