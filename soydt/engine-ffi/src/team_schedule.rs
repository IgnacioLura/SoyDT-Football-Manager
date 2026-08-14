//! Team fixture list export — mirrors the original app's
//! `teams/schedule/index.html` (`/{lang}/teams/{slug}/schedule` route).
//!
//! Simplification: only the team's domestic **league** schedule is
//! surfaced here (`League::schedule` / `Schedule::get_matches_for_team`).
//! The original template's fixture list can also include continental and
//! domestic-cup fixtures merged in by the web handler; that merge is not
//! reproduced yet — see MIGRATION_CHECKLIST.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamScheduleItemJson {
    date: String,
    time: String,
    opponent_team_id: u32,
    opponent_name: String,
    is_home: bool,
    competition_name: String,
    match_id: String,
    home_goals: Option<u8>,
    away_goals: Option<u8>,
}

/// League fixture list for one team, sorted by date ascending.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_schedule(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_schedule", || -> Result<Vec<TeamScheduleItemJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        // Find the team (and the country it belongs to, for league/opponent
        // lookups) by walking continents -> countries -> clubs -> teams.
        let mut found: Option<(&core::Country, &core::Team)> = None;
        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.id == team_id) {
                    found = Some((country, team));
                    break;
                }
            }
            if found.is_some() {
                break;
            }
        }

        let (country, team) = found.ok_or_else(|| format!("no team with id {team_id}"))?;

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

        let mut raw_items = league.schedule.get_matches_for_team(team_id);
        raw_items.sort_by_key(|item| item.date);

        let items: Vec<TeamScheduleItemJson> = raw_items
            .into_iter()
            .map(|item| {
                let is_home = item.home_team_id == team_id;
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

                TeamScheduleItemJson {
                    date: item.date.format("%d.%m.%Y").to_string(),
                    time: item.date.format("%H:%M").to_string(),
                    opponent_team_id,
                    opponent_name,
                    is_home,
                    competition_name: league.name.clone(),
                    match_id: item.id.clone(),
                    home_goals,
                    away_goals,
                }
            })
            .collect();

        Ok(items)
    });

    to_owned_ptr(json)
}
