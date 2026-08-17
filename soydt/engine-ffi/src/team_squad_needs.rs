//! Team squad-needs export — backs a new "Squad Needs" panel on React's
//! `/teams/:teamId` overview page. Reuses `team_finances.rs`'s team-lookup
//! pattern (walk continents → countries → clubs, find the club whose
//! `club.teams.teams` contains `team_id`), then projects
//! `core::transfers::FirstTeamSquadNeeds::for_club` — a pure, stateless
//! snapshot of how short the main team is against fixed per-position-group
//! minimums (see `open-football/src/core/src/transfers/squad_needs.rs`).
//! No simplification here — the whole struct is small and every field is
//! directly meaningful, so it's exposed verbatim. See
//! docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::transfers::FirstTeamSquadNeeds;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamSquadNeedsJson {
    main_team_size: u32,
    total_missing: u32,
    urgent: bool,
    gk_count: u32,
    gk_missing: u32,
    def_count: u32,
    def_missing: u32,
    mid_count: u32,
    mid_missing: u32,
    fwd_count: u32,
    fwd_missing: u32,
}

impl From<FirstTeamSquadNeeds> for TeamSquadNeedsJson {
    fn from(n: FirstTeamSquadNeeds) -> Self {
        TeamSquadNeedsJson {
            main_team_size: n.main_team_size as u32,
            total_missing: n.total_missing as u32,
            urgent: n.urgent,
            gk_count: n.gk_count as u32,
            gk_missing: n.gk_missing as u32,
            def_count: n.def_count as u32,
            def_missing: n.def_missing as u32,
            mid_count: n.mid_count as u32,
            mid_missing: n.mid_missing as u32,
            fwd_count: n.fwd_count as u32,
            fwd_missing: n.fwd_missing as u32,
        }
    }
}

/// Squad-depth shortfall snapshot for the club that owns `team_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_squad_needs(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_squad_needs", || -> Result<TeamSquadNeedsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if club.teams.teams.iter().any(|t| t.id == team_id) {
                    return Ok(FirstTeamSquadNeeds::for_club(club).into());
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
