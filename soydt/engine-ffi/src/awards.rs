//! League awards export — simplified to season honours only (player of
//! season, young player of season, top scorer, top assists, golden glove).
//! The original page's weekly/monthly TOTW pitch graphics, stat-leader
//! grids, and full history archive are a lot more view-model machinery
//! (see MIGRATION_CHECKLIST.md) and are deferred.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::{Country, Player};
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct NamedAwardJson {
    player_id: u32,
    player_name: String,
    club_name: String,
}

#[derive(Serialize)]
struct SeasonAwardsJson {
    season_end_date: String,
    player_of_season: Option<NamedAwardJson>,
    young_player_of_season: Option<NamedAwardJson>,
    top_scorer: Option<NamedAwardJson>,
    top_assists: Option<NamedAwardJson>,
    golden_glove: Option<NamedAwardJson>,
}

fn find_player_and_club<'a>(country: &'a Country, player_id: u32) -> Option<(&'a Player, String)> {
    for club in &country.clubs {
        for team in &club.teams.teams {
            if let Some(player) = team.players.players.iter().find(|p| p.id == player_id) {
                return Some((player, club.name.clone()));
            }
        }
    }
    None
}

fn named_award(country: &Country, player_id: Option<u32>) -> Option<NamedAwardJson> {
    let (player, club_name) = find_player_and_club(country, player_id?)?;
    Some(NamedAwardJson {
        player_id: player.id,
        player_name: format!("{} {}", player.full_name.first_name, player.full_name.last_name),
        club_name,
    })
}

/// Latest season's honours for `league_id`. Returns `null` `data` fields
/// (all `Option`) if no season has completed yet.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_league_awards(handle: *mut GameHandle, league_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_league_awards", || -> Result<Option<SeasonAwardsJson>, String> {
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

        let league = country.leagues.leagues.iter().find(|l| l.id == league_id).unwrap();

        let Some(snapshot) = league.awards.season_awards.last() else {
            return Ok(None);
        };

        Ok(Some(SeasonAwardsJson {
            season_end_date: snapshot.season_end_date.format("%d.%m.%Y").to_string(),
            player_of_season: named_award(country, snapshot.player_of_season),
            young_player_of_season: named_award(country, snapshot.young_player_of_season),
            top_scorer: named_award(country, snapshot.top_scorer),
            top_assists: named_award(country, snapshot.top_assists),
            golden_glove: named_award(country, snapshot.golden_glove),
        }))
    });

    to_owned_ptr(json)
}
