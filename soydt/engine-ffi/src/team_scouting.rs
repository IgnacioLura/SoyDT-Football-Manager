//! Team-scoped scouting export — simplified port of `teams/scouting/index.html`,
//! whose original has six sub-tabs (overview/monitoring/reports/assignments/
//! meetings/database) backed by the club's full recruitment department
//! (`core::transfers::pipeline::ClubTransferPlan`: scouting assignments,
//! detailed reports, recruitment meetings with votes/decisions, shadow
//! reports, known-player memory, transfer-request context). This export
//! collapses all of that to the one table that answers "who are our scouts
//! watching right now": the club's active `scout_monitoring` rows
//! (`core::transfers::pipeline::recruitment::ScoutPlayerMonitoring`), each
//! resolved to the target player's live name/position/club and the
//! assigned scout's name — see MIGRATION_CHECKLIST.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct ScoutMonitoringItemJson {
    player_id: u32,
    player_name: String,
    position: String,
    age: u8,
    current_club_name: String,
    scout_id: u32,
    scout_name: String,
    status: String,
    started_on: String,
    last_observed: String,
    times_watched: u16,
    assessed_ability: u8,
    assessed_potential: u8,
    confidence_pct: u8,
    estimated_value: f64,
}

/// Active/recently-active scouting monitoring rows for the club that owns
/// `team_id`, newest-observed first. Looks up the team's club the same way
/// `engine_get_team` does (`club.teams.teams` search), then for each
/// `is_active_interest()` monitoring row resolves the target player and the
/// assigned scout by walking the whole world once (same O(clubs × players)
/// cross-club lookup `engine_get_player` uses) — the scouted player is
/// usually at a *different* club than the one doing the scouting.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_scouting(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_scouting", || -> Result<Vec<ScoutMonitoringItemJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let scouting_club = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .flat_map(|c| c.clubs.iter())
            .find(|club| club.teams.teams.iter().any(|t| t.id == team_id))
            .ok_or_else(|| format!("no team with id {team_id}"))?;

        let scout_name = |scout_staff_id: u32| -> String {
            scouting_club
                .teams
                .teams
                .iter()
                .flat_map(|t| t.staffs.iter())
                .find(|s| s.id == scout_staff_id)
                .map(|s| format!("{} {}", s.full_name.first_name, s.full_name.last_name))
                .unwrap_or_default()
        };

        let mut monitoring: Vec<&core::transfers::pipeline::ScoutPlayerMonitoring> = scouting_club
            .transfer_plan
            .scout_monitoring
            .iter()
            .filter(|m| m.is_active_interest())
            .collect();
        // Newest-observed first — sort on the real date before formatting,
        // not on the "%d.%m.%Y" display string (which doesn't sort
        // chronologically).
        monitoring.sort_by(|a, b| b.last_observed.cmp(&a.last_observed));

        let items: Vec<ScoutMonitoringItemJson> = monitoring
            .into_iter()
            .filter_map(|m| {
                let mut found: Option<ScoutMonitoringItemJson> = None;
                'search: for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
                    for club in &country.clubs {
                        for team in &club.teams.teams {
                            if let Some(p) = team.players.players.iter().find(|p| p.id == m.player_id) {
                                found = Some(ScoutMonitoringItemJson {
                                    player_id: p.id,
                                    player_name: format!("{} {}", p.full_name.first_name, p.full_name.last_name),
                                    position: p.positions.primary().map(|pos| format!("{pos:?}")).unwrap_or_else(|| "Unknown".to_string()),
                                    age: DateUtils::age(p.birth_date, now),
                                    current_club_name: club.name.clone(),
                                    scout_id: m.scout_staff_id,
                                    scout_name: scout_name(m.scout_staff_id),
                                    status: format!("{:?}", m.status),
                                    started_on: m.started_on.format("%d.%m.%Y").to_string(),
                                    last_observed: m.last_observed.format("%d.%m.%Y").to_string(),
                                    times_watched: m.times_watched,
                                    assessed_ability: m.current_assessed_ability,
                                    assessed_potential: m.current_assessed_potential,
                                    confidence_pct: (m.confidence.clamp(0.0, 1.0) * 100.0).round() as u8,
                                    estimated_value: m.estimated_value,
                                });
                                break 'search;
                            }
                        }
                    }
                }
                found
            })
            .collect();

        Ok(items)
    });

    to_owned_ptr(json)
}
