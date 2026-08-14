//! Player detail export — Phase 1's fourth feature area, mirrors the
//! original app's `/{lang}/players/{slug}` route (overview tab only so
//! far — contract/history/transfers/etc. are separate sub-tabs there).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerDetailJson {
    id: u32,
    first_name: String,
    last_name: String,
    age: u8,
    position: String,
    country_id: u32,
    country_code: String,
    country_name: String,
    current_ability: u8,
    value: u32,
    current_reputation: i16,
    height: u8,
    weight: u8,
    is_injured: bool,
    is_banned: bool,
    technical_avg: f32,
    mental_avg: f32,
    physical_avg: f32,
    team_id: Option<u32>,
    team_name: Option<String>,
}

/// Full detail for one player — searches every club's every team's squad
/// across the current world (or scoped subset). O(clubs × players); fine
/// for a single detail-page lookup, not something to call in a loop.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player", || -> Result<PlayerDetailJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(p) = team.players.players.iter().find(|p| p.id == player_id) {
                            let nationality = game
                                .data()
                                .continents
                                .iter()
                                .flat_map(|c| c.countries.iter())
                                .find(|c| c.id == p.country_id);

                            return Ok(PlayerDetailJson {
                                id: p.id,
                                first_name: p.full_name.first_name.clone(),
                                last_name: p.full_name.last_name.clone(),
                                age: DateUtils::age(p.birth_date, now),
                                position: p.positions.primary().map(|pos| format!("{pos:?}")).unwrap_or_else(|| "Unknown".to_string()),
                                country_id: p.country_id,
                                country_code: nationality.map(|c| c.code.clone()).unwrap_or_default(),
                                country_name: nationality.map(|c| c.name.clone()).unwrap_or_default(),
                                current_ability: p.player_attributes.current_ability,
                                value: p.player_attributes.value,
                                current_reputation: p.player_attributes.current_reputation,
                                height: p.player_attributes.height,
                                weight: p.player_attributes.weight,
                                is_injured: p.player_attributes.is_injured,
                                is_banned: p.player_attributes.is_banned,
                                technical_avg: p.skills.technical.average(),
                                mental_avg: p.skills.mental.average(),
                                physical_avg: p.skills.physical.average(),
                                team_id: Some(team.id),
                                team_name: Some(team.name.clone()),
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
