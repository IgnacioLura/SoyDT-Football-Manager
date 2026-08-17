//! League fixture list export — mirrors the original app's
//! `leagues/get/index.html` "fixtures_results" panel (`/{lang}/leagues/{slug}`
//! page originally shows only the *current* matchday inline; this export
//! surfaces the full season schedule instead, matching the standalone
//! `/leagues/{leagueId}/schedule` route this crate's web layer exposes).
//!
//! Simplification: only the league's own domestic schedule
//! (`League::schedule`) is surfaced here — continental/cup fixtures are not
//! merged in, same simplification as `team_schedule.rs`.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct LeagueScheduleItemJson {
    date: String,
    time: String,
    home_team_id: u32,
    home_team_name: String,
    home_team_slug: String,
    away_team_id: u32,
    away_team_name: String,
    away_team_slug: String,
    match_id: String,
    home_goals: Option<u8>,
    away_goals: Option<u8>,
}

/// Full-season fixture list for one league, sorted by date ascending.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_league_schedule(handle: *mut GameHandle, league_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_league_schedule", || -> Result<Vec<LeagueScheduleItemJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let (country, league) = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .find_map(|country| {
                country
                    .leagues
                    .leagues
                    .iter()
                    .find(|l| l.id == league_id)
                    .map(|league| (country, league))
            })
            .ok_or_else(|| format!("no league with id {league_id}"))?;

        let find_team = |team_id: u32| -> Option<&core::Team> {
            country.clubs.iter().flat_map(|c| c.teams.teams.iter()).find(|t| t.id == team_id)
        };

        let mut raw_items: Vec<_> = league.schedule.tours.iter().flat_map(|t| t.items.iter()).collect();
        // Drop dead fixtures — see `team_schedule.rs`'s matching filter for
        // why: a split-season country's schedule starts months before the
        // world's Aug-1-anchored clock does, so its early rounds are
        // result-less and dated before "now" forever, not just not-yet-played.
        raw_items.retain(|item| item.result.is_some() || item.date >= game.data().date);
        raw_items.sort_by_key(|item| item.date);

        let items: Vec<LeagueScheduleItemJson> = raw_items
            .into_iter()
            .map(|item| {
                let (home_goals, away_goals) = match &item.result {
                    Some(score) => (Some(score.home_team.get()), Some(score.away_team.get())),
                    None => (None, None),
                };

                LeagueScheduleItemJson {
                    date: item.date.format("%d.%m.%Y").to_string(),
                    time: item.date.format("%H:%M").to_string(),
                    home_team_id: item.home_team_id,
                    home_team_name: find_team(item.home_team_id).map(|t| t.name.clone()).unwrap_or_default(),
                    home_team_slug: find_team(item.home_team_id).map(|t| t.slug.clone()).unwrap_or_default(),
                    away_team_id: item.away_team_id,
                    away_team_name: find_team(item.away_team_id).map(|t| t.name.clone()).unwrap_or_default(),
                    away_team_slug: find_team(item.away_team_id).map(|t| t.slug.clone()).unwrap_or_default(),
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
