//! Game-state lifecycle: create a world, advance it by N days, and read back
//! a hand-built JSON snapshot. `SimulatorData` carries no `Serialize` derive
//! (see `open-football`'s `core::simulator::data`) and is a full deep-clone-
//! sized world graph, so .NET never receives it directly — only opaque
//! handles and projected snapshot DTOs, same pattern as `r#match`'s
//! `JsonPlayerAttributes`.

use crate::contract::run_guarded;
use crate::strings::{read, to_owned_ptr};
use core::{FootballSimulator, SimulatorData};
use database::{DatabaseEntity, DatabaseGenerator, DatabaseLoader};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::future::Future;
use std::os::raw::c_char;
use std::pin::pin;
use std::task::{Context, Poll, Waker};

/// Opaque handle to a live `SimulatorData`. Owned exclusively by whichever
/// .NET singleton holds the pointer; not safe to share across concurrent
/// calls without external synchronization (mirrors the single-instance,
/// no-multi-tenant nature of the original app — `SoyDT.Engine` should guard
/// access with its own lock if it exposes concurrent request handling).
pub struct GameHandle {
    data: SimulatorData,
    /// DT lineup formation slots, keyed by team id — see `team_lineup.rs`.
    /// `SimulatorData`/`Player` have no notion of "formation slot" (only the
    /// sticky `is_force_match_selection` pin, which doesn't say *where* a
    /// pinned player was placed), so the ordered slot assignment the DT
    /// actually chose is tracked here instead, alongside the data it
    /// describes — travels with `engine_clone_game` and vanishes with
    /// `engine_free_game`, same lifetime as everything else on the handle.
    pub(crate) lineup_order: HashMap<u32, Vec<u32>>,
}

impl GameHandle {
    /// Wraps an already-built `SimulatorData` in a handle — used by
    /// `save.rs`'s `engine_load_game`, which constructs `SimulatorData` via
    /// bincode deserialization rather than `DatabaseGenerator::generate`.
    pub(crate) fn from_data(data: SimulatorData) -> Self {
        GameHandle { data, lineup_order: HashMap::new() }
    }

    pub(crate) fn data(&self) -> &SimulatorData {
        &self.data
    }

    /// Mutable access for exports that write world state directly rather
    /// than advancing the simulation (e.g. `watchlist.rs`'s add/remove —
    /// mirrors the original's `Arc::make_mut(&mut arc_data).watchlist.push(...)`).
    pub(crate) fn data_mut(&mut self) -> &mut SimulatorData {
        &mut self.data
    }
}

/// `FootballSimulator::simulate` is declared `async` but never awaits an I/O
/// point — it drives rayon internally and the future is ready on its first
/// poll (see `open-football/.dev/simulate`, which documents and relies on
/// the same fact). A no-op-waker `block_on` completes it in one step with no
/// tokio runtime needed inside this cdylib.
fn block_on<F: Future>(future: F) -> F::Output {
    let mut future = pin!(future);
    let waker = Waker::noop();
    let mut cx = Context::from_waker(waker);
    loop {
        if let Poll::Ready(output) = future.as_mut().poll(&mut cx) {
            return output;
        }
        std::hint::spin_loop();
    }
}

/// Creates a fresh world: loads the embedded database (baked into `core`'s
/// and `database`'s binaries via `include_bytes!` — no working directory or
/// external data files needed) and procedurally generates continents,
/// countries, clubs and players from it.
///
/// Returns null if generation panics; check `engine_ffi`'s logs / caller-side
/// diagnostics rather than treating this as a recoverable JSON error, since
/// there's no live handle yet to attach an error envelope to.
///
/// # Safety
/// The returned pointer, if non-null, must eventually be passed to
/// `engine_free_game` exactly once, and to no other function after that.
#[unsafe(no_mangle)]
pub extern "C" fn engine_create_game() -> *mut GameHandle {
    let result = std::panic::catch_unwind(|| {
        let database = DatabaseLoader::load();
        DatabaseGenerator::generate(&database)
    });

    match result {
        Ok(data) => Box::into_raw(Box::new(GameHandle { data, lineup_order: HashMap::new() })),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Prunes a loaded `DatabaseEntity` down to only the given countries (by
/// ISO country code, case-insensitive), and within them to only tier-1
/// leagues, before generation — so dev/test runs don't pay for procedurally
/// generating and simulating the entire world (all continents, every
/// division) just to exercise the MVP's one flight per country. Keeps
/// referential integrity: continents/leagues/clubs are retained only if
/// they belong to a kept country's continent/country id (and, for
/// leagues/clubs, a kept tier-1 league) — see `database`'s `CountryEntity`/
/// `LeagueEntity`/`ClubEntity`, whose `country_id`/`continent_id`/`league_id`
/// fields this filters on. `national_competitions`/`names_by_country` are
/// left unfiltered — both already no-op safely against a pruned
/// country/continent set inside `DatabaseGenerator::generate` (matched
/// against the same ids there), so pruning them here would be redundant,
/// not required for correctness. Dropping tier 2+ entirely is safe against
/// promotion/relegation: `CountryResult::paired_promotion_league` already
/// falls back to `None`/skip when a tier's paired lower league doesn't
/// exist (the common case for any country that only has one tier to begin
/// with), so a missing tier 2 just means tier 1 never relegates anyone —
/// no panic, no orphaned reference.
fn scope_to_countries(data: &mut DatabaseEntity, country_codes: &[String]) {
    let wanted: HashSet<String> = country_codes.iter().map(|c| c.to_uppercase()).collect();

    let country_ids: HashSet<u32> = data
        .countries
        .iter()
        .filter(|c| wanted.contains(&c.code.to_uppercase()))
        .map(|c| c.id)
        .collect();

    let continent_ids: HashSet<u32> = data
        .countries
        .iter()
        .filter(|c| country_ids.contains(&c.id))
        .map(|c| c.continent_id)
        .collect();

    data.continents.retain(|c| continent_ids.contains(&c.id));
    data.countries.retain(|c| country_ids.contains(&c.id));
    data.leagues.retain(|l| country_ids.contains(&l.country_id) && l.tier == 1);

    let league_ids: HashSet<u32> = data.leagues.iter().map(|l| l.id).collect();
    data.clubs.retain(|c| {
        country_ids.contains(&c.country_id)
            && c.teams.iter().any(|t| t.league_id.is_some_and(|id| league_ids.contains(&id)))
    });
}

/// Same as `engine_create_game`, but scopes world generation to the given
/// ISO country codes (JSON array of strings, e.g. `["AR","UY","BR"]`) —
/// much faster to create and to `engine_process_days` against for dev/test
/// iteration than the full ~68-country world. An empty array behaves like
/// the unscoped `engine_create_game`.
///
/// # Safety
/// `country_codes_json` must be a valid NUL-terminated C string, and the
/// returned pointer (if non-null) must eventually reach `engine_free_game`
/// exactly once.
#[unsafe(no_mangle)]
pub extern "C" fn engine_create_scoped_game(country_codes_json: *const c_char) -> *mut GameHandle {
    let codes_json = unsafe { read(country_codes_json) };

    let result = std::panic::catch_unwind(|| {
        let codes: Vec<String> = serde_json::from_str(&codes_json).unwrap_or_default();
        let mut database = DatabaseLoader::load();
        if !codes.is_empty() {
            scope_to_countries(&mut database, &codes);
        }
        DatabaseGenerator::generate(&database)
    });

    match result {
        Ok(data) => Box::into_raw(Box::new(GameHandle { data, lineup_order: HashMap::new() })),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Deep-clones the world behind `handle` into a brand-new, independent
/// handle — lets `SoyDT.Engine`'s `GameSession` mutate a private working
/// copy (advancing days) while every concurrent read keeps serving the
/// still-published original handle, then atomically swap the working copy
/// in once it's done. Mirrors the original Axum app's own
/// `Arc::unwrap_or_clone` deep-clone-then-swap pattern in
/// `web/src/game/process.rs`, just via an explicit clone instead of an Arc.
/// `SimulatorData` already derives `Clone` in `core`, so this is a plain
/// struct clone — no new engine-side state machinery.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`. Returns null if `handle` is null or the
/// clone panics.
#[unsafe(no_mangle)]
pub extern "C" fn engine_clone_game(handle: *mut GameHandle) -> *mut GameHandle {
    if handle.is_null() {
        return std::ptr::null_mut();
    }
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let game = unsafe { &*handle };
        (game.data().clone(), game.lineup_order.clone())
    }));

    match result {
        Ok((data, lineup_order)) => Box::into_raw(Box::new(GameHandle { data, lineup_order })),
        Err(_) => std::ptr::null_mut(),
    }
}

/// Releases a handle previously returned by `engine_create_game`.
///
/// # Safety
/// `handle` must be a pointer previously returned by `engine_create_game`
/// and not already freed.
#[unsafe(no_mangle)]
pub extern "C" fn engine_free_game(handle: *mut GameHandle) {
    if handle.is_null() {
        return;
    }
    unsafe {
        drop(Box::from_raw(handle));
    }
}

#[derive(Serialize)]
struct ProcessResult {
    date: String,
    days_processed: u32,
    matches_played: u64,
}

/// Advances `handle`'s world by `days` simulated days, one
/// `FootballSimulator::simulate` tick per day (matches `ProcessingRun::execute`'s
/// day-loop in the original web crate — the engine itself only ticks one day
/// at a time). Returns a JSON envelope; use `free_string` on the result.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_process_days(handle: *mut GameHandle, days: u32) -> *mut c_char {
    let json = run_guarded("engine_process_days", || -> Result<ProcessResult, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &mut *handle };

        let mut matches_played: u64 = 0;
        for _ in 0..days {
            let result = block_on(FootballSimulator::simulate(&mut game.data));
            matches_played += result.match_results.len() as u64;
        }

        Ok(ProcessResult {
            date: game.data.date.date().to_string(),
            days_processed: days,
            matches_played,
        })
    });

    to_owned_ptr(json)
}

#[derive(Serialize)]
struct ContinentSummary {
    id: u32,
    name: String,
    country_count: usize,
}

#[derive(Serialize)]
struct SnapshotResult {
    date: String,
    continents: Vec<ContinentSummary>,
}

#[derive(Serialize)]
struct CountryListItem {
    id: u32,
    code: String,
    slug: String,
    name: String,
    continent_id: u32,
    continent_name: String,
    league_count: usize,
}

/// Returns every country across the world (or the scoped subset, if the
/// game was created via `engine_create_scoped_game`) as a flat list — the
/// data behind React's countries index page (mirrors the original app's
/// `/{lang}/countries` route). Hand-projected DTO, same reasoning as
/// `SnapshotResult`: `core::Country`/`Continent` carry no serde derive and
/// are too large/internal to expose directly.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_countries(handle: *mut GameHandle) -> *mut c_char {
    let json = run_guarded("engine_get_countries", || -> Result<Vec<CountryListItem>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let mut countries: Vec<CountryListItem> = game
            .data
            .continents
            .iter()
            .flat_map(|continent| {
                continent.countries.iter().map(move |country| CountryListItem {
                    id: country.id,
                    code: country.code.clone(),
                    slug: country.slug.clone(),
                    name: country.name.clone(),
                    continent_id: continent.id,
                    continent_name: continent.name.clone(),
                    league_count: country.leagues.leagues.len(),
                })
            })
            .collect();

        countries.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(countries)
    });

    to_owned_ptr(json)
}

/// Returns a minimal JSON snapshot of `handle`'s current world state — the
/// simulated date and a per-continent country count. Deliberately small for
/// Phase 0 (proves the create → process → read-back pipe end to end); grows
/// into richer per-feature-area DTOs as the React pages that need them come
/// online, same hand-projected-DTO pattern as `r#match`'s squad JSON, never
/// a wholesale serialization of `SimulatorData` (it has no serde derive and
/// is too large/internal to expose directly).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_snapshot(handle: *mut GameHandle) -> *mut c_char {
    let json = run_guarded("engine_get_snapshot", || -> Result<SnapshotResult, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let continents = game
            .data
            .continents
            .iter()
            .map(|c| ContinentSummary {
                id: c.id,
                name: c.name.clone(),
                country_count: c.countries.len(),
            })
            .collect();

        Ok(SnapshotResult {
            date: game.data.date.date().to_string(),
            continents,
        })
    });

    to_owned_ptr(json)
}
