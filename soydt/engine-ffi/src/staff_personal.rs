//! Staff "Personal" export — coaching style/license, personality,
//! job satisfaction/fatigue, current contract and recent-performance
//! metrics. Deliberately simplified (per the migration plan, same spirit
//! as `player_personal.rs`): no SVG radar-chart geometry (React renders
//! the raw personality values plainly), no recent-events feed
//! (`Staff::recent_events`) and no scout-workload/monitoring table
//! (`CoachMemoryStore`) — those are UI-only lists layered on top of the
//! core attributes this export already carries. Every field below is a
//! direct passthrough/percentage-conversion of a value that already
//! exists on `core::club::staff::model::staff::Staff`.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct StaffPersonalJson {
    // Staff profile
    coaching_style: String,
    license: String,
    determination: u8,
    man_management: u8,
    motivating: u8,
    discipline: u8,

    // Behaviour / workload
    behaviour: String,
    job_satisfaction_pct: u8,
    fatigue_pct: u8,

    // Current contract (None when unattached, e.g. free agent staff)
    role: Option<String>,
    salary: Option<u32>,
    contract_expiry: Option<String>,

    // Recent performance (Staff::recent_performance, 0.0-1.0 multipliers -> pct)
    training_effectiveness_pct: u8,
    player_development_pct: u8,
    injury_prevention_pct: u8,
    tactical_implementation_pct: u8,

    // Personality (PersonAttributes, 0.0-20.0 scale)
    adaptability: f32,
    ambition: f32,
    controversy: f32,
    loyalty: f32,
    pressure: f32,
    professionalism: f32,
    sportsmanship: f32,
    temperament: f32,
}

fn pct(v: f32) -> u8 {
    (v * 100.0).round().clamp(0.0, 100.0) as u8
}

/// Personal/attributes tab for one staff member — searches every club's
/// every team's staff roster across the current world (or scoped
/// subset), same O(clubs × staff) lookup pattern as `engine_get_staff`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_staff_personal(handle: *mut GameHandle, staff_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_staff_personal", || -> Result<StaffPersonalJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(s) = team.staffs.iter().find(|s| s.id == staff_id) {
                            let mental = &s.staff_attributes.mental;
                            let person = &s.attributes;
                            let perf = &s.recent_performance;

                            return Ok(StaffPersonalJson {
                                coaching_style: format!("{:?}", s.coaching_style),
                                license: format!("{:?}", s.license),
                                determination: mental.determination,
                                man_management: mental.man_management,
                                motivating: mental.motivating,
                                discipline: mental.discipline,

                                behaviour: s.behaviour.as_str().to_string(),
                                job_satisfaction_pct: s.job_satisfaction.round().clamp(0.0, 100.0) as u8,
                                fatigue_pct: s.fatigue.round().clamp(0.0, 100.0) as u8,

                                role: s.contract.as_ref().map(|c| format!("{:?}", c.position)),
                                salary: s.contract.as_ref().map(|c| c.salary),
                                contract_expiry: s.contract.as_ref().map(|c| c.expired.format("%d.%m.%Y").to_string()),

                                training_effectiveness_pct: pct(perf.training_effectiveness),
                                player_development_pct: pct(perf.player_development_rate),
                                injury_prevention_pct: pct(perf.injury_prevention_rate),
                                tactical_implementation_pct: pct(perf.tactical_implementation),

                                adaptability: person.adaptability,
                                ambition: person.ambition,
                                controversy: person.controversy,
                                loyalty: person.loyalty,
                                pressure: person.pressure,
                                professionalism: person.professionalism,
                                sportsmanship: person.sportsmanship,
                                temperament: person.temperament,
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
