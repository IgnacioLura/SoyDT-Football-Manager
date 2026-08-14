//! Leagues list + table exports — Phase 1's second feature area, mirrors
//! the original app's `/{lang}/countries/{slug}/leagues` and
//! `/{lang}/leagues/{slug}` routes.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::league::League;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct LeagueListItem {
    id: u32,
    name: String,
    slug: String,
    country_id: u32,
    tier: u8,
    reputation: u16,
    team_count: usize,
}

/// Finds every league in the world (or scoped subset) whose `country_id`
/// matches, plus the club/team lists needed to compute per-league team
/// counts. Both `engine_get_leagues` and `engine_get_league_table` need to
/// walk the same continent → country → clubs/leagues structure, so this is
/// the one place that does it.
fn find_country<'a>(game: &'a GameHandle, country_id: u32) -> Option<&'a core::Country> {
    game.data().continents.iter().flat_map(|c| c.countries.iter()).find(|c| c.id == country_id)
}

fn find_league_and_country<'a>(game: &'a GameHandle, league_id: u32) -> Option<(&'a core::Country, &'a League)> {
    game.data().continents.iter().flat_map(|c| c.countries.iter()).find_map(|country| {
        country
            .leagues
            .leagues
            .iter()
            .find(|l| l.id == league_id)
            .map(|league| (country, league))
    })
}

/// Lists every league belonging to `country_id`, with each league's current
/// team count (via `TeamCollection::with_league`, since a country's clubs —
/// not the league itself — own the `Team.league_id` links).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_leagues(handle: *mut GameHandle, country_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_leagues", || -> Result<Vec<LeagueListItem>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let country = find_country(game, country_id)
            .ok_or_else(|| format!("no country with id {country_id}"))?;

        let items = country
            .leagues
            .leagues
            .iter()
            .map(|league| LeagueListItem {
                id: league.id,
                name: league.name.clone(),
                slug: league.slug.clone(),
                country_id,
                tier: league.settings.tier,
                reputation: league.reputation,
                team_count: country.clubs.iter().flat_map(|c| c.teams.with_league(league.id)).count(),
            })
            .collect();

        Ok(items)
    });

    to_owned_ptr(json)
}

#[derive(Serialize)]
struct LeagueTableRowJson {
    team_id: u32,
    team_name: String,
    team_slug: String,
    position: usize,
    played: u8,
    won: u8,
    drawn: u8,
    lost: u8,
    goals_for: i32,
    goals_against: i32,
    goal_difference: i32,
    points: u16,
}

#[derive(Serialize)]
struct LeagueTableJson {
    league_id: u32,
    league_name: String,
    league_slug: String,
    rows: Vec<LeagueTableRowJson>,
}

/// Current standings for `league_id`, using `League::annual_table_rows()`
/// (split-season-aware — sums both stages of a split competition and
/// resorts) rather than the raw live `table.rows`, matching what the
/// original app's "Tabla Anual" view reads.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_league_table(handle: *mut GameHandle, league_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_league_table", || -> Result<LeagueTableJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let (country, league) = find_league_and_country(game, league_id)
            .ok_or_else(|| format!("no league with id {league_id}"))?;

        // Team names/slugs live on `Club.teams`, not on the league/table row itself.
        let find_team = |team_id: u32| -> Option<&core::Team> {
            country.clubs.iter().flat_map(|c| c.teams.teams.iter()).find(|t| t.id == team_id)
        };

        let rows = league
            .annual_table_rows()
            .into_iter()
            .enumerate()
            .map(|(i, r)| {
                let team = find_team(r.team_id);
                LeagueTableRowJson {
                    team_id: r.team_id,
                    team_name: team.map(|t| t.name.clone()).unwrap_or_else(|| format!("Team {}", r.team_id)),
                    team_slug: team.map(|t| t.slug.clone()).unwrap_or_default(),
                    position: i + 1,
                    played: r.played,
                    won: r.win,
                    drawn: r.draft,
                    lost: r.lost,
                    goals_for: r.goal_scored,
                    goals_against: r.goal_concerned,
                    goal_difference: r.goal_difference(),
                    points: r.effective_points() as u16,
                }
            })
            .collect();

        Ok(LeagueTableJson {
            league_id,
            league_name: league.name.clone(),
            league_slug: league.slug.clone(),
            rows,
        })
    });

    to_owned_ptr(json)
}
