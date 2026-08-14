//! Player "Personal" export — attributes, personality, morale, reputation
//! and languages. Deliberately simplified (per the migration plan): no SVG
//! radar-chart geometry (React renders the raw trait values plainly), no
//! manager-relationship cross-lookup, no favorite-clubs resolution. Every
//! field below is a direct passthrough of a value that already exists on
//! `core::club::player::Player` — nothing here is derived/computed beyond
//! straightforward percentage conversions already used elsewhere in this
//! crate (see `national_team.rs`'s `condition_pct`).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct LanguageJson {
    name: String,
    proficiency: u8,
    is_native: bool,
}

#[derive(Serialize)]
struct PlayerPersonalJson {
    // Attributes
    preferred_foot: String,
    leadership: f32,
    determination: f32,
    work_rate: f32,
    condition_pct: u8,
    fitness_pct: u8,

    // Reputation
    current_reputation: i16,
    home_reputation: i16,
    world_reputation: i16,

    // Personality (PersonAttributes, 0.0-20.0 scale)
    adaptability: f32,
    ambition: f32,
    controversy: f32,
    loyalty: f32,
    pressure: f32,
    professionalism: f32,
    sportsmanship: f32,
    temperament: f32,

    // Morale
    morale: f32,

    // Languages
    languages: Vec<LanguageJson>,
}

/// Personal/attributes tab for one player — searches every club's every
/// team's squad across the current world (or scoped subset), same O(clubs
/// × players) lookup pattern as `engine_get_player`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_personal(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_personal", || -> Result<PlayerPersonalJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(p) = team.players.players.iter().find(|p| p.id == player_id) {
                            let attrs = &p.player_attributes;
                            let mental = &p.skills.mental;
                            let person = &p.attributes;

                            let languages = p
                                .languages
                                .iter()
                                .map(|l| LanguageJson {
                                    name: format!("{:?}", l.language),
                                    proficiency: l.proficiency,
                                    is_native: l.is_native,
                                })
                                .collect();

                            return Ok(PlayerPersonalJson {
                                preferred_foot: p.preferred_foot_str().to_string(),
                                leadership: mental.leadership,
                                determination: mental.determination,
                                work_rate: mental.work_rate,
                                condition_pct: attrs.condition_percentage().clamp(0, 100) as u8,
                                fitness_pct: (attrs.fitness as i32 / 100).clamp(0, 100) as u8,

                                current_reputation: attrs.current_reputation,
                                home_reputation: attrs.home_reputation,
                                world_reputation: attrs.world_reputation,

                                adaptability: person.adaptability,
                                ambition: person.ambition,
                                controversy: person.controversy,
                                loyalty: person.loyalty,
                                pressure: person.pressure,
                                professionalism: person.professionalism,
                                sportsmanship: person.sportsmanship,
                                temperament: person.temperament,

                                morale: p.happiness.morale,

                                languages,
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
