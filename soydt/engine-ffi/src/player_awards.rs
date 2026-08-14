//! Career awards summary export — SIMPLIFIED version of the original
//! app's Awards tab (`open-football/src/web/src/player/awards`): flat
//! lifetime counters only, no per-league grouping/blocks and no 12-month
//! bar chart. Backed by `core::club::player::events::career::PlayerAwardsCount`
//! (`Player::awards_count`), the single funnel every award path (weekly,
//! monthly, season, year, continental, world, domestic cup) bumps through
//! `Player::apply_award_reputation_impact`.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerAwardsJson {
    player_of_the_week: u16,
    young_player_of_the_week: u16,
    team_of_the_week: u16,
    young_team_of_the_week: u16,
    player_of_the_month: u16,
    young_player_of_the_month: u16,
    team_of_the_month: u16,
    young_team_of_the_month: u16,
    team_of_the_season: u16,
    team_of_the_year: u16,
    player_of_the_season: u16,
    young_player_of_the_season: u16,
    league_top_scorer: u16,
    league_top_assists: u16,
    league_golden_glove: u16,
    continental_player_of_year: u16,
    world_player_of_year: u16,
    domestic_cup_winner: u16,
    total: u32,
}

/// Lifetime award tally for one player — searches every club's every
/// team's squad across the current world (or scoped subset), same
/// O(clubs × players) lookup pattern as `engine_get_player`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_awards(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_awards", || -> Result<PlayerAwardsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(p) = team.players.players.iter().find(|p| p.id == player_id) {
                            let a = &p.awards_count;
                            let total = a.total();
                            return Ok(PlayerAwardsJson {
                                player_of_the_week: a.player_of_the_week,
                                young_player_of_the_week: a.young_player_of_the_week,
                                team_of_the_week: a.team_of_the_week,
                                young_team_of_the_week: a.young_team_of_the_week,
                                player_of_the_month: a.player_of_the_month,
                                young_player_of_the_month: a.young_player_of_the_month,
                                team_of_the_month: a.team_of_the_month,
                                young_team_of_the_month: a.young_team_of_the_month,
                                team_of_the_season: a.team_of_the_season,
                                team_of_the_year: a.team_of_the_year,
                                player_of_the_season: a.player_of_the_season,
                                young_player_of_the_season: a.young_player_of_the_season,
                                league_top_scorer: a.league_top_scorer,
                                league_top_assists: a.league_top_assists,
                                league_golden_glove: a.league_golden_glove,
                                continental_player_of_year: a.continental_player_of_year,
                                world_player_of_year: a.world_player_of_year,
                                domestic_cup_winner: a.domestic_cup_winner,
                                total,
                            });
                        }
                    }
                }
            }
        }

        Err(format!("no player with id {player_id}"))
    });

    to_owned_ptr(json)
}
