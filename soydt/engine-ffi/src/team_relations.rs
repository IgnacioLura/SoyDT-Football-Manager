//! Team relations export — HEAVILY SIMPLIFIED reinterpretation of the
//! original app's `/{lang}/teams/{slug}/relations` page (an interactive
//! force-directed social graph of every player-to-player relationship in
//! the squad, see `open-football/src/web/src/teams/relations/mod.rs` and
//! `index.html`). Building that physics/SVG layout is out of scope here;
//! instead this returns a flat list of each same-team player pair's
//! strongest relationship, tiered into bond/friendly/tension/rivalry, plus
//! 4 summary counts. Cross-team relationships (which the underlying engine
//! data does support, via `core::club::relations::Relations`) are
//! deliberately dropped to keep this simple — see CONTRACT.md.
//!
//! The real relation data lives on `core::club::player::core::player::Player`
//! as a public `relations: Relations` field (`core::club::relations`),
//! itself a `FxHashMap<u32, PlayerRelation>` keyed by the *other* player's
//! raw `u32` id (no newtype wrapper) behind `player_relations_iter()` /
//! `get_player(id)`. `PlayerRelation::level` ranges -100..100;
//! `PlayerRelation::is_open_rivalry()` is a separate hysteresis-driven flag
//! (declared once `rivalry_intensity` crosses an internal threshold) that
//! the original's own classifier ORs into the rivalry tier alongside the
//! raw level check — mirrored here for parity with `RelationsGraph::classify`
//! in the original's web crate, using the exact same threshold constants
//! (55 / 20 / -20 / -55) found there.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::Player;
use serde::Serialize;
use std::collections::HashSet;
use std::os::raw::c_char;

// `pub(crate)` — shared with `player_relations.rs`, which classifies one
// player's relationships against the exact same thresholds/cap instead of
// re-deriving them.
pub(crate) const BOND_FLOOR: f32 = 55.0;
pub(crate) const FRIENDLY_FLOOR: f32 = 20.0;
pub(crate) const TENSION_CEIL: f32 = -20.0;
pub(crate) const RIVALRY_CEIL: f32 = -55.0;

/// Max strongest relationships kept per player before pair-deduplication —
/// matches the "1-3" cap from the task scope; the original instead caps at
/// 6 *drawn* edges per node after full graph layout (`MAX_DRAWN_EDGES_PER_PLAYER`
/// in the original's `mod.rs`), a different knob for a different (physics
/// layout) problem.
pub(crate) const MAX_RELATIONS_PER_PLAYER: usize = 3;

#[derive(Serialize)]
struct RelationPairJson {
    player_a_id: u32,
    player_a_name: String,
    player_b_id: u32,
    player_b_name: String,
    tier: &'static str,
    level: f32,
}

#[derive(Serialize)]
struct TeamRelationsJson {
    bond_count: usize,
    friendly_count: usize,
    tension_count: usize,
    rivalry_count: usize,
    pairs: Vec<RelationPairJson>,
}

// `pub(crate)` — shared with `player_relations.rs`.
pub(crate) fn player_name(p: &Player) -> String {
    format!("{} {}", p.full_name.first_name, p.full_name.last_name)
}

/// Classifies a combined relationship level (average of both players'
/// perspectives, when both exist) plus an open-rivalry flag into one of the
/// 4 display tiers, or `None` for a neutral pair the original drops
/// entirely (same behavior as `RelationsGraph::classify`'s `continue` arm).
/// `pub(crate)` — shared with `player_relations.rs` so both exports agree on
/// the exact same tiering.
pub(crate) fn classify(combined: f32, open_rivalry: bool) -> Option<&'static str> {
    if open_rivalry || combined <= RIVALRY_CEIL {
        Some("rivalry")
    } else if combined <= TENSION_CEIL {
        Some("tension")
    } else if combined >= BOND_FLOOR {
        Some("bond")
    } else if combined >= FRIENDLY_FLOOR {
        Some("friendly")
    } else {
        None
    }
}

/// Returns a simplified same-team-only relationship pair list for one team,
/// tiered into bond/friendly/tension/rivalry, plus summary counts. See the
/// module doc comment for what was dropped relative to the original's
/// force-directed graph page.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_relations(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_relations", || -> Result<TeamRelationsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let mut found_players: Option<&Vec<Player>> = None;
        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.id == team_id) {
                    found_players = Some(&team.players.players);
                    break;
                }
            }
            if found_players.is_some() {
                break;
            }
        }

        let players = found_players.ok_or_else(|| format!("no team with id {team_id}"))?;
        let squad_ids: HashSet<u32> = players.iter().map(|p| p.id).collect();

        let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
        let mut pairs: Vec<RelationPairJson> = Vec::new();

        for p in players.iter() {
            // Strongest same-team relationships from this player's own
            // perspective, capped per the simplified "1-3" scope.
            let mut ranked: Vec<(u32, f32)> = p
                .relations
                .player_relations_iter()
                .filter(|(other_id, _)| squad_ids.contains(other_id) && **other_id != p.id)
                .map(|(other_id, rel)| (*other_id, rel.level))
                .collect();
            ranked.sort_by(|a, b| b.1.abs().partial_cmp(&a.1.abs()).unwrap_or(std::cmp::Ordering::Equal));
            ranked.truncate(MAX_RELATIONS_PER_PLAYER);

            for (other_id, level_from_p) in ranked {
                let key = if p.id < other_id { (p.id, other_id) } else { (other_id, p.id) };
                if !seen_pairs.insert(key) {
                    continue;
                }

                let other_player = players.iter().find(|op| op.id == other_id);
                let rel_from_p = p.relations.get_player(other_id);
                let rel_from_other = other_player.and_then(|op| op.relations.get_player(p.id));

                let (combined, open_rivalry) = match (rel_from_p, rel_from_other) {
                    (Some(a), Some(b)) => ((a.level + b.level) / 2.0, a.is_open_rivalry() || b.is_open_rivalry()),
                    (Some(a), None) => (a.level, a.is_open_rivalry()),
                    (None, Some(b)) => (b.level, b.is_open_rivalry()),
                    (None, None) => (level_from_p, false),
                };

                let Some(tier) = classify(combined, open_rivalry) else {
                    continue;
                };

                let (a_id, a_name, b_id, b_name) = match other_player {
                    Some(op) => (p.id, player_name(p), op.id, player_name(op)),
                    None => (p.id, player_name(p), other_id, format!("Player {other_id}")),
                };

                pairs.push(RelationPairJson {
                    player_a_id: a_id,
                    player_a_name: a_name,
                    player_b_id: b_id,
                    player_b_name: b_name,
                    tier,
                    level: combined,
                });
            }
        }

        let bond_count = pairs.iter().filter(|p| p.tier == "bond").count();
        let friendly_count = pairs.iter().filter(|p| p.tier == "friendly").count();
        let tension_count = pairs.iter().filter(|p| p.tier == "tension").count();
        let rivalry_count = pairs.iter().filter(|p| p.tier == "rivalry").count();

        Ok(TeamRelationsJson {
            bond_count,
            friendly_count,
            tension_count,
            rivalry_count,
            pairs,
        })
    });

    to_owned_ptr(json)
}
