# Reference Data → SQLite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `open-football`'s embedded gzip-JSON reference-data blob (`database.db`) with an embedded SQLite file (`database.sqlite`), one table per entity type with a JSON `data` column, so clubs/players/leagues/etc. can be browsed and edited with any SQLite GUI tool without cloning `open-football-database` or rebuilding.

**Architecture:** `database/src/loaders/compiled.rs` is the only file that changes its data *source*. Every other loader (`club.rs`, `country.rs`, `league.rs`, `data_tree.rs`, etc.) keeps reading `compiled().<field>` exactly as today — they operate on the resulting `Vec<T>`s in memory and don't know or care where those came from. `core`, `soydt/engine-ffi`, and everything upstream of `database` are untouched.

**Tech Stack:** Rust, `rusqlite` (bundled SQLite, no system libsqlite3 dependency), `serde`/`serde_json` (already a dependency).

**Spec:** `docs/superpowers/specs/2026-08-16-reference-data-sqlite-design.md`

## Global Constraints

- Scope is reference data only (continents, countries, national competitions, domestic cups, leagues, clubs, names, players). Campaign/game-state persistence, `GameSession` multi-instance, and EF Core/Postgres are explicitly out of scope for this plan.
- Must not touch `open-football/src/core`, `soydt/engine-ffi`, or the FFI contract.
- Every other file under `open-football/src/database/src/loaders/` besides `compiled.rs` must be unmodified in its *logic* — the only permitted edits there are adding `Serialize` derives (needed so the migration step can write entities back out as JSON).
- The existing regression tests (`data_tree.rs`'s `embedded_tree_loads_leagues_and_clubs`: 94 enabled leagues, 1359 enabled clubs; `country.rs`'s `named_domestic_cups_resolve_onto_countries`) must pass unchanged after the swap — they're the proof the migration didn't lose or corrupt data.

---

### Task 1: Add Serialize derives, `rusqlite` dependency, and a one-time migration test that produces `database.sqlite`

**Files:**
- Modify: `open-football/src/database/src/loaders/club.rs`
- Modify: `open-football/src/database/src/loaders/country.rs`
- Modify: `open-football/src/database/src/loaders/continent.rs`
- Modify: `open-football/src/database/src/loaders/national.rs`
- Modify: `open-football/src/database/src/loaders/domestic_cup.rs`
- Modify: `open-football/src/database/src/loaders/league.rs`
- Modify: `open-football/src/database/src/loaders/names.rs`
- Modify: `open-football/src/database/src/loaders/players.rs`
- Modify: `open-football/src/database/Cargo.toml`
- Modify: `open-football/src/database/src/loaders/compiled.rs` (append a `#[cfg(test)]` migration module — the existing gzip-loading code stays untouched in this task)
- Create (as a build artifact, not hand-written): `open-football/src/database/src/data/database.sqlite`

**Interfaces:**
- Consumes: existing `compiled::decode(DATABASE_BYTES) -> Result<CompiledDatabase, String>` and `CompiledDatabase` struct (unchanged in this task).
- Produces: `open-football/src/database/src/data/database.sqlite`, an on-disk SQLite file with tables `meta`, `continents`, `countries`, `domestic_cups`, `national_competitions`, `leagues`, `clubs`, `names_by_country`, `players` — each (except `meta`) holding one row per entity with a `data` TEXT column containing that entity's JSON serialization. Task 2 consumes this file.

- [ ] **Step 1: Add `Serialize` derive to every entity struct that flows through `CompiledDatabase`**

Run from the repo root:

```bash
sed -i \
  -e 's/use serde::Deserialize;/use serde::{Deserialize, Serialize};/' \
  -E -e 's/(#\[derive\([^)]*)Deserialize/\1Serialize, Deserialize/' \
  open-football/src/database/src/loaders/club.rs \
  open-football/src/database/src/loaders/country.rs \
  open-football/src/database/src/loaders/continent.rs \
  open-football/src/database/src/loaders/national.rs \
  open-football/src/database/src/loaders/domestic_cup.rs \
  open-football/src/database/src/loaders/league.rs \
  open-football/src/database/src/loaders/names.rs \
  open-football/src/database/src/loaders/players.rs
```

This turns every `#[derive(Deserialize, Clone)]` (or `#[derive(Debug, Deserialize, Clone)]`, `#[derive(Debug, Clone, Deserialize)]` — order varies across files) into the same list plus `Serialize`, and updates each file's `use serde::Deserialize;` to `use serde::{Deserialize, Serialize};`. These entities only ever derived `Serialize`/`Deserialize` mechanically (no manual `impl` to keep in sync) — the migration step in Step 4 needs `Serialize` to write rows back out as JSON.

- [ ] **Step 2: Verify the crate still compiles**

```bash
cargo build --manifest-path open-football/src/database/Cargo.toml
```

Expected: builds with no errors (only the derives changed; no behavior changed yet).

- [ ] **Step 3: Add the `rusqlite` dependency, remove nothing yet**

```bash
cargo add rusqlite --features bundled --manifest-path open-football/src/database/Cargo.toml
```

Expected: `open-football/src/database/Cargo.toml` gains a `rusqlite = { version = "...", features = ["bundled"] }` line. `flate2` stays for now (Task 1's migration test still needs it — it reuses the *existing* gzip decoder to read today's `database.db`).

- [ ] **Step 4: Add the one-time migration test to `compiled.rs`**

Append this module at the end of `open-football/src/database/src/loaders/compiled.rs` (after the existing `decode` function and before/after the existing content — do not remove anything already in the file):

```rust
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
        let conn = Connection::open(out_path).expect("create database.sqlite");

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
                id INTEGER PRIMARY KEY, club_id INTEGER NOT NULL,
                country_id INTEGER NOT NULL, current_ability INTEGER NOT NULL,
                data TEXT NOT NULL
            );
            ",
        )
        .expect("create schema");

        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('version', ?1)",
            [SUPPORTED_VERSION],
        )
        .expect("insert version");

        for c in &db.continents {
            conn.execute(
                "INSERT INTO continents (id, name, data) VALUES (?1, ?2, ?3)",
                rusqlite::params![c.id, c.name, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.countries {
            conn.execute(
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
            conn.execute(
                "INSERT INTO domestic_cups (slug, country_slug, data) VALUES (?1, ?2, ?3)",
                rusqlite::params![c.slug, c.country_slug, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.national_competitions {
            conn.execute(
                "INSERT INTO national_competitions (id, scope, continent_id, data)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![
                    c.id, c.scope, c.continent_id, serde_json::to_string(c).unwrap()
                ],
            )
            .unwrap();
        }
        for c in &db.leagues {
            conn.execute(
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
            conn.execute(
                "INSERT INTO clubs (id, name, country_code, data) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![c.id, c.name, c.country_code, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.names {
            conn.execute(
                "INSERT INTO names_by_country (country_code, data) VALUES (?1, ?2)",
                rusqlite::params![c.country_code, serde_json::to_string(c).unwrap()],
            )
            .unwrap();
        }
        for c in &db.players {
            conn.execute(
                "INSERT INTO players (id, club_id, country_id, current_ability, data)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![
                    c.id, c.club_id, c.country_id, c.current_ability,
                    serde_json::to_string(c).unwrap()
                ],
            )
            .unwrap();
        }

        let file_len = std::fs::metadata(out_path).unwrap().len();
        println!("wrote {file_len} bytes to {out_path}");
        assert!(file_len > 0);
    }
}
```

Note: table names above (`continents`, `countries`, etc.) are hardcoded string literals at each call site inside this crate — never derived from external/user input — so building the `INSERT`/`CREATE TABLE` SQL with them is safe; all *values* go through bound `?` parameters.

- [ ] **Step 5: Run the migration test to produce `database.sqlite`**

```bash
cargo test --manifest-path open-football/src/database/Cargo.toml \
  --release -- --ignored migrate_database_to_sqlite
```

Expected: PASS, with a printed line like `wrote 4200000 bytes to .../src/data/database.sqlite`. Confirm the file now exists:

```bash
ls -la open-football/src/database/src/data/database.sqlite
```

- [ ] **Step 6: Sanity-check the produced file with a query**

```bash
sqlite3 open-football/src/database/src/data/database.sqlite \
  "SELECT (SELECT count(*) FROM clubs), (SELECT count(*) FROM players), (SELECT value FROM meta WHERE key='version');"
```

Expected: club count and player count are non-zero and roughly match what's in the old `database.db` (clubs should be well above 1359, since this table holds *all* clubs including ones in disabled leagues — `data_tree.rs` does that filtering downstream, not this table); version prints `1.0`.

- [ ] **Step 7: Commit**

```bash
git add open-football/src/database/src/loaders/*.rs \
        open-football/src/database/Cargo.toml \
        open-football/src/database/Cargo.lock \
        open-football/src/database/src/data/database.sqlite
git commit -m "$(cat <<'EOF'
Add Serialize derives + one-time migration test producing database.sqlite

Reference-data entities need Serialize (alongside the existing
Deserialize) so the migration step can round-trip them into the new
SQLite file's per-row JSON `data` column. The migration test itself is
#[ignore]d — a one-time tool, not part of the regular suite.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Switch `compiled()` to read from `database.sqlite`; retire the gzip path

**Files:**
- Modify: `open-football/src/database/src/loaders/compiled.rs` (rewrite the public loading code; remove the migration test module added in Task 1 and the old `decode`/gzip code)
- Modify: `open-football/src/database/build.rs`
- Modify: `open-football/src/database/Cargo.toml` (remove `flate2`)
- Delete: `open-football/src/database/src/data/database.db`

**Interfaces:**
- Consumes: `open-football/src/database/src/data/database.sqlite` (produced in Task 1).
- Produces: `pub fn compiled() -> &'static CompiledDatabase` with the **same public shape** as before (`continents`, `countries`, `national_competitions`, `domestic_cups`, `leagues`, `clubs`, `names`, `players` — all `Vec<T>`, `version` field dropped since nothing outside this file ever read it) and `pub fn country_id_for_code(code: &str) -> u32` — both signatures unchanged, so every other loader file needs zero changes.

- [ ] **Step 1: Replace the entire contents of `open-football/src/database/src/loaders/compiled.rs`**

```rust
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
```

- [ ] **Step 2: Update `build.rs` to watch the new file**

In `open-football/src/database/build.rs`, replace:

```rust
    println!("cargo:rerun-if-changed=src/data/database.db");
```

with:

```rust
    println!("cargo:rerun-if-changed=src/data/database.sqlite");
```

- [ ] **Step 3: Remove the now-unused `flate2` dependency**

```bash
cargo remove flate2 --manifest-path open-football/src/database/Cargo.toml
```

- [ ] **Step 4: Delete the old gzip blob**

```bash
git rm open-football/src/database/src/data/database.db
```

- [ ] **Step 5: Build, then run the full existing test suite as the regression check**

```bash
cargo build --manifest-path open-football/src/database/Cargo.toml
cargo test --manifest-path open-football/src/database/Cargo.toml
```

Expected: builds clean (no leftover `flate2`/`decode` references anywhere — the compiler will error if any other file still called something removed from `compiled.rs`, but nothing should, since only `compiled()` and `country_id_for_code` were public from this module and both kept their signatures). Both pre-existing tests pass unchanged:
- `data_tree::tests::embedded_tree_loads_leagues_and_clubs` — asserts `tree.leagues.len() == 94` and `tree.clubs.len() == 1359`.
- `country::tests::named_domestic_cups_resolve_onto_countries` — asserts England→"FA Cup", Spain→"Copa del Rey", Italy→"Coppa Italia", Germany→"DFB-Pokal", Afghanistan→`None`.

If either fails, the JSON round-trip through a table lost or altered data for that entity — stop and compare the failing entity's row (`sqlite3 database.sqlite "SELECT data FROM leagues WHERE id = ..."`) against what the old `database.db` produced, rather than adjusting the test expectations.

- [ ] **Step 6: Commit**

```bash
git add open-football/src/database/src/loaders/compiled.rs \
        open-football/src/database/build.rs \
        open-football/src/database/Cargo.toml \
        open-football/src/database/Cargo.lock
git commit -m "$(cat <<'EOF'
Switch reference-data loading from gzip blob to embedded SQLite

compiled() now reads open-football's reference data (clubs, players,
leagues, etc.) from database.sqlite instead of the gzip-compressed
JSON blob built by open-football-database's compiler. Every other
loader in this crate is unchanged — they still just read
compiled().<field>, unaware of the storage swap. The compiler repo
is no longer a required build step; the SQLite file can be opened
and edited directly with any SQLite browser.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

(The `git rm` from Step 4 already staged `database.db`'s deletion — `git commit` picks up everything staged, not just the paths passed to `git add`, so the deletion lands in this same commit.)
