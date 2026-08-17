//! Country transfer-market export — backs a new "Transfer Market" tab on
//! React's `/countries/:countryId` sub-pages (`countries/tabs.tsx`). Reads
//! `Country.transfer_market: core::transfers::TransferMarket`, already
//! populated by the AI transfer pipeline — no new computation needed.
//!
//! SIMPLIFIED: only `Available`/`InNegotiation` listings are returned
//! (`Completed`/`Cancelled` are historical noise here — `transfers.rs`'s
//! `engine_get_league_transfers` already covers completed deals). Live
//! negotiation/offer state (`TransferMarket.negotiations`) is deliberately
//! not exposed — internal AI bookkeeping with no stable browsable shape.
//! See docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::transfers::TransferListingStatus;
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TransferListingJson {
    player_id: u32,
    player_name: String,
    position: String,
    age: u8,
    team_id: u32,
    team_name: String,
    team_slug: String,
    asking_price: f64,
    listing_type: String,
    status: String,
    listed_date: String,
}

#[derive(Serialize)]
struct CountryTransferMarketJson {
    transfer_window_open: bool,
    listings: Vec<TransferListingJson>,
}

/// Current transfer-window status and active listings for `country_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_country_transfer_market(handle: *mut GameHandle, country_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_country_transfer_market", || -> Result<CountryTransferMarketJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let country = game
            .data()
            .country(country_id)
            .ok_or_else(|| format!("no country with id {country_id}"))?;

        let listings = country
            .transfer_market
            .listings
            .iter()
            .filter(|l| matches!(l.status, TransferListingStatus::Available | TransferListingStatus::InNegotiation))
            .filter_map(|l| {
                let (player, team) = game.data().player_with_team(l.player_id)?;
                Some(TransferListingJson {
                    player_id: player.id,
                    player_name: format!("{} {}", player.full_name.first_name, player.full_name.last_name),
                    position: player.positions.primary().map(|p| p.get_short_name().to_string()).unwrap_or_default(),
                    age: DateUtils::age(player.birth_date, now),
                    team_id: team.id,
                    team_name: team.name.clone(),
                    team_slug: team.slug.clone(),
                    asking_price: l.asking_price.amount,
                    listing_type: format!("{:?}", l.listing_type),
                    status: format!("{:?}", l.status),
                    listed_date: l.listed_date.to_string(),
                })
            })
            .collect();

        Ok(CountryTransferMarketJson {
            transfer_window_open: country.transfer_market.transfer_window_open,
            listings,
        })
    });

    to_owned_ptr(json)
}
