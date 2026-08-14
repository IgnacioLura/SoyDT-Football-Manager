//! Player relations export — single-player-scoped sibling of
//! `team_relations.rs`, itself a HEAVILY SIMPLIFIED reinterpretation of the
//! original app's `/{lang}/players/{slug}/relations` page (an interactive
//! force-directed "ego web" of one player and their teammates, see
//! `open-football/src/web/src/player/relations/index.html`). Building that
//! physics/SVG layout is out of scope here; instead this returns the one
//! player's strongest 1-3 same-team relationships, tiered into
//! bond/friendly/tension/rivalry, plus the same 4 summary counts as the team
//! page — but counted only over this player's own relations, not the whole
//! squad's pairs.
//!
//! Reuses `team_relations::classify` and its threshold constants verbatim
//! (both pages must agree on tiering), and follows the exact same
//! same-team-filter / top-N-by-`abs(level)` / averaged-combined-level logic
//! as `engine_get_team_relations`'s per-player inner loop — just without the
//! pair-deduplication across the whole squad, since here there's only one
//! subject player.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use crate::team_relations::{classify, player_name, MAX_RELATIONS_PER_PLAYER};
use core::Player;
use serde::Serialize;
use std::collections::HashSet;
use std::os::raw::c_char;

#[derive(Serialize)]
struct PlayerRelationJson {
    other_player_id: u32,
    other_player_name: String,
    tier: &'static str,
    level: f32,
}

#[derive(Serialize)]
struct PlayerRelationsJson {
    player_id: u32,
    player_name: String,
    bond_count: usize,
    friendly_count: usize,
    tension_count: usize,
    rivalry_count: usize,
    relations: Vec<PlayerRelationJson>,
}

/// Returns one player's strongest same-team relationships (1-3, by
/// `abs(level)`), tiered into bond/friendly/tension/rivalry, plus summary
/// counts scoped to this player only. See the module doc comment for what
/// was dropped relative to the original's force-directed ego-web page.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_player_relations(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_player_relations", || -> Result<PlayerRelationsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        let mut found_players: Option<&Vec<Player>> = None;
        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if let Some(team) = club.teams.teams.iter().find(|t| t.players.players.iter().any(|p| p.id == player_id)) {
                    found_players = Some(&team.players.players);
                    break;
                }
            }
            if found_players.is_some() {
                break;
            }
        }

        let players = found_players.ok_or_else(|| format!("no player with id {player_id}"))?;
        let squad_ids: HashSet<u32> = players.iter().map(|p| p.id).collect();
        let p = players.iter().find(|p| p.id == player_id).expect("just matched by this id above");

        let mut ranked: Vec<(u32, f32)> = p
            .relations
            .player_relations_iter()
            .filter(|(other_id, _)| squad_ids.contains(other_id) && **other_id != p.id)
            .map(|(other_id, rel)| (*other_id, rel.level))
            .collect();
        ranked.sort_by(|a, b| b.1.abs().partial_cmp(&a.1.abs()).unwrap_or(std::cmp::Ordering::Equal));
        ranked.truncate(MAX_RELATIONS_PER_PLAYER);

        let mut relations: Vec<PlayerRelationJson> = Vec::new();
        for (other_id, level_from_p) in ranked {
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

            let (other_player_id, other_player_name) = match other_player {
                Some(op) => (op.id, player_name(op)),
                None => (other_id, format!("Player {other_id}")),
            };

            relations.push(PlayerRelationJson { other_player_id, other_player_name, tier, level: combined });
        }

        let bond_count = relations.iter().filter(|r| r.tier == "bond").count();
        let friendly_count = relations.iter().filter(|r| r.tier == "friendly").count();
        let tension_count = relations.iter().filter(|r| r.tier == "tension").count();
        let rivalry_count = relations.iter().filter(|r| r.tier == "rivalry").count();

        Ok(PlayerRelationsJson {
            player_id: p.id,
            player_name: player_name(p),
            bond_count,
            friendly_count,
            tension_count,
            rivalry_count,
            relations,
        })
    });

    to_owned_ptr(json)
}
