//! Player fixture list export — mirrors the original app's player "matches"
//! sub-tab, entered by player id instead of team id.
//!
//! Simplification: this is literally "find the player's current team, then
//! return that team's domestic **league** schedule" — the exact same data
//! as `engine_get_team_schedule` (see team_schedule.rs), just resolved via
//! `player_id`. It is NOT gated on the player having actually appeared in
//! each match (no cross-reference against per-match `player_stats`/lineups)
//! and does NOT merge in domestic-cup, continental, or international
//! fixtures — the original template's fixture list can include all of
//! those; that merge is not reproduced here. See MIGRATION_CHECKLIST.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerMatchItemJson {
    date: String,
    opponent_name: String,
    is_home: bool,
    competition_name: String,
    home_goals: Option<u8>,
    away_goals: Option<u8>,
}

/// League fixture list for the team the given player currently belongs to,
/// sorted by date ascending.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_matches(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_matches", || -> Result<Vec<PlayerMatchItemJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        // Find the player's current team (and the country it belongs to,
        // for league/opponent lookups) by walking continents -> countries
        // -> clubs -> teams -> players, same pattern as player.rs.
        let mut found: Option<(&core::Country, &core::Team)> = None;
        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club
                    .teams
                    .teams
                    .iter()
                    .find(|t| t.players.players.iter().any(|p| p.id == player_id))
                {
                    found = Some((country, team));
                    break;
                }
            }
            if found.is_some() {
                break;
            }
        }

        let (country, team) = found.ok_or_else(|| format!("no player with id {player_id}"))?;

        let league_id = match team.league_id {
            Some(id) => id,
            None => return Ok(Vec::new()),
        };

        let league = country
            .leagues
            .leagues
            .iter()
            .find(|l| l.id == league_id)
            .ok_or_else(|| format!("no league with id {league_id}"))?;

        let mut raw_items = league.schedule.get_matches_for_team(team.id);
        raw_items.sort_by_key(|item| item.date);

        let items: Vec<PlayerMatchItemJson> = raw_items
            .into_iter()
            .map(|item| {
                let is_home = item.home_team_id == team.id;
                let opponent_team_id = if is_home { item.away_team_id } else { item.home_team_id };

                let opponent_name = country
                    .clubs
                    .iter()
                    .flat_map(|c| c.teams.teams.iter())
                    .find(|t| t.id == opponent_team_id)
                    .map(|t| t.name.clone())
                    .unwrap_or_default();

                let (home_goals, away_goals) = match &item.result {
                    Some(score) => (Some(score.home_team.get()), Some(score.away_team.get())),
                    None => (None, None),
                };

                PlayerMatchItemJson {
                    date: item.date.format("%d.%m.%Y").to_string(),
                    opponent_name,
                    is_home,
                    competition_name: league.name.clone(),
                    home_goals,
                    away_goals,
                }
            })
            .collect();

        Ok(items)
    });

    to_owned_ptr(json)
}
