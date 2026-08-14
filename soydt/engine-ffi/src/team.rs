//! Team detail export — Phase 1's third feature area, mirrors the original
//! app's `/{lang}/teams/{slug}` route (overview/squad tab only so far).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerCardJson {
    id: u32,
    name: String,
    position: String,
    age: u8,
    current_ability: u8,
}

#[derive(Serialize)]
struct TeamDetailJson {
    id: u32,
    name: String,
    slug: String,
    club_id: u32,
    league_id: Option<u32>,
    league_name: Option<String>,
    reputation: u16,
    players: Vec<PlayerCardJson>,
}

/// Full detail for one team: identity, its league (if any), and squad list
/// as lightweight player cards (id/name/position/age/current_ability —
/// enough for a squad list view; a separate `engine_get_player` export
/// would back a full player detail page).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team", || -> Result<TeamDetailJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let mut found: Option<TeamDetailJson> = None;
        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.id == team_id) {
                    let league_name = team
                        .league_id
                        .and_then(|lid| country.leagues.leagues.iter().find(|l| l.id == lid))
                        .map(|l| l.name.clone());

                    let players = team
                        .players
                        .players
                        .iter()
                        .map(|p| PlayerCardJson {
                            id: p.id,
                            name: format!("{} {}", p.full_name.first_name, p.full_name.last_name),
                            position: p.positions.primary().map(|pos| format!("{pos:?}")).unwrap_or_else(|| "Unknown".to_string()),
                            age: DateUtils::age(p.birth_date, now),
                            current_ability: p.player_attributes.current_ability,
                        })
                        .collect();

                    found = Some(TeamDetailJson {
                        id: team.id,
                        name: team.name.clone(),
                        slug: team.slug.clone(),
                        club_id: team.club_id,
                        league_id: team.league_id,
                        league_name,
                        reputation: team.league_reputation,
                        players,
                    });
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
