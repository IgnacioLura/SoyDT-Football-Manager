//! Domestic cup exports — backs `cups/get.html` + `cups/history.html`.
//! `Country::domestic_cup: Option<DomesticCup>` already exists on `core`
//! (one auto-generated knockout cup per country, e.g. "Copa Argentina"),
//! driven through an inner `League` with `is_cup = true` — see
//! `open-football/src/core/src/league/domestic_cup.rs`. These exports just
//! project that struct; no engine changes needed.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::Team;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct CupListItemJson {
    id: u32,
    name: String,
    slug: String,
    country_id: u32,
    country_name: String,
}

/// One domestic cup per scoped country that has one — mirrors the original
/// app's implicit "every country has a cup" assumption (a country without a
/// named cup config still gets a generated `"{Country} Cup"` fallback, see
/// `database/src/generators/generator/leagues.rs`).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_cups(handle: *mut GameHandle) -> *mut c_char {
    let json = run_guarded("engine_get_cups", || -> Result<Vec<CupListItemJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let cups = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .filter_map(|country| {
                country.domestic_cup.as_ref().map(|cup| CupListItemJson {
                    id: cup.id(),
                    name: cup.league.name.clone(),
                    slug: cup.slug().to_string(),
                    country_id: country.id,
                    country_name: country.name.clone(),
                })
            })
            .collect();

        Ok(cups)
    });

    to_owned_ptr(json)
}

#[derive(Serialize)]
struct CupTieJson {
    date: String,
    home_team_id: u32,
    home_team_name: String,
    away_team_id: u32,
    away_team_name: String,
    home_goals: Option<u8>,
    away_goals: Option<u8>,
}

#[derive(Serialize)]
struct CupRoundJson {
    round: u8,
    ties: Vec<CupTieJson>,
}

#[derive(Serialize)]
struct CupHistoryEntryJson {
    season_start_year: i32,
    champion_team_name: String,
    runner_up_team_name: Option<String>,
}

#[derive(Serialize)]
struct CupBracketJson {
    id: u32,
    name: String,
    rounds: Vec<CupRoundJson>,
    champion_team_id: Option<u32>,
    champion_team_name: Option<String>,
    past_champions: Vec<CupHistoryEntryJson>,
}

/// Current bracket (round by round) + history for one domestic cup.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_cup_bracket(handle: *mut GameHandle, cup_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_cup_bracket", || -> Result<CupBracketJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let (country, cup) = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .find_map(|country| {
                country
                    .domestic_cup
                    .as_ref()
                    .filter(|cup| cup.id() == cup_id)
                    .map(|cup| (country, cup))
            })
            .ok_or_else(|| format!("no cup with id {cup_id}"))?;

        let find_team = |team_id: u32| -> Option<&Team> {
            country.clubs.iter().flat_map(|c| c.teams.teams.iter()).find(|t| t.id == team_id)
        };
        let team_name = |team_id: u32| -> String { find_team(team_id).map(|t| t.name.clone()).unwrap_or_default() };

        let rounds: Vec<CupRoundJson> = cup
            .league
            .schedule
            .tours
            .iter()
            .map(|tour| CupRoundJson {
                round: tour.num,
                ties: tour
                    .items
                    .iter()
                    .map(|item| {
                        let (home_goals, away_goals) = match &item.result {
                            Some(score) => (Some(score.home_team.get()), Some(score.away_team.get())),
                            None => (None, None),
                        };
                        CupTieJson {
                            date: item.date.format("%d.%m.%Y").to_string(),
                            home_team_id: item.home_team_id,
                            home_team_name: team_name(item.home_team_id),
                            away_team_id: item.away_team_id,
                            away_team_name: team_name(item.away_team_id),
                            home_goals,
                            away_goals,
                        }
                    })
                    .collect(),
            })
            .collect();

        let champion_team_id = cup.champion(&country.clubs);
        let champion_team_name = champion_team_id.map(team_name);

        let past_champions = cup
            .past_champions
            .iter()
            .map(|entry| CupHistoryEntryJson {
                season_start_year: entry.season_start_year,
                champion_team_name: team_name(entry.champion_team_id),
                runner_up_team_name: entry.runner_up_team_id.map(team_name),
            })
            .collect();

        Ok(CupBracketJson {
            id: cup.id(),
            name: cup.league.name.clone(),
            rounds,
            champion_team_id,
            champion_team_name,
            past_champions,
        })
    });

    to_owned_ptr(json)
}
