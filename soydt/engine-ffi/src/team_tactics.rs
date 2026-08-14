//! Team tactics export — backs React's `/teams/:teamId/tactics` page (the
//! formation/instructions view). Reuses `team.rs`'s team-lookup pattern
//! (walk continents/countries/clubs, `find` by id), then reads
//! `core::club::team::tactics::Tactics` (`team.tactics()`, falling back to
//! a default 4-4-2 when the team has never set one — same fallback
//! `Team::tactics()` itself uses) and picks the best-fitting available
//! player for each of the formation's 11 slots via `PlayerPositions::get_level`,
//! the same "best available per slot" heuristic the original app's tactics
//! pitch used (`TacticsLineupBuilder::pick_best` in `teams/tactics/mod.rs`).
//!
//! Deliberately simplified vs. the original app's tactics tab: no pitch
//! graphic (just a flat starting-XI list), no last-match-shape lineup
//! reconstruction or "recently used shapes" history strip (`MatchHistoryItem::tactic_used`
//! / `RecentShapesView` upstream) — just the team's current persistent
//! plan and a fresh best-XI pick for it.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::Player;
use core::PlayerPositionType;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TacticsPlayerJson {
    player_id: u32,
    name: String,
    position: String,
    current_ability: u8,
}

#[derive(Serialize)]
struct TeamTacticsJson {
    formation_name: String,
    formation_description: String,
    tactical_style: String,
    formation_strength: f32,
    pressing_intensity: f32,
    defensive_line_height: f32,
    compactness: f32,
    is_attacking: bool,
    is_defensive: bool,
    players: Vec<TacticsPlayerJson>,
}

/// Best-available player for `slot`, excluding ids already in `used` —
/// mirrors the original app's `TacticsLineupBuilder::pick_best`: goalkeeper
/// slots only draw from goalkeepers, everyone else is ranked by how well
/// they know the slot's position (`get_level`) then by overall ability.
fn pick_best<'a>(slot: &PlayerPositionType, players: &[&'a Player], used: &[u32]) -> Option<&'a Player> {
    let is_gk_slot = *slot == PlayerPositionType::Goalkeeper;
    players
        .iter()
        .filter(|p| !used.contains(&p.id))
        .filter(|p| p.is_ready_for_match())
        .filter(|p| p.positions.is_goalkeeper() == is_gk_slot)
        .max_by_key(|p| {
            let pos_level = p.positions.get_level(*slot) as i32;
            let ability = p.player_attributes.current_ability as i32;
            pos_level * 10 + ability
        })
        .copied()
}

/// Current tactical plan for `team_id`: formation name/shape, the derived
/// style settings (`Tactics`'s computed pressing/line-height/compactness
/// methods — the engine has no independently-settable mentality/tempo/width
/// fields, they're all derived from the formation's `TacticalStyle`), and a
/// freshly-picked best-XI for the 11 formation slots.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_tactics(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_tactics", || -> Result<TeamTacticsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.id == team_id) {
                    let tactics = team.tactics();
                    let formation_positions = tactics.positions();
                    let players = team.players();

                    let mut used: Vec<u32> = Vec::new();
                    let mut out: Vec<TacticsPlayerJson> = Vec::new();
                    for slot in formation_positions.iter() {
                        if let Some(player) = pick_best(slot, &players, &used) {
                            used.push(player.id);
                            out.push(TacticsPlayerJson {
                                player_id: player.id,
                                name: format!("{} {}", player.full_name.first_name, player.full_name.last_name),
                                position: format!("{slot:?}"),
                                current_ability: player.player_attributes.current_ability,
                            });
                        }
                    }

                    return Ok(TeamTacticsJson {
                        formation_name: tactics.tactic_type.display_name().to_string(),
                        formation_description: tactics.formation_description(),
                        tactical_style: format!("{:?}", tactics.tactical_style()),
                        formation_strength: tactics.formation_strength,
                        pressing_intensity: tactics.pressing_intensity(),
                        defensive_line_height: tactics.defensive_line_height(),
                        compactness: tactics.compactness(),
                        is_attacking: tactics.is_attacking(),
                        is_defensive: tactics.is_defensive(),
                        players: out,
                    });
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
