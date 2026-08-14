//! League transfers export — mirrors `leagues/transfers/index.html`'s
//! "Completed transfers" panel (permanent/loan split done client-side in
//! React, same as the original's tab toggle). Active negotiations are not
//! exported yet (deferred — see MIGRATION_CHECKLIST.md).

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct CompletedTransferJson {
    player_id: u32,
    player_name: String,
    from_team_id: u32,
    from_team_name: String,
    to_team_id: u32,
    to_team_name: String,
    fee: f64,
    is_loan: bool,
    is_free: bool,
    date: String,
}

/// Completed transfers involving any team in `league_id` (either side —
/// arrivals and departures both show up, same as the original page which
/// lists a league's transfer activity regardless of direction).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_league_transfers(handle: *mut GameHandle, league_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_league_transfers", || -> Result<Vec<CompletedTransferJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let country = game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .find(|c| c.leagues.leagues.iter().any(|l| l.id == league_id))
            .ok_or_else(|| format!("no country found for league {league_id}"))?;

        let league_team_ids: std::collections::HashSet<u32> = country
            .clubs
            .iter()
            .flat_map(|c| c.teams.with_league(league_id))
            .collect();

        // `CompletedTransfer` only carries `to_club_id` (not `to_team_id`),
        // so resolve the destination team via the club's first team in
        // this league — good enough for "does this transfer touch the
        // league" filtering; a club with a satellite team not in this
        // league would need a per-team id, which the core struct doesn't
        // record.
        let club_team_in_league = |club_id: u32| -> Option<u32> {
            country
                .clubs
                .iter()
                .find(|c| c.id == club_id)
                .and_then(|c| c.teams.teams.iter().find(|t| league_team_ids.contains(&t.id)))
                .map(|t| t.id)
        };

        let transfers = country
            .transfer_market
            .transfer_history
            .iter()
            .filter(|t| league_team_ids.contains(&t.from_team_id) || club_team_in_league(t.to_club_id).is_some())
            .map(|t| CompletedTransferJson {
                player_id: t.player_id,
                player_name: t.player_name.clone(),
                from_team_id: t.from_team_id,
                from_team_name: t.from_team_name.clone(),
                to_team_id: club_team_in_league(t.to_club_id).unwrap_or(t.to_club_id),
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
