//! Production FFI boundary between .NET (`SoyDT.Engine`) and the vendored
//! `open-football` Rust engine. Evolves `ffi-spike`'s proof-of-concept into a
//! hardened contract: every export is panic-safe, every JSON response uses
//! the same `{ok, data, error}` envelope, and `SimulatorData` — the whole
//! game world — stays owned on the Rust side behind an opaque handle. .NET
//! never touches game-state fields directly; it always round-trips through
//! JSON snapshots this crate serializes on demand.

mod ai_tools;
mod awards;
mod contract;
mod continental;
mod cups;
mod game;
mod league;
mod league_schedule;
mod r#match;
mod match_detail;
mod national_team;
mod player;
mod player_awards;
mod player_contract;
mod player_events;
mod player_history;
mod player_matches;
mod player_personal;
mod player_relations;
mod player_transfers;
mod staff;
mod staff_personal;
mod strings;
mod team;
mod team_academy;
mod team_board;
mod team_finances;
mod team_relations;
mod team_schedule;
mod team_scouting;
mod team_stats;
mod team_staff;
mod team_lineup;
mod team_tactics;
mod team_transfer_action;
mod team_transfers;
mod transfers;
mod watchlist;
mod search;
mod save;

pub use contract::CONTRACT_VERSION;

use std::os::raw::c_char;

/// Returns the contract version `SoyDT.Engine` should assert against at
/// startup. A mismatch means the .NET-side DTOs and this crate's JSON shapes
/// have drifted and must not be trusted to round-trip silently.
#[unsafe(no_mangle)]
pub extern "C" fn engine_ffi_contract_version() -> u32 {
    CONTRACT_VERSION
}

/// Frees any string returned by this crate (game or match functions alike).
/// One export for all of them — callers don't need to remember which
/// allocator produced a given pointer.
#[unsafe(no_mangle)]
pub extern "C" fn free_string(s: *mut c_char) {
    strings::free(s);
}

// Re-exported at the crate root so `#[unsafe(no_mangle)]` sees them as top-level
// symbols (Rust's C ABI doesn't mangle module paths, but keeping the
// `extern "C"` fns declared in their own files keeps this file a table of
// contents).
pub use game::{
    engine_clone_game, engine_create_game, engine_create_scoped_game, engine_free_game,
    engine_get_countries, engine_get_snapshot, engine_process_days,
};
pub use awards::engine_get_league_awards;
pub use league::{engine_get_league_table, engine_get_leagues};
pub use league_schedule::engine_get_league_schedule;
pub use transfers::engine_get_league_transfers;
pub use national_team::{
    engine_get_free_agents, engine_get_national_schedule, engine_get_national_squad,
    engine_get_national_staff,
};
pub use player::engine_get_player;
pub use player_contract::engine_get_player_contract;
pub use player_history::engine_get_player_history;
pub use staff::engine_get_staff;
pub use staff_personal::engine_get_staff_personal;
pub use team::engine_get_team;
pub use team_schedule::engine_get_team_schedule;
pub use team_transfers::engine_get_team_transfers;
pub use r#match::{
    engine_simulate_from_json, engine_simulate_match_full, engine_simulate_match_full_with_positions,
    engine_simulate_spike_match,
};
pub use match_detail::engine_simulate_team_match;
pub use ai_tools::{engine_ai_get_club, engine_ai_get_club_players, engine_ai_get_player};
pub use watchlist::{engine_get_watchlist, engine_watchlist_add, engine_watchlist_remove};
pub use search::engine_search;
pub use cups::{engine_get_cup_bracket, engine_get_cups};
pub use continental::engine_get_continental_competition;
pub use save::{engine_load_game, engine_save_game};
