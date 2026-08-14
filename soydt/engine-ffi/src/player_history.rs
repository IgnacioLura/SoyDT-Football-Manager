//! Player history export — SIMPLIFIED scope. The original app
//! (`open-football/src/web/src/player/history`) renders an accordion of
//! per-competition breakdowns backed by a `PlayerStatisticsProjection` that
//! merges the frozen `season_ledger` with live in-progress-season stats
//! (`current`/`continental`/live per-spell caches) and resolves league/team
//! slugs against `SimulatorData` for display names and per-cup subtotals.
//!
//! This export intentionally does NOT port that machinery. It reads
//! `Player::statistics_history.season_ledger` directly — see
//! `core::club::player::statistics::ledger::PlayerStatLedgerEntry` and
//! `core::club::player::statistics::types::PlayerStatistics` — and emits one
//! flat row per completed-season League ledger entry (continental-cup
//! appearances are already folded into the League row upstream by the
//! engine's ledger-writing code, matching the original History page's
//! per-season line). Dropped entirely: the competition-breakdown accordion,
//! the live/current-season merge (so an in-progress season won't show up
//! until the engine appends its season-end ledger row), domestic-cup rows,
//! friendly rows, and transfer-fee-per-season display.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::PlayerStatCompetitionKind;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerHistoryRowJson {
    season: String,
    team_name: String,
    played: u16,
    goals: u16,
    assists: u16,
    average_rating: f32,
}

/// Flat, historical-only season list for one player — see module docs for
/// what was dropped versus the original app's History tab.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_history(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_history", || -> Result<Vec<PlayerHistoryRowJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(p) = team.players.players.iter().find(|p| p.id == player_id) {
                            let mut rows: Vec<PlayerHistoryRowJson> = p
                                .statistics_history
                                .season_ledger
                                .iter()
                                .filter(|entry| entry.competition_kind == PlayerStatCompetitionKind::League)
                                .map(|entry| PlayerHistoryRowJson {
                                    season: format!(
                                        "{}/{}",
                                        entry.season_start_year,
                                        (entry.season_start_year + 1) % 100
                                    ),
                                    team_name: entry.team_name.clone(),
                                    played: entry.statistics.played,
                                    goals: entry.statistics.goals,
                                    assists: entry.statistics.assists,
                                    average_rating: entry.statistics.average_rating,
                                })
                                .collect();
                            rows.sort_by(|a, b| a.season.cmp(&b.season));
                            return Ok(rows);
                        }
                    }
                }
            }
        }

        Err(format!("no player with id {player_id}"))
    });

    to_owned_ptr(json)
}
