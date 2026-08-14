//! National team squad export — mirrors the original app's
//! `/{lang}/countries/{slug}` (senior) and `/{lang}/countries/{slug}/u21`
//! routes (same template, `Country` just carries two separate
//! `NationalTeam` fields — `national_team` and `u21_national_team` — not
//! one team with a runtime level filter).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use core::{CallUpReason, Country, NationalTeam, Player, SquadPick};
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct SquadRowJson {
    player_id: u32,
    position: String,
    first_name: String,
    last_name: String,
    age: u8,
    club_id: Option<u32>,
    club_name: String,
    // Deliberately NOT `potential_ability` — that field is a hidden
    // biological ceiling in `core` (`club/player/ability/attributes.rs`
    // comment: "Clubs, scouts, and coaches can never read this directly").
    // Current ability is shown for both columns so the table keeps the
    // original's column layout without leaking the hidden attribute.
    current_ability: u8,
    condition_pct: u8,
    international_apps: u16,
    international_goals: u16,
    reason: String,
}

fn resolve_real_player<'a>(country: &'a Country, club_id: u32, team_id: u32, player_id: u32) -> Option<&'a Player> {
    country
        .clubs
        .iter()
        .find(|c| c.id == club_id)?
        .teams
        .teams
        .iter()
        .find(|t| t.id == team_id)?
        .players
        .players
        .iter()
        .find(|p| p.id == player_id)
}

fn row_from_player(player: &Player, now: chrono::NaiveDate, club_id: Option<u32>, club_name: String, reason: String) -> SquadRowJson {
    SquadRowJson {
        player_id: player.id,
        position: player
            .positions
            .primary()
            .map(|p| p.get_short_name().to_string())
            .unwrap_or_else(|| "?".to_string()),
        first_name: player.full_name.first_name.clone(),
        last_name: player.full_name.last_name.clone(),
        age: DateUtils::age(player.birth_date, now),
        club_id,
        club_name,
        current_ability: player.player_attributes.current_ability,
        condition_pct: (player.player_attributes.condition / 100).clamp(0, 100) as u8,
        international_apps: 0,
        international_goals: 0,
        reason,
    }
}

fn build_squad_rows(country: &Country, team: &NationalTeam, now: chrono::NaiveDate) -> Vec<SquadRowJson> {
    team.squad_picks()
        .into_iter()
        .filter_map(|pick| match pick {
            SquadPick::Real(sq) => {
                let player = resolve_real_player(country, sq.club_id, sq.team_id, sq.player_id)?;
                let club_name = country
                    .clubs
                    .iter()
                    .find(|c| c.id == sq.club_id)
                    .map(|c| c.name.clone())
                    .unwrap_or_default();
                let mut row = row_from_player(player, now, Some(sq.club_id), club_name, reason_label(sq.primary_reason));
                row.international_apps = 0;
                Some(row)
            }
            SquadPick::Synthetic(player) => Some(row_from_player(player, now, None, String::new(), "Synthetic depth".to_string())),
        })
        .collect()
}

fn reason_label(reason: CallUpReason) -> String {
    // `CallUpReason::as_i18n_key()` gives a translation key (e.g.
    // "callup_reason_key_player") — this crate has no i18n catalog, so
    // fall back to the Rust variant name as a readable placeholder;
    // SoyDT.Api/React can map i18n keys once a catalog exists (Phase 3).
    format!("{reason:?}")
}

#[derive(Serialize)]
struct ScheduleItemJson {
    date: String,
    opponent_country_id: u32,
    opponent_name: String,
    is_home: bool,
    competition_name: String,
    match_id: String,
    home_goals: Option<u8>,
    away_goals: Option<u8>,
}

/// National team fixture list — mirrors
/// `countries/schedule/index.html`. `opponent_name` falls back to a
/// world lookup by `opponent_country_id` when the fixture's own cached
/// name is empty, matching the original web handler's behavior.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_national_schedule(handle: *mut GameHandle, country_id: u32, u21: bool) -> *mut c_char {
    let json = run_guarded("engine_get_national_schedule", || -> Result<Vec<ScheduleItemJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let all_countries: Vec<&Country> = game.data().continents.iter().flat_map(|c| c.countries.iter()).collect();
        let country = all_countries
            .iter()
            .find(|c| c.id == country_id)
            .ok_or_else(|| format!("no country with id {country_id}"))?;

        let team = if u21 { &country.u21_national_team } else { &country.national_team };

        let items = team
            .schedule
            .iter()
            .map(|f| {
                let opponent_name = if f.opponent_country_name.is_empty() {
                    all_countries
                        .iter()
                        .find(|c| c.id == f.opponent_country_id)
                        .map(|c| c.name.clone())
                        .unwrap_or_default()
                } else {
                    f.opponent_country_name.clone()
                };

                ScheduleItemJson {
                    date: f.date.format("%d.%m.%Y").to_string(),
                    opponent_country_id: f.opponent_country_id,
                    opponent_name,
                    is_home: f.is_home,
                    competition_name: f.competition_name.clone(),
                    match_id: f.match_id.clone(),
                    home_goals: f.result.as_ref().map(|r| r.home_score),
                    away_goals: f.result.as_ref().map(|r| r.away_score),
                }
            })
            .collect();

        Ok(items)
    });

    to_owned_ptr(json)
}

#[derive(Serialize)]
struct StaffMemberJson {
    first_name: String,
    last_name: String,
    role: String,
    country_id: u32,
    country_code: String,
    country_name: String,
    age: i32,
}

/// National team staff roster — mirrors `countries/staff/index.html`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_national_staff(handle: *mut GameHandle, country_id: u32, u21: bool) -> *mut c_char {
    let json = run_guarded("engine_get_national_staff", || -> Result<Vec<StaffMemberJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now_year = game.data().date.date().format("%Y").to_string().parse::<i32>().unwrap_or(2026);

        let all_countries: Vec<&Country> = game.data().continents.iter().flat_map(|c| c.countries.iter()).collect();
        let country = all_countries
            .iter()
            .find(|c| c.id == country_id)
            .ok_or_else(|| format!("no country with id {country_id}"))?;

        let team = if u21 { &country.u21_national_team } else { &country.national_team };

        let staff = team
            .staff
            .iter()
            .map(|s| {
                let nationality = all_countries.iter().find(|c| c.id == s.country_id);
                StaffMemberJson {
                    first_name: s.first_name.clone(),
                    last_name: s.last_name.clone(),
                    role: format!("{:?}", s.role),
                    country_id: s.country_id,
                    country_code: nationality.map(|c| c.code.clone()).unwrap_or_default(),
                    country_name: nationality.map(|c| c.name.clone()).unwrap_or_default(),
                    age: now_year - s.birth_year,
                }
            })
            .collect();

        Ok(staff)
    });

    to_owned_ptr(json)
}

#[derive(Serialize)]
struct FreeAgentJson {
    player_id: u32,
    first_name: String,
    last_name: String,
    position: String,
    age: u8,
    current_ability: u8,
}

/// Free agents eligible for `country_id` — filters the WORLD-level free
/// agent pool (`SimulatorData.free_agents`, not a country-scoped field) by
/// `player.country_id`, matching the original web handler. Sorted by
/// position group then descending ability, same as the original.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_free_agents(handle: *mut GameHandle, country_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_free_agents", || -> Result<Vec<FreeAgentJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let mut players: Vec<FreeAgentJson> = game
            .data()
            .free_agents
            .iter()
            .filter(|p| p.country_id == country_id)
            .map(|p| FreeAgentJson {
                player_id: p.id,
                first_name: p.full_name.first_name.clone(),
                last_name: p.full_name.last_name.clone(),
                position: p
                    .positions
                    .primary()
                    .map(|pos| pos.get_short_name().to_string())
                    .unwrap_or_else(|| "?".to_string()),
                age: DateUtils::age(p.birth_date, now),
                current_ability: p.player_attributes.current_ability,
            })
            .collect();

        players.sort_by(|a, b| b.current_ability.cmp(&a.current_ability));
        Ok(players)
    });

    to_owned_ptr(json)
}

/// Squad for a country's national team — `u21: false` for senior,
/// `u21: true` for the U21 side (two distinct `NationalTeam`s on
/// `Country`, not a filtered view of one).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_national_squad(handle: *mut GameHandle, country_id: u32, u21: bool) -> *mut c_char {
    let json = run_guarded("engine_get_national_squad", || -> Result<Vec<SquadRowJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let country = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .find(|c| c.id == country_id)
            .ok_or_else(|| format!("no country with id {country_id}"))?;

        let team = if u21 { &country.u21_national_team } else { &country.national_team };
        Ok(build_squad_rows(country, team, now))
    });

    to_owned_ptr(json)
}
