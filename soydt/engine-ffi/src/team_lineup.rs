//! DT/"Mi Equipo" lineup export — lets a human user's chosen starting XI
//! actually influence match-day squad selection, unlike `team_tactics.rs`'s
//! read-only, freshly-computed "best XI" projection.
//!
//! Reuses the engine's EXISTING "force-selection pin" mechanism
//! (`Player::is_force_match_selection`, already read by the AI coach's own
//! squad-selection scoring — see `core::match::squad::selection::scoring`)
//! rather than adding any new selection logic: setting the flag on 11
//! players is enough to make the real match-day selector strongly prefer
//! them over its own auto-picked XI. This is a scoring bias, not an exact
//! formation-slot lock — the engine's own slot assigner still decides which
//! position each pinned player fills.
//!
//! Sticky by design: a saved lineup stays pinned for every subsequent match
//! until the DT saves a new one (no per-match reset) — simplest persistence
//! model, and it's what `install_permanent_contract`'s existing pin-clear-on-
//! transfer behavior already assumes ("a stale pin must not block a move").

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::{read, to_owned_ptr};
use serde::{Deserialize, Serialize};
use std::os::raw::c_char;

#[derive(Serialize)]
struct LineupPlayerJson {
    player_id: u32,
    name: String,
    position: String,
    current_ability: u8,
    shirt_number: Option<u8>,
    pinned: bool,
}

/// Current squad for `team_id` with each player's pin state, so the
/// frontend can pre-populate a previously-saved lineup (or show none set).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_lineup(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_lineup", || -> Result<Vec<LineupPlayerJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.id == team_id) {
                    let players = team
                        .players
                        .players
                        .iter()
                        .map(|p| LineupPlayerJson {
                            player_id: p.id,
                            name: format!("{} {}", p.full_name.first_name, p.full_name.last_name),
                            position: p.positions.primary().map(|pos| format!("{pos:?}")).unwrap_or_else(|| "Unknown".to_string()),
                            current_ability: p.player_attributes.current_ability,
                            shirt_number: p.contract.as_ref().and_then(|c| c.shirt_number),
                            pinned: p.is_force_match_selection,
                        })
                        .collect();
                    return Ok(players);
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}

#[derive(Deserialize)]
struct SetLineupArgs {
    player_ids: Vec<u32>,
}

/// Sets the starting XI for `team_id`: clears the pin on every player
/// currently in the squad, then sets it on exactly the given 11 ids.
/// Validates each id belongs to this team's roster and is match-ready
/// (reuses `Player::is_ready_for_match`, the same fitness/suspension check
/// `team_tactics.rs`'s `pick_best` already applies) — an unready pick is
/// rejected with a clear error rather than silently pinning a player who
/// can't play anyway.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`; `args_json` must be a valid NUL-terminated
/// C string.
#[unsafe(no_mangle)]
pub extern "C" fn engine_set_team_lineup(handle: *mut GameHandle, team_id: u32, args_json: *const c_char) -> *mut c_char {
    let json = run_guarded("engine_set_team_lineup", || -> Result<(), String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let args_str = unsafe { read(args_json) };
        let args: SetLineupArgs =
            serde_json::from_str(&args_str).map_err(|e| format!("invalid arguments: {e}"))?;

        if args.player_ids.len() != 11 {
            return Err(format!("expected exactly 11 player ids, got {}", args.player_ids.len()));
        }

        let game = unsafe { &mut *handle };

        for country in game.data_mut().continents.iter_mut().flat_map(|c| c.countries.iter_mut()) {
            for club in country.clubs.iter_mut() {
                let Some(team) = club.teams.find_mut(team_id) else { continue };

                for &player_id in &args.player_ids {
                    let player = team
                        .players
                        .find(player_id)
                        .ok_or_else(|| format!("player {player_id} is not on team {team_id}'s roster"))?;
                    if !player.is_ready_for_match() {
                        return Err(format!("player {player_id} is not ready for a match (injured/suspended)"));
                    }
                }

                for player in team.players.iter_mut() {
                    player.is_force_match_selection = args.player_ids.contains(&player.id);
                }

                return Ok(());
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
