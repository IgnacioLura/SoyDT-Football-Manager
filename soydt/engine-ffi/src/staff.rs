//! Staff member overview export — mirrors the original app's
//! `/{lang}/staff/{slug}` route (overview tab; `personal` is a separate
//! sub-tab, see `staff_personal.rs`). Unlike `national_team.rs`'s
//! `StaffMemberJson` (national-team roster rows, no attributes), this
//! walks club rosters (`core::club::staff::model::staff::Staff`, same
//! struct `team_staff.rs` reads) to find one staff member by id and
//! projects their full coaching/mental/knowledge/goalkeeping/medical
//! attribute block plus current club contract.
//!
//! Deliberately simplified: no scouting-region/familiarity fields off
//! `StaffKnowledge` (those drive the scouting subsystem, not the profile
//! page) and no data-analysis attribute block (the original `get.html`
//! template doesn't render one either).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct CoachingJson {
    attacking: u8,
    defending: u8,
    fitness: u8,
    mental: u8,
    tactical: u8,
    technical: u8,
    working_with_youngsters: u8,
}

#[derive(Serialize)]
struct StaffMentalJson {
    adaptability: u8,
    determination: u8,
    discipline: u8,
    man_management: u8,
    motivating: u8,
}

#[derive(Serialize)]
struct StaffKnowledgeJson {
    judging_player_ability: u8,
    judging_player_potential: u8,
    tactical_knowledge: u8,
}

#[derive(Serialize)]
struct GoalkeepingCoachingJson {
    distribution: u8,
    handling: u8,
    shot_stopping: u8,
}

#[derive(Serialize)]
struct MedicalJson {
    physiotherapy: u8,
    sports_science: u8,
}

#[derive(Serialize)]
struct StaffDetailJson {
    id: u32,
    first_name: String,
    last_name: String,
    age: u8,
    birth_date: String,
    country_id: u32,
    country_code: String,
    country_name: String,
    role: String,
    team_id: u32,
    team_name: String,
    salary: Option<u32>,
    contract_expiry: Option<String>,
    coaching: CoachingJson,
    mental: StaffMentalJson,
    knowledge: StaffKnowledgeJson,
    goalkeeping: GoalkeepingCoachingJson,
    medical: MedicalJson,
}

/// Full profile for one club staff member — searches every club's every
/// team's staff roster across the current world (or scoped subset), same
/// O(clubs × staff) lookup pattern as `engine_get_player`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_staff(handle: *mut GameHandle, staff_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_staff", || -> Result<StaffDetailJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(s) = team.staffs.iter().find(|s| s.id == staff_id) {
                            let nationality = game
                                .data()
                                .continents
                                .iter()
                                .flat_map(|c| c.countries.iter())
                                .find(|c| c.id == s.country_id);

                            let attrs = &s.staff_attributes;

                            return Ok(StaffDetailJson {
                                id: s.id,
                                first_name: s.full_name.first_name.clone(),
                                last_name: s.full_name.last_name.clone(),
                                age: DateUtils::age(s.birth_date, now),
                                birth_date: s.birth_date.format("%d.%m.%Y").to_string(),
                                country_id: s.country_id,
                                country_code: nationality.map(|c| c.code.clone()).unwrap_or_default(),
                                country_name: nationality.map(|c| c.name.clone()).unwrap_or_default(),
                                role: s
                                    .contract
                                    .as_ref()
                                    .map(|c| format!("{:?}", c.position))
                                    .unwrap_or_else(|| "Free".to_string()),
                                team_id: team.id,
                                team_name: team.name.clone(),
                                salary: s.contract.as_ref().map(|c| c.salary),
                                contract_expiry: s.contract.as_ref().map(|c| c.expired.format("%d.%m.%Y").to_string()),
                                coaching: CoachingJson {
                                    attacking: attrs.coaching.attacking,
                                    defending: attrs.coaching.defending,
                                    fitness: attrs.coaching.fitness,
                                    mental: attrs.coaching.mental,
                                    tactical: attrs.coaching.tactical,
                                    technical: attrs.coaching.technical,
                                    working_with_youngsters: attrs.coaching.working_with_youngsters,
                                },
                                mental: StaffMentalJson {
                                    adaptability: attrs.mental.adaptability,
                                    determination: attrs.mental.determination,
                                    discipline: attrs.mental.discipline,
                                    man_management: attrs.mental.man_management,
                                    motivating: attrs.mental.motivating,
                                },
                                knowledge: StaffKnowledgeJson {
                                    judging_player_ability: attrs.knowledge.judging_player_ability,
                                    judging_player_potential: attrs.knowledge.judging_player_potential,
                                    tactical_knowledge: attrs.knowledge.tactical_knowledge,
                                },
                                goalkeeping: GoalkeepingCoachingJson {
                                    distribution: attrs.goalkeeping.distribution,
                                    handling: attrs.goalkeeping.handling,
                                    shot_stopping: attrs.goalkeeping.shot_stopping,
                                },
                                medical: MedicalJson {
                                    physiotherapy: attrs.medical.physiotherapy,
                                    sports_science: attrs.medical.sports_science,
                                },
                            });
                        }
                    }
                }
            }
        }

        Err(format!("no staff member with id {staff_id}"))
    });

    to_owned_ptr(json)
}
