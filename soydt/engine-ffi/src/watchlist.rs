//! Watchlist exports — ported from the original app's `web/src/watchlist/mod.rs`.
//! `SimulatorData.watchlist: Vec<u32>` already exists on `core` (a plain
//! player-id list) — these exports are thin add/remove/list wrappers around
//! it, the only engine-ffi functions so far that mutate world state directly
//! rather than advancing the simulation. Simplified vs. the original:
//! `current_ability`/`potential_ability` are raw 0-200 numbers rather than
//! the original's star-rating view (`PotentialStarsView`, which needs a
//! staff-based potential estimate — same simplification already used by
//! `team_academy.rs`).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use core::Player;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct WatchlistPlayerJson {
    id: u32,
    name: String,
    position: String,
    country_code: String,
    country_name: String,
    age: u8,
    current_ability: u8,
    potential_ability: u8,
    condition_pct: u8,
    team_name: String,
    league_name: String,
    played: u16,
    played_subs: u16,
    injured: bool,
    unhappy: bool,
    transfer_listed: bool,
    retired: bool,
}

fn base_dto(player: &Player, game: &GameHandle, now: chrono::NaiveDate) -> WatchlistPlayerJson {
    let (country_code, country_name) = game
        .data()
        .country(player.country_id)
        .map(|c| (c.code.clone(), c.name.clone()))
        .unwrap_or_default();

    WatchlistPlayerJson {
        id: player.id,
        name: format!("{} {}", player.full_name.first_name, player.full_name.last_name),
        position: player.positions.primary().map(|p| p.get_short_name().to_string()).unwrap_or_default(),
        country_code,
        country_name,
        age: DateUtils::age(player.birth_date, now),
        current_ability: player.player_attributes.current_ability,
        potential_ability: player.player_attributes.potential_ability,
        condition_pct: (player.player_attributes.condition / 100).clamp(0, 100) as u8,
        team_name: String::new(),
        league_name: String::new(),
        played: player.statistics.played,
        played_subs: player.statistics.played_subs,
        injured: player.player_attributes.is_injured,
        unhappy: false,
        transfer_listed: false,
        retired: false,
    }
}

/// Current watchlist entries, resolved against clubs/retirees/free agents —
/// mirrors the original's `watchlist_page_action` player-resolution branches.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_watchlist(handle: *mut GameHandle) -> *mut c_char {
    let json = run_guarded("engine_get_watchlist", || -> Result<Vec<WatchlistPlayerJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let players = game
            .data()
            .watchlist
            .iter()
            .filter_map(|&player_id| {
                if let Some((player, team)) = game.data().player_with_team(player_id) {
                    let league = team.league_id.and_then(|id| game.data().league(id));
                    Some(WatchlistPlayerJson {
                        team_name: team.name.clone(),
                        league_name: league.map(|l| l.name.clone()).unwrap_or_default(),
                        transfer_listed: player.statuses.get().contains(&core::PlayerStatusType::Lst),
                        unhappy: !player.happiness.is_happy(),
                        ..base_dto(player, game, now)
                    })
                } else if let Some(player) = game.data().retired_player(player_id) {
                    Some(WatchlistPlayerJson {
                        team_name: "Retired".to_string(),
                        retired: true,
                        ..base_dto(player, game, now)
                    })
                } else if let Some(player) = game.data().free_agents.iter().find(|p| p.id == player_id) {
                    Some(WatchlistPlayerJson {
                        team_name: "Free agent".to_string(),
                        ..base_dto(player, game, now)
                    })
                } else {
                    None
                }
            })
            .collect();

        Ok(players)
    });

    to_owned_ptr(json)
}

/// Adds `player_id` to the watchlist (no-op if already present) — mirrors
/// `watchlist_add_action`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_watchlist_add(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_watchlist_add", || -> Result<(), String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &mut *handle };
        if !game.data().watchlist.contains(&player_id) {
            game.data_mut().watchlist.push(player_id);
        }
        Ok(())
    });

    to_owned_ptr(json)
}

/// Removes `player_id` from the watchlist (no-op if absent) — mirrors
/// `watchlist_remove_action`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_watchlist_remove(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_watchlist_remove", || -> Result<(), String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &mut *handle };
        game.data_mut().watchlist.retain(|&id| id != player_id);
        Ok(())
    });

    to_owned_ptr(json)
}
