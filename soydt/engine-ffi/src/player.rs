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
    technical: TechnicalJson,
    mental: MentalJson,
    physical: PhysicalJson,
    goalkeeping: Option<GoalkeepingJson>,
    team_id: Option<u32>,
    team_name: Option<String>,
}

#[derive(Serialize)]
struct TechnicalJson {
    corners: f32,
    crossing: f32,
    dribbling: f32,
    finishing: f32,
    first_touch: f32,
    free_kicks: f32,
    heading: f32,
    long_shots: f32,
    long_throws: f32,
    marking: f32,
    passing: f32,
    penalty_taking: f32,
    tackling: f32,
    technique: f32,
}

#[derive(Serialize)]
struct MentalJson {
    aggression: f32,
    anticipation: f32,
    bravery: f32,
    composure: f32,
    concentration: f32,
    decisions: f32,
    determination: f32,
    flair: f32,
    leadership: f32,
    off_the_ball: f32,
    positioning: f32,
    teamwork: f32,
    vision: f32,
    work_rate: f32,
}

#[derive(Serialize)]
struct PhysicalJson {
    acceleration: f32,
    agility: f32,
    balance: f32,
    jumping: f32,
    natural_fitness: f32,
    pace: f32,
    stamina: f32,
    strength: f32,
    match_readiness: f32,
}

#[derive(Serialize)]
struct GoalkeepingJson {
    aerial_reach: f32,
    command_of_area: f32,
    communication: f32,
    eccentricity: f32,
    first_touch: f32,
    handling: f32,
    kicking: f32,
    one_on_ones: f32,
    passing: f32,
    punching: f32,
    reflexes: f32,
    rushing_out: f32,
    throwing: f32,
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
                                technical: TechnicalJson {
                                    corners: p.skills.technical.corners,
                                    crossing: p.skills.technical.crossing,
                                    dribbling: p.skills.technical.dribbling,
                                    finishing: p.skills.technical.finishing,
                                    first_touch: p.skills.technical.first_touch,
                                    free_kicks: p.skills.technical.free_kicks,
                                    heading: p.skills.technical.heading,
                                    long_shots: p.skills.technical.long_shots,
                                    long_throws: p.skills.technical.long_throws,
                                    marking: p.skills.technical.marking,
                                    passing: p.skills.technical.passing,
                                    penalty_taking: p.skills.technical.penalty_taking,
                                    tackling: p.skills.technical.tackling,
                                    technique: p.skills.technical.technique,
                                },
                                mental: MentalJson {
                                    aggression: p.skills.mental.aggression,
                                    anticipation: p.skills.mental.anticipation,
                                    bravery: p.skills.mental.bravery,
                                    composure: p.skills.mental.composure,
                                    concentration: p.skills.mental.concentration,
                                    decisions: p.skills.mental.decisions,
                                    determination: p.skills.mental.determination,
                                    flair: p.skills.mental.flair,
                                    leadership: p.skills.mental.leadership,
                                    off_the_ball: p.skills.mental.off_the_ball,
                                    positioning: p.skills.mental.positioning,
                                    teamwork: p.skills.mental.teamwork,
                                    vision: p.skills.mental.vision,
                                    work_rate: p.skills.mental.work_rate,
                                },
                                physical: PhysicalJson {
                                    acceleration: p.skills.physical.acceleration,
                                    agility: p.skills.physical.agility,
                                    balance: p.skills.physical.balance,
                                    jumping: p.skills.physical.jumping,
                                    natural_fitness: p.skills.physical.natural_fitness,
                                    pace: p.skills.physical.pace,
                                    stamina: p.skills.physical.stamina,
                                    strength: p.skills.physical.strength,
                                    match_readiness: p.skills.physical.match_readiness,
                                },
                                goalkeeping: if p.positions.is_goalkeeper() {
                                    Some(GoalkeepingJson {
                                        aerial_reach: p.skills.goalkeeping.aerial_reach,
                                        command_of_area: p.skills.goalkeeping.command_of_area,
                                        communication: p.skills.goalkeeping.communication,
                                        eccentricity: p.skills.goalkeeping.eccentricity,
                                        first_touch: p.skills.goalkeeping.first_touch,
                                        handling: p.skills.goalkeeping.handling,
                                        kicking: p.skills.goalkeeping.kicking,
                                        one_on_ones: p.skills.goalkeeping.one_on_ones,
                                        passing: p.skills.goalkeeping.passing,
                                        punching: p.skills.goalkeeping.punching,
                                        reflexes: p.skills.goalkeeping.reflexes,
                                        rushing_out: p.skills.goalkeeping.rushing_out,
                                        throwing: p.skills.goalkeeping.throwing,
                                    })
                                } else {
                                    None
                                },
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
