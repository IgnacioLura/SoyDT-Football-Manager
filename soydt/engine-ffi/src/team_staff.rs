//! Club team staff roster export — mirrors the original app's team staff
//! tab. Unlike the original (which buckets staff into ~6 role groups —
//! management / coaching / medical / scouting / boardroom / media), this
//! export returns one flat list sorted by last name, with a `role` string
//! per row (`format!("{:?}", position)`, same placeholder-enum pattern used
//! by `engine_get_national_staff`). React/SoyDT can re-introduce grouping
//! client-side later if needed.
//!
//! Staff with no contract, or a contract whose `position` is
//! `StaffPosition::Free`, are skipped — they aren't actively serving in
//! that role (mirrors the free-agent-staff pool concept in `core`).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use core::{Country, StaffPosition};
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamStaffMemberJson {
    id: u32,
    first_name: String,
    last_name: String,
    role: String,
    country_code: String,
    country_name: String,
    age: u8,
    wage: f64,
}

/// Club team staff roster: mirrors the original's team-staff view, but as
/// a single flat list (see module docs) rather than the original's
/// 6-bucket grouping.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_staff(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_staff", || -> Result<Vec<TeamStaffMemberJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let all_countries: Vec<&Country> = game.data().continents.iter().flat_map(|c| c.countries.iter()).collect();

        let team = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .flat_map(|c| c.clubs.iter())
            .flat_map(|c| c.teams.teams.iter())
            .find(|t| t.id == team_id)
            .ok_or_else(|| format!("no team with id {team_id}"))?;

        let mut staff: Vec<TeamStaffMemberJson> = team
            .staffs
            .iter()
            .filter_map(|s| {
                let contract = s.contract.as_ref()?;
                if contract.position == StaffPosition::Free {
                    return None;
                }
                let nationality = all_countries.iter().find(|c| c.id == s.country_id);
                Some(TeamStaffMemberJson {
                    id: s.id,
                    first_name: s.full_name.first_name.clone(),
                    last_name: s.full_name.last_name.clone(),
                    role: format!("{:?}", contract.position),
                    country_code: nationality.map(|c| c.code.clone()).unwrap_or_default(),
                    country_name: nationality.map(|c| c.name.clone()).unwrap_or_default(),
                    age: DateUtils::age(s.birth_date, now),
                    wage: contract.salary as f64,
                })
            })
            .collect();

        staff.sort_by(|a, b| a.last_name.cmp(&b.last_name));

        Ok(staff)
    });

    to_owned_ptr(json)
}
