//! Player career transfer history — mirrors the "own transfer history"
//! slice of the original app's player transfer-market sub-page (SIMPLIFIED:
//! only the completed-transfers history is exported; live listing status,
//! negotiations, and monitoring sections are deferred — see
//! MIGRATION_CHECKLIST.md). Same projection shape as `transfers.rs`'
//! `engine_get_league_transfers`, filtered by `player_id` across every
//! country in the world instead of by league.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerTransferJson {
    from_team_name: String,
    to_team_name: String,
    fee: f64,
    is_loan: bool,
    is_free: bool,
    date: String,
}

/// Completed transfers for one player across their whole career, newest
/// first. Searches every country's transfer history (a player may have
/// moved between countries), unlike the league-scoped export.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_transfers(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_transfers", || -> Result<Vec<PlayerTransferJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let mut transfers: Vec<_> = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .flat_map(|c| c.transfer_market.transfer_history.iter())
            .filter(|t| t.player_id == player_id)
            .collect();

        // Newest first — career history, most recent move on top.
        transfers.sort_by(|a, b| b.transfer_date.cmp(&a.transfer_date));

        let transfers = transfers
            .into_iter()
            .map(|t| PlayerTransferJson {
                from_team_name: t.from_team_name.clone(),
                to_team_name: t.to_team_name.clone(),
                fee: t.fee.amount,
                is_loan: matches!(t.transfer_type, core::transfers::TransferType::Loan(_)),
                is_free: matches!(t.transfer_type, core::transfers::TransferType::Free),
                date: t.transfer_date.format("%d.%m.%Y").to_string(),
            })
            .collect();

        Ok(transfers)
    });

    to_owned_ptr(json)
}
