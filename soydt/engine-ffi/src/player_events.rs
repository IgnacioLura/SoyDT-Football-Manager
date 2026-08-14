//! Player career event log — SIMPLIFIED port of the original app's
//! `open-football/src/web/src/player/events` tab. The original renders
//! every `HappinessEvent` variant (manager talks, dressing-room friction,
//! match-performance reactions, national-team call-ups, contract talk,
//! …) as a rich decision/severity-tagged card. That full taxonomy is not
//! reproduced here: this export is a flat, chronological list of only the
//! three most game-mechanically-significant categories — transfers
//! (`core::transfers::CompletedTransfer`, same source as
//! `engine_get_player_transfers`), awards (`Player::awards_count.timeline`,
//! same source as `engine_get_player_awards`), and injury recovery swings
//! (`Player::happiness.recent_events` filtered to `InjuryReturn` /
//! `InjurySetback`, the only injury-related `HappinessEventType`
//! variants — there is no persisted "date player got injured" log, only
//! the player's *current* injury state, which is added as a synthetic
//! "currently injured" row dated today when present). No decision cards,
//! no severity styling, no partner links, no i18n.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::{AwardReputationKind, HappinessEventType};
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerEventJson {
    date: String,
    kind: String,
    description: String,
}

fn award_label(kind: &AwardReputationKind) -> &'static str {
    match kind {
        AwardReputationKind::PlayerOfTheWeek => "Player of the Week",
        AwardReputationKind::YoungPlayerOfTheWeek => "Young Player of the Week",
        AwardReputationKind::TeamOfTheWeekSelection => "Team of the Week",
        AwardReputationKind::YoungTeamOfTheWeekSelection => "Young Team of the Week",
        AwardReputationKind::PlayerOfTheMonth => "Player of the Month",
        AwardReputationKind::YoungPlayerOfTheMonth => "Young Player of the Month",
        AwardReputationKind::TeamOfTheMonthSelection => "Team of the Month",
        AwardReputationKind::YoungTeamOfTheMonthSelection => "Young Team of the Month",
        AwardReputationKind::TeamOfTheSeasonSelection => "Team of the Season",
        AwardReputationKind::TeamOfTheYearSelection => "Team of the Year",
        AwardReputationKind::PlayerOfTheSeason => "Player of the Season",
        AwardReputationKind::YoungPlayerOfTheSeason => "Young Player of the Season",
        AwardReputationKind::LeagueTopScorer => "League Top Scorer",
        AwardReputationKind::LeagueTopAssists => "League Top Assists",
        AwardReputationKind::LeagueGoldenGlove => "League Golden Glove",
        AwardReputationKind::ContinentalPlayerOfYear => "Continental Player of the Year",
        AwardReputationKind::WorldPlayerOfYear => "World Player of the Year",
        AwardReputationKind::DomesticCupWinner => "Domestic Cup Winner",
    }
}

/// Chronological (newest first) event log for one player — transfers,
/// awards, and injury-recovery swings only. See module docs for what was
/// dropped versus the original app's Events tab.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_events(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_events", || -> Result<Vec<PlayerEventJson>, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let today = game.data().date.date();

        let mut events: Vec<PlayerEventJson> = Vec::new();

        // Transfers — every completed move across every country, same
        // source as `engine_get_player_transfers`.
        for t in game
            .data()
            .continents
            .iter()
            .flat_map(|c| c.countries.iter())
            .flat_map(|c| c.transfer_market.transfer_history.iter())
            .filter(|t| t.player_id == player_id)
        {
            let description = if matches!(t.transfer_type, core::transfers::TransferType::Free) {
                format!("Free transfer: {} to {}", t.from_team_name, t.to_team_name)
            } else if matches!(t.transfer_type, core::transfers::TransferType::Loan(_)) {
                format!("Loan move: {} to {}", t.from_team_name, t.to_team_name)
            } else {
                format!(
                    "Transferred from {} to {} for {:.0}",
                    t.from_team_name, t.to_team_name, t.fee.amount
                )
            };
            events.push(PlayerEventJson {
                date: t.transfer_date.format("%d.%m.%Y").to_string(),
                kind: "transfer".to_string(),
                description,
            });
        }

        // Player lookup for awards + happiness + current injury state.
        let mut found: Option<&core::Player> = None;
        'outer: for continent in &game.data().continents {
            for country in &continent.countries {
                for club in &country.clubs {
                    for team in &club.teams.teams {
                        if let Some(p) = team.players.players.iter().find(|p| p.id == player_id) {
                            found = Some(p);
                            break 'outer;
                        }
                    }
                }
            }
        }
        let player = found.ok_or_else(|| format!("no player with id {player_id}"))?;

        // Awards — dated entries from the lifetime award timeline.
        for entry in &player.awards_count.timeline {
            events.push(PlayerEventJson {
                date: entry.date.format("%d.%m.%Y").to_string(),
                kind: "award".to_string(),
                description: format!("Won {}", award_label(&entry.kind)),
            });
        }

        // Injury recovery swings — only the two happiness-event variants
        // that touch injuries; no persisted "got injured" log exists.
        for event in &player.happiness.recent_events {
            let description = match event.event_type {
                HappinessEventType::InjuryReturn => "Returned from injury",
                HappinessEventType::InjurySetback => "Suffered a recovery setback",
                _ => continue,
            };
            let date = today - chrono::Duration::days(event.days_ago as i64);
            events.push(PlayerEventJson {
                date: date.format("%d.%m.%Y").to_string(),
                kind: "injury".to_string(),
                description: description.to_string(),
            });
        }

        // Current injury, if any — synthetic "as of today" row since the
        // engine keeps only live injury state, not a dated onset log.
        if let Some(injury_type) = player.player_attributes.injury_type {
            events.push(PlayerEventJson {
                date: today.format("%d.%m.%Y").to_string(),
                kind: "injury".to_string(),
                description: format!(
                    "Currently injured: {injury_type} ({} days remaining)",
                    player.player_attributes.injury_days_remaining
                ),
            });
        }

        // Newest first, matching `engine_get_player_transfers`.
        events.sort_by(|a, b| b.date.cmp(&a.date));

        Ok(events)
    });

    to_owned_ptr(json)
}
