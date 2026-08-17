//! Team board export — backs React's `/teams/:teamId/board` page. Reuses
//! `team_finances.rs`'s team-lookup pattern (walk continents → countries →
//! clubs, find the club whose `club.teams.teams` contains `team_id`), then
//! reads `Club.board: ClubBoard` (see
//! `open-football/src/core/src/club/board/board.rs`) and projects it into
//! a flat DTO plus a promises list.
//!
//! Deliberately simplified vs. the full `ClubBoard` struct: no
//! `latest_scores` internal component-score breakdown, no manager
//! hiring-market/shortlist fields, no live transfer-proposal/dossier
//! fields, no facility-review state — just the steady-state club status a
//! player would want to see. See
//! docs/superpowers/specs/2026-08-17-club-board-design.md for the full
//! scope rationale.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct BoardPromiseJson {
    promise_type: String,
    due_date: String,
    overdue: bool,
}

#[derive(Serialize)]
struct SeasonTargetsJson {
    transfer_budget: i32,
    wage_budget: i32,
    max_squad_size: u8,
    min_squad_size: u8,
    expected_position: u8,
    min_acceptable_position: u8,
}

#[derive(Serialize)]
struct TeamBoardJson {
    confidence_level: i32,
    mood: String,
    manager_on_final_warning: bool,
    poor_mood_months: u8,
    chairman_ambition: String,
    chairman_patience: String,
    chairman_manager_loyalty: u8,
    ownership_type: String,
    ownership_wealth: u8,
    ownership_interference: u8,
    ownership_risk_tolerance: u8,
    ownership_exit_pressure: u8,
    supporter_pressure: u8,
    media_pressure: u8,
    dressing_room_pressure: u8,
    financial_pressure: u8,
    regulatory_pressure: u8,
    trust_results: u8,
    trust_finances: u8,
    trust_squad_building: u8,
    trust_communication: u8,
    style_alignment: u8,
    season_targets: Option<SeasonTargetsJson>,
    vision_playing_style: String,
    vision_youth_focus: String,
    vision_signing_preference: String,
    vision_financial_stance: String,
    vision_long_term_goal: Option<String>,
    vision_long_term_horizon_seasons: u8,
    promises: Vec<BoardPromiseJson>,
    takeover_status: String,
    takeover_months_in_status: u8,
}

/// Current board-of-directors status for the club that owns `team_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_board(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_board", || -> Result<TeamBoardJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let today = game.data().date.date();

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if club.teams.teams.iter().any(|t| t.id == team_id) {
                    let board = &club.board;

                    let season_targets = board.season_targets.as_ref().map(|t| SeasonTargetsJson {
                        transfer_budget: t.transfer_budget,
                        wage_budget: t.wage_budget,
                        max_squad_size: t.max_squad_size,
                        min_squad_size: t.min_squad_size,
                        expected_position: t.expected_position,
                        min_acceptable_position: t.min_acceptable_position,
                    });

                    let promises = board
                        .promises
                        .active()
                        .map(|p| BoardPromiseJson {
                            promise_type: format!("{:?}", p.promise_type),
                            due_date: p.due_date.to_string(),
                            overdue: p.is_overdue(today),
                        })
                        .collect();

                    return Ok(TeamBoardJson {
                        confidence_level: board.confidence.level,
                        mood: format!("{:?}", board.mood.state),
                        manager_on_final_warning: board.manager_on_final_warning,
                        poor_mood_months: board.poor_mood_months,
                        chairman_ambition: format!("{:?}", board.chairman.ambition),
                        chairman_patience: format!("{:?}", board.chairman.patience),
                        chairman_manager_loyalty: board.chairman.manager_loyalty,
                        ownership_type: format!("{:?}", board.ownership.ownership_type),
                        ownership_wealth: board.ownership.wealth,
                        ownership_interference: board.ownership.interference,
                        ownership_risk_tolerance: board.ownership.risk_tolerance,
                        ownership_exit_pressure: board.ownership.exit_pressure,
                        supporter_pressure: board.pressure.supporter_pressure,
                        media_pressure: board.pressure.media_pressure,
                        dressing_room_pressure: board.pressure.dressing_room_pressure,
                        financial_pressure: board.pressure.financial_pressure,
                        regulatory_pressure: board.pressure.regulatory_pressure,
                        trust_results: board.relationship.trust_results,
                        trust_finances: board.relationship.trust_finances,
                        trust_squad_building: board.relationship.trust_squad_building,
                        trust_communication: board.relationship.trust_communication,
                        style_alignment: board.relationship.style_alignment,
                        season_targets,
                        vision_playing_style: format!("{:?}", board.vision.playing_style),
                        vision_youth_focus: format!("{:?}", board.vision.youth_focus),
                        vision_signing_preference: format!("{:?}", board.vision.signing_preference),
                        vision_financial_stance: format!("{:?}", board.vision.financial_stance),
                        vision_long_term_goal: board.vision.long_term_goal.map(|g| format!("{g:?}")),
                        vision_long_term_horizon_seasons: board.vision.long_term_horizon_seasons,
                        promises,
                        takeover_status: format!("{:?}", board.takeover.status),
                        takeover_months_in_status: board.takeover.months_in_status,
                    });
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
