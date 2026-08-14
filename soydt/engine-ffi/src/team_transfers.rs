//! Team-scoped transfers export — mirrors `teams/transfers/index.html`'s
//! "Incoming transfers" / "Outgoing transfers" panels (simplified: the
//! original also splits permanent vs. loan into four panels with a
//! season selector; here incoming/outgoing each combine permanent+loan
//! into one table, and there is no season filter — see
//! MIGRATION_CHECKLIST.md). Reuses the same field shape as
//! `engine_get_league_transfers` (`transfers.rs`), collapsed to a single
//! "other team" side since incoming/outgoing already imply direction.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamTransferItemJson {
    player_id: u32,
    player_name: String,
    other_team_name: String,
    fee: f64,
    is_loan: bool,
    is_free: bool,
    date: String,
}

#[derive(Serialize)]
struct TeamTransfersJson {
    incoming: Vec<TeamTransferItemJson>,
    outgoing: Vec<TeamTransferItemJson>,
}

/// Incoming and outgoing completed transfers for one team.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_transfers(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_transfers", || -> Result<TeamTransfersJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        // Find the team's club_id by walking continents -> countries ->
        // clubs -> teams (same traversal as `team.rs`'s `engine_get_team`),
        // and keep a reference to that country so we can scan its
        // transfer_market.transfer_history below.
        let mut club_id: Option<u32> = None;
        let mut found_country_idx: Option<(usize, usize)> = None; // (continent_idx, country_idx)
        for (ci, continent) in game.data().continents.iter().enumerate() {
            for (ki, country) in continent.countries.iter().enumerate() {
                for club in &country.clubs {
                    if club.teams.teams.iter().any(|t| t.id == team_id) {
                        club_id = Some(club.id);
                        found_country_idx = Some((ci, ki));
                        break;
                    }
                }
                if club_id.is_some() {
                    break;
                }
            }
            if club_id.is_some() {
                break;
            }
        }

        let club_id = club_id.ok_or_else(|| format!("no team with id {team_id}"))?;
        let (ci, ki) = found_country_idx.expect("club_id set implies country index set");
        let country = &game.data().continents[ci].countries[ki];

        let mut incoming = Vec::new();
        let mut outgoing = Vec::new();

        for t in &country.transfer_market.transfer_history {
            let is_loan = matches!(t.transfer_type, core::transfers::TransferType::Loan(_));
            let is_free = matches!(t.transfer_type, core::transfers::TransferType::Free);

            if t.to_club_id == club_id {
                incoming.push(TeamTransferItemJson {
                    player_id: t.player_id,
                    player_name: t.player_name.clone(),
                    other_team_name: t.from_team_name.clone(),
                    fee: t.fee.amount,
                    is_loan,
                    is_free,
                    date: t.transfer_date.format("%d.%m.%Y").to_string(),
                });
            } else if t.from_team_id == team_id {
                outgoing.push(TeamTransferItemJson {
                    player_id: t.player_id,
                    player_name: t.player_name.clone(),
                    other_team_name: t.to_team_name.clone(),
                    fee: t.fee.amount,
                    is_loan,
                    is_free,
                    date: t.transfer_date.format("%d.%m.%Y").to_string(),
                });
            }
        }

        Ok(TeamTransfersJson { incoming, outgoing })
    });

    to_owned_ptr(json)
}
