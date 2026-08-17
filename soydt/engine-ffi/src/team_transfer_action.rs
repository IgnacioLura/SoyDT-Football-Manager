//! DT/"Mi Equipo" manual transfer export — lets a human user move a player
//! between two clubs directly (buy/sell), no negotiation/AI-market
//! involvement. Named differently from the existing read-only
//! `team_transfers.rs`/`transfers.rs` (which only ever read
//! `transfer_history`) since this is the first *mutating* transfer export.
//!
//! Reuses the exact same core plumbing the autonomous AI transfer pipeline
//! already uses for a real move (`open-football/src/core/src/country/result/transfers/execution.rs`),
//! simplified: no negotiation, no capacity/rival/social-reaction checks —
//! just the finance + roster mutation sequence itself.
//!
//! Two mutable club borrows can't be held at once (the borrow checker can't
//! see through `continents -> countries -> clubs` that a selling and buying
//! club are different objects), so — mirroring how `execution.rs` itself
//! sequences this — the mutation happens in two back-to-back scoped phases
//! with the extracted `Player` held as an owned local in between, and every
//! cross-club read (both `TeamInfo`s, the buyer's affordability) happens
//! *before* either mutable phase starts.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::club::player::events::TransferCompletion;
use core::shared::currency::{Currency, CurrencyValue};
use core::transfers::{CompletedTransfer, TransferType};
use core::TeamInfo;
use serde::Serialize;
use std::os::raw::c_char;

/// Contract length assumed for a manually-completed transfer, for the
/// buyer's amortization bookkeeping (`register_transfer_purchase`'s
/// `contract_years`) — the DT flow has no contract-length negotiation step,
/// so this is a fixed, reasonable default rather than a user input.
const DEFAULT_CONTRACT_YEARS: u8 = 3;

#[derive(Serialize)]
struct TransferActionResultJson {
    player_id: u32,
    from_team_id: u32,
    to_team_id: u32,
    fee: f64,
}

fn team_info_for(club: &core::Club, team: &core::Team) -> TeamInfo {
    TeamInfo {
        name: club.name.clone(),
        slug: team.slug.clone(),
        reputation: team.reputation.world,
        league_name: String::new(),
        league_slug: String::new(),
    }
}

/// Moves `player_id` from `from_team_id` to `to_team_id` for `fee`: credits
/// the selling club, debits the buying club (rejected if it can't afford
/// the fee against its configured transfer budget — a club with no budget
/// configured is unconstrained, same semantics the AI pipeline already
/// uses), and moves the player's roster entry + contract/history. Works in
/// either direction — "the DT buys" and "the DT sells" are the same call
/// with the two team ids swapped.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_transfer_player(
    handle: *mut GameHandle,
    player_id: u32,
    from_team_id: u32,
    to_team_id: u32,
    fee: f64,
) -> *mut c_char {
    let json = run_guarded("engine_transfer_player", || -> Result<TransferActionResultJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &mut *handle };

        if from_team_id == to_team_id {
            return Err("from_team_id and to_team_id must differ".to_string());
        }

        // Read phase — resolve club ids and build both TeamInfos, and check
        // affordability, all before any mutation starts.
        let from_club_id = game.data().team(from_team_id).map(|t| t.club_id)
            .ok_or_else(|| format!("no team with id {from_team_id}"))?;
        let to_club_id = game.data().team(to_team_id).map(|t| t.club_id)
            .ok_or_else(|| format!("no team with id {to_team_id}"))?;

        let from_club = game.data().club(from_club_id).ok_or_else(|| format!("no club with id {from_club_id}"))?;
        let from_team = from_club.teams.find(from_team_id).ok_or_else(|| format!("no team with id {from_team_id}"))?;
        if !from_team.players.contains(player_id) {
            return Err(format!("player {player_id} is not on team {from_team_id}'s roster"));
        }
        let from_info = team_info_for(from_club, from_team);

        let to_club = game.data().club(to_club_id).ok_or_else(|| format!("no club with id {to_club_id}"))?;
        let to_team = to_club.teams.find(to_team_id).ok_or_else(|| format!("no team with id {to_team_id}"))?;
        let to_info = team_info_for(to_club, to_team);
        if !to_club.finance.can_afford_transfer(fee) {
            return Err("insufficient_budget".to_string());
        }

        // Country ids for the transfer-history push below — resolved now,
        // before any mutation, since `country_by_club` needs an immutable
        // borrow that a later mutable one would conflict with.
        let from_country_id = game.data().country_by_club(from_club_id).map(|c| c.id)
            .ok_or_else(|| format!("no country found for club {from_club_id}"))?;
        let to_country_id = game.data().country_by_club(to_club_id).map(|c| c.id)
            .ok_or_else(|| format!("no country found for club {to_club_id}"))?;

        let date = game.data().date.date();

        // Mutation phase 1 (selling side) — extract the player, credit the
        // seller. This borrow ends before phase 2 starts.
        let mut player = {
            let from_club_mut = game.data_mut().club_mut(from_club_id)
                .ok_or_else(|| format!("no club with id {from_club_id}"))?;
            let from_team_mut = from_club_mut.teams.find_mut(from_team_id)
                .ok_or_else(|| format!("no team with id {from_team_id}"))?;
            let player = from_team_mut
                .players
                .take_player(&player_id)
                .ok_or_else(|| format!("player {player_id} is not on team {from_team_id}'s roster"))?;
            from_club_mut.finance.add_transfer_income(fee);
            player
        };

        // Captured before `player` moves into the buying roster below —
        // needed for the `CompletedTransfer` record pushed in phase 3.
        let player_name = format!("{} {}", player.full_name.first_name, player.full_name.last_name);

        // Mutation phase 2 (buying side) — separate borrow, `player` is an
        // owned local carried across the gap.
        {
            let to_club_mut = game.data_mut().club_mut(to_club_id)
                .ok_or_else(|| format!("no club with id {to_club_id}"))?;

            player.complete_transfer(TransferCompletion {
                from: &from_info,
                history_source: &from_info,
                to: &to_info,
                fee,
                date,
                selling_club_id: from_club_id,
                buying_club_id: to_club_id,
                loan_buyout: false,
                agreed_wage: None,
                buying_league_reputation: to_info.reputation,
                selling_league_reputation: from_info.reputation,
                source_is_rival: false,
                record_sell_on: None,
                personal_terms: None,
                record_decision: true,
            });

            // Pre-checked above via `can_afford_transfer`; this call can
            // only return `false` here if the budget changed between the
            // read and mutation phases, which nothing else can do within
            // one single-threaded FFI call.
            if !to_club_mut.finance.register_transfer_purchase(fee, DEFAULT_CONTRACT_YEARS) {
                return Err("insufficient_budget".to_string());
            }

            let to_team_mut = to_club_mut.teams.find_mut(to_team_id)
                .ok_or_else(|| format!("no team with id {to_team_id}"))?;
            to_team_mut.players.add(player);
        }

        // Mutation phase 3 — log the deal into each involved country's own
        // `transfer_market.transfer_history`, the Vec `engine_get_league_transfers`/
        // `engine_get_team_transfers` actually read from. `player.complete_transfer`
        // above only updates the *player's* own career record (decision
        // history, contract) — it never touches this country-level log,
        // which is otherwise only ever appended to by the AI negotiation
        // pipeline's `TransferMarket::complete_transfer` (a different
        // method, keyed by negotiation id — this manual DT flow has no
        // negotiation to key off, so the record is built directly here).
        // Without this, a DT-initiated buy/sell would move the player and
        // the money correctly but never show up on the transfers page.
        let completed = CompletedTransfer::new(
            player_id,
            player_name,
            from_club_id,
            from_team_id,
            from_info.name.clone(),
            to_club_id,
            to_info.name.clone(),
            date,
            CurrencyValue { amount: fee, currency: Currency::Usd },
            TransferType::Permanent,
        );
        if let Some(country) = game.data_mut().country_mut(to_country_id) {
            country.transfer_market.transfer_history.push(completed.clone());
        }
        if from_country_id != to_country_id {
            if let Some(country) = game.data_mut().country_mut(from_country_id) {
                country.transfer_market.transfer_history.push(completed);
            }
        }

        Ok(TransferActionResultJson { player_id, from_team_id, to_team_id, fee })
    });

    to_owned_ptr(json)
}
