//! Search export — ported from the original app's `web/src/search/mod.rs`.
//! Case-insensitive substring match across countries/clubs/players, ranked
//! by reputation/ability, capped at `MAX_RESULTS_PER_KIND` per category —
//! same shape and thresholds as the original.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::{read, to_owned_ptr};
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

const MAX_RESULTS_PER_KIND: usize = 15;
const MIN_QUERY_LEN: usize = 4;

#[derive(Serialize)]
struct SearchCountryJson {
    name: String,
    slug: String,
    code: String,
}

#[derive(Serialize)]
struct SearchClubJson {
    name: String,
    team_slug: String,
}

#[derive(Serialize)]
struct SearchPlayerJson {
    id: u32,
    name: String,
    country_code: String,
    team_name: String,
    age: u8,
    is_free_agent: bool,
}

#[derive(Serialize)]
struct SearchResultsJson {
    countries: Vec<SearchCountryJson>,
    clubs: Vec<SearchClubJson>,
    players: Vec<SearchPlayerJson>,
}

/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`; `query` must be a valid NUL-terminated C string.
#[unsafe(no_mangle)]
pub extern "C" fn engine_search(handle: *mut GameHandle, query: *const c_char) -> *mut c_char {
    let json = run_guarded("engine_search", move || -> Result<SearchResultsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let needle = unsafe { read(query) }.trim().to_lowercase();

        if needle.len() < MIN_QUERY_LEN {
            return Ok(SearchResultsJson { countries: Vec::new(), clubs: Vec::new(), players: Vec::new() });
        }

        let now = game.data().date.date();
        let mut countries: Vec<SearchCountryJson> = Vec::new();
        let mut clubs: Vec<(u16, SearchClubJson)> = Vec::new();
        let mut players: Vec<(u8, SearchPlayerJson)> = Vec::new();

        for continent in &game.data().continents {
            for country in &continent.countries {
                if country.name.to_lowercase().contains(&needle) {
                    countries.push(SearchCountryJson {
                        name: country.name.clone(),
                        slug: country.slug.clone(),
                        code: country.code.clone(),
                    });
                }

                for club in &country.clubs {
                    if club.name.to_lowercase().contains(&needle) {
                        if let Some(main) = club.teams.main() {
                            clubs.push((main.reputation.world, SearchClubJson { name: club.name.clone(), team_slug: main.slug.clone() }));
                        }
                    }

                    for team in &club.teams.teams {
                        for player in team.players.players() {
                            let full = format!("{} {}", player.full_name.first_name, player.full_name.last_name);
                            if full.to_lowercase().contains(&needle) {
                                let country_code = game.data().country(player.country_id).map(|c| c.code.clone()).unwrap_or_default();
                                players.push((
                                    player.player_attributes.current_ability,
                                    SearchPlayerJson {
                                        id: player.id,
                                        name: full.trim().to_string(),
                                        country_code,
                                        team_name: team.name.clone(),
                                        age: DateUtils::age(player.birth_date, now),
                                        is_free_agent: false,
                                    },
                                ));
                            }
                        }
                    }
                }
            }
        }

        for player in &game.data().free_agents {
            let full = format!("{} {}", player.full_name.first_name, player.full_name.last_name);
            if full.to_lowercase().contains(&needle) {
                let country_code = game.data().country(player.country_id).map(|c| c.code.clone()).unwrap_or_default();
                players.push((
                    player.player_attributes.current_ability,
                    SearchPlayerJson {
                        id: player.id,
                        name: full.trim().to_string(),
                        country_code,
                        team_name: String::new(),
                        age: DateUtils::age(player.birth_date, now),
                        is_free_agent: true,
                    },
                ));
            }
        }

        countries.truncate(MAX_RESULTS_PER_KIND);
        clubs.sort_by(|a, b| b.0.cmp(&a.0));
        players.sort_by(|a, b| b.0.cmp(&a.0));

        Ok(SearchResultsJson {
            countries,
            clubs: clubs.into_iter().take(MAX_RESULTS_PER_KIND).map(|(_, dto)| dto).collect(),
            players: players.into_iter().take(MAX_RESULTS_PER_KIND).map(|(_, dto)| dto).collect(),
        })
    });

    to_owned_ptr(json)
}
