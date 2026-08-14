//! Youth academy export — backs React's `/teams/:teamId/academy` page.
//! Reuses `team_finances.rs`'s club-lookup pattern (walk continents →
//! countries → clubs, find the `core::Club` owning `team_id` via
//! `club.teams.teams`), then projects `club.academy`
//! (`core::club::ClubAcademy`, see `open-football/src/core/src/club/academy/academy.rs`)
//! into a flat snapshot plus one row per resident academy player.
//!
//! Deliberately simplified vs. the original app's academy tab: no pathway
//! readiness bar/threshold (`AcademyPathwayPolicy::readiness_threshold`,
//! `pathway_readiness_score`) or at-risk/low-condition/jaded/injury-prone
//! tags — those live on `pub(super)` methods of `ClubAcademy` not reachable
//! from outside the `core` crate. Phase counts (foundation/development/
//! professional) are recomputed here from `AcademyPlayerPhase::from_age`
//! (a `pub` associated fn) rather than via `ClubAcademy::pipeline_health`
//! (also `pub(super)`). No nationality/flag column, no star-rating
//! rendering — current/potential ability are raw 0-200 numbers.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::club::{AcademyPlayerPhase, AcademyTier};
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct AcademyPlayerJson {
    player_id: u32,
    name: String,
    position: String,
    phase: String,
    age: u8,
    current_ability: u8,
    potential_ability: u8,
}

#[derive(Serialize)]
struct TeamAcademyJson {
    level: u8,
    tier: u8,
    pathway_reputation: u8,
    development_identity: String,
    graduates_produced: u16,
    foundation_count: u16,
    development_count: u16,
    professional_count: u16,
    players: Vec<AcademyPlayerJson>,
}

/// Youth academy snapshot for the club that owns `team_id`: facility
/// level/tier, pathway reputation, development identity, lifetime
/// graduate count, and the resident academy roster with each prospect's
/// phase/age/ability. Looks up the team's club the same way
/// `engine_get_team_finances` does.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_academy(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_academy", || -> Result<TeamAcademyJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if club.teams.teams.iter().any(|t| t.id == team_id) {
                    let academy = &club.academy;

                    let mut foundation_count = 0u16;
                    let mut development_count = 0u16;
                    let mut professional_count = 0u16;

                    let players = academy
                        .players
                        .players
                        .iter()
                        .map(|p| {
                            let age = DateUtils::age(p.birth_date, now);
                            let phase = AcademyPlayerPhase::from_age(age);
                            match phase {
                                AcademyPlayerPhase::Foundation => foundation_count += 1,
                                AcademyPlayerPhase::Development => development_count += 1,
                                AcademyPlayerPhase::Professional => professional_count += 1,
                            }

                            AcademyPlayerJson {
                                player_id: p.id,
                                name: format!("{} {}", p.full_name.first_name, p.full_name.last_name),
                                position: p.positions.primary().map(|pos| format!("{pos:?}")).unwrap_or_else(|| "Unknown".to_string()),
                                phase: phase.label().to_string(),
                                age,
                                current_ability: p.player_attributes.current_ability,
                                potential_ability: p.player_attributes.potential_ability,
                            }
                        })
                        .collect();

                    return Ok(TeamAcademyJson {
                        level: academy.level(),
                        tier: AcademyTier::from_level(academy.level()).0,
                        pathway_reputation: academy.pathway_reputation,
                        development_identity: format!("{:?}", academy.development_identity),
                        graduates_produced: academy.graduates_produced,
                        foundation_count,
                        development_count,
                        professional_count,
                        players,
                    });
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
