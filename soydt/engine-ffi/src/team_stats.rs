//! Team season statistics export — backs the React "Team Stats" page (a
//! flat, sortable table of every squad player's season numbers, mirroring
//! the original app's team stats tab). Reuses `team.rs`'s team-lookup
//! pattern (walk continents/countries/clubs, `find` by id).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamPlayerStatsRow {
    player_id: u32,
    name: String,
    position: String,
    played: u16,
    played_subs: u16,
    goals: u16,
    assists: u16,
    yellow_cards: u8,
    red_cards: u8,
    shots_on_target: f32,
    passes: u8,
    tackling: f32,
    average_rating: String,
}

/// Season statistics for every player in a team's squad, one row per
/// player — the data behind React's `/teams/:teamId/stats` page.
///
/// Sorted by `played` (appearances, descending) rather than by average
/// rating: `PlayerStatistics::display_average_rating` is a plain-mean
/// `String` (deliberately not comparable as a number — see its own doc
/// comment on why it's the *display* value, not the *judgement* one),
/// and the actual ranking accessor (`average_rating_realistic`) takes a
/// `PlayerFieldPositionGroup` argument per player, which is more plumbing
/// than this first cut of the page needs. `played` descending is a
/// stable, meaningful default (regulars before fringe players) and avoids
/// parsing/comparing the display string.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_stats(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_stats", || -> Result<Vec<TeamPlayerStatsRow>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let mut found: Option<Vec<TeamPlayerStatsRow>> = None;
        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.id == team_id) {
                    let mut rows: Vec<TeamPlayerStatsRow> = team
                        .players
                        .players
                        .iter()
                        .map(|p| {
                            let stats = &p.statistics;
                            TeamPlayerStatsRow {
                                player_id: p.id,
                                name: format!("{} {}", p.full_name.first_name, p.full_name.last_name),
                                position: p.positions.primary().map(|pos| format!("{pos:?}")).unwrap_or_else(|| "Unknown".to_string()),
                                played: stats.played,
                                played_subs: stats.played_subs,
                                goals: stats.goals,
                                assists: stats.assists,
                                yellow_cards: stats.yellow_cards,
                                red_cards: stats.red_cards,
                                shots_on_target: stats.shots_on_target,
                                passes: stats.passes,
                                tackling: stats.tackling,
                                average_rating: stats.display_average_rating(),
                            }
                        })
                        .collect();

                    rows.sort_by(|a, b| b.played.cmp(&a.played));
                    found = Some(rows);
                    break;
                }
            }
            if found.is_some() {
                break;
            }
        }

        found.ok_or_else(|| format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
