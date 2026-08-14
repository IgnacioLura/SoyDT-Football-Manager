//! On-demand match simulation between two real game-state teams — backs
//! `match/get.html`'s scoreboard + replay view. Unlike the original app
//! (which persists full position data for every single simulated fixture to
//! `match_results/*.json.gz`), this re-simulates the fixture from the two
//! teams' CURRENT squads the moment a user opens the match page instead of
//! reproducing the historical result exactly — see the architecture note in
//! MIGRATION_CHECKLIST.md's Fase 2 section. Reuses `match.rs`'s JSON
//! projection (`match_result_json_from_raw`) so both simulation paths
//! (JSON-supplied squads vs. real game-state teams) serialize identically.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::r#match::match_result_json_from_raw;
use crate::strings::to_owned_ptr;
use core::r#match::engine::FootballEngine;
use core::Team;
use std::os::raw::c_char;

fn find_team(game: &GameHandle, team_id: u32) -> Option<&Team> {
    game.data()
        .continents
        .iter()
        .flat_map(|c| c.countries.iter())
        .flat_map(|c| c.clubs.iter())
        .find_map(|club| club.teams.teams.iter().find(|t| t.id == team_id))
}

/// Simulates `home_team_id` vs `away_team_id` using each team's current
/// rotation-selected squad and tactics, always recording (downsampled)
/// positions since this export only ever backs the on-demand match-detail
/// page, not the bulk day-to-day league simulation.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_simulate_team_match(
    handle: *mut GameHandle,
    home_team_id: u32,
    away_team_id: u32,
) -> *mut c_char {
    let json = run_guarded("engine_simulate_team_match", || -> Result<crate::r#match::MatchResultJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let home_team = find_team(game, home_team_id).ok_or_else(|| format!("no team with id {home_team_id}"))?;
        let away_team = find_team(game, away_team_id).ok_or_else(|| format!("no team with id {away_team_id}"))?;

        let home_squad = home_team.get_rotation_match_squad_at(now);
        let away_squad = away_team.get_rotation_match_squad_at(now);

        let result = FootballEngine::<840, 545>::play(home_squad, away_squad, true, true, false);
        match_result_json_from_raw(result, home_team_id, true)
    });

    to_owned_ptr(json)
}
