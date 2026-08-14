//! Player contract export — simplified scope: only the core contract terms
//! (club, shirt number, contract type, squad status, salary, dates,
//! transfer-listed flag). Loan detail, bonuses, and clauses are deliberately
//! skipped for this pass (see MIGRATION_CHECKLIST.md).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::PlayerClubContract;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct ContractJson {
    club_name: String,
    shirt_number: Option<u8>,
    contract_type: String,
    squad_status: String,
    salary_weekly: f64,
    salary_annual: f64,
    started: Option<String>,
    expiration: String,
    is_transfer_listed: bool,
}

fn to_contract_json(contract: &PlayerClubContract, club_name: String) -> ContractJson {
    ContractJson {
        club_name,
        shirt_number: contract.shirt_number,
        contract_type: format!("{:?}", contract.contract_type),
        squad_status: format!("{:?}", contract.squad_status),
        // `salary` is stored as an annual figure (see
        // `core::Team::get_annual_salary`, which sums `contract.salary`
        // directly with no scaling) — divide by 52 for the weekly figure.
        salary_weekly: contract.salary as f64 / 52.0,
        salary_annual: contract.salary as f64,
        started: contract.started.map(|d| d.format("%d.%m.%Y").to_string()),
        expiration: contract.expiration.format("%d.%m.%Y").to_string(),
        is_transfer_listed: contract.is_transfer_listed,
    }
}

/// Core contract terms for one player, or `null` `data` if the player has no
/// active contract (e.g. a free agent). Loan sub-detail, bonuses and clauses
/// are intentionally omitted from this simplified pass.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_contract(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_contract", || -> Result<Option<ContractJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(p) = team.players.players.iter().find(|p| p.id == player_id) {
                            return Ok(p
                                .contract
                                .as_ref()
                                .map(|c| to_contract_json(c, club.name.clone())));
                        }
                    }
                }
            }
        }

        Err(format!("no player with id {player_id}"))
    });

    to_owned_ptr(json)
}
