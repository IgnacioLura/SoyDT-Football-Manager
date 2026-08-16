//! Data-access exports for `SoyDT.Api`'s AI agent tools (ported from the
//! original app's `web/src/ai/tools.rs`). The agent loop itself and the
//! OpenAI-compatible HTTP client live entirely on the .NET side — Rust only
//! needs to hand back the same JSON shapes the original's `AiTools` methods
//! produced, so the LLM prompts (which describe those shapes) don't need to
//! change. Bulk fields with no existing Serialize impl in `core` (finance,
//! facilities, academy, status) are Debug-formatted, matching the original's
//! own `format!("{:?}", ...)` shortcut rather than hand-writing JSON
//! projections for internals no other export needs yet.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::utils::DateUtils;
use serde_json::{json, Value};
use std::os::raw::c_char;

/// Full club record — mirrors `AiTools::club_get_by_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_ai_get_club(handle: *mut GameHandle, club_id: u32) -> *mut c_char {
    let json = run_guarded("engine_ai_get_club", || -> Result<Value, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let club = game.data().club(club_id).ok_or_else(|| "club not found".to_string())?;

        let teams: Vec<Value> = club
            .teams
            .teams
            .iter()
            .map(|t| {
                json!({
                    "id": t.id,
                    "name": t.name,
                    "type": format!("{:?}", t.team_type),
                    "slug": t.slug,
                    "league_id": t.league_id,
                    "player_count": t.players.players.len(),
                    "reputation": format!("{:?}", t.reputation),
                })
            })
            .collect();

        Ok(json!({
            "id": club.id,
            "name": club.name,
            "philosophy": format!("{:?}", club.philosophy),
            "location": format!("{:?}", club.location),
            "colors": {
                "background": club.colors.background,
                "foreground": club.colors.foreground,
            },
            "status": format!("{:?}", club.status),
            "finance": format!("{:?}", club.finance),
            "facilities": format!("{:?}", club.facilities),
            "academy": format!("{:?}", club.academy),
            "rivals": club.rivals,
            "teams": teams,
        }))
    });

    to_owned_ptr(json)
}

/// Squad split by team — mirrors `AiTools::club_players`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_ai_get_club_players(handle: *mut GameHandle, club_id: u32) -> *mut c_char {
    let json = run_guarded("engine_ai_get_club_players", || -> Result<Value, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let club = game.data().club(club_id).ok_or_else(|| "club not found".to_string())?;
        let now = game.data().date.date();

        let teams: Vec<Value> = club
            .teams
            .teams
            .iter()
            .map(|t| {
                let players: Vec<Value> = t
                    .players
                    .players
                    .iter()
                    .map(|p| {
                        json!({
                            "id": p.id,
                            "name": format!("{} {}", p.full_name.first_name, p.full_name.last_name),
                            "age": DateUtils::age(p.birth_date, now),
                            "position": p.positions.primary().map(|pp| pp.get_short_name().to_string()).unwrap_or_default(),
                            "ca": p.player_attributes.current_ability,
                            "pa": p.player_attributes.potential_ability,
                        })
                    })
                    .collect();
                json!({
                    "team_id": t.id,
                    "team_name": t.name,
                    "team_type": format!("{:?}", t.team_type),
                    "players": players,
                })
            })
            .collect();

        Ok(json!({ "club_id": club.id, "club_name": club.name, "teams": teams }))
    });

    to_owned_ptr(json)
}

/// Full player record (skills/attributes included) — mirrors
/// `AiTools::player_get_by_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_ai_get_player(handle: *mut GameHandle, player_id: u32) -> *mut c_char {
    let json = run_guarded("engine_ai_get_player", || -> Result<Value, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let (player, team) = match game.data().player_with_team(player_id) {
            Some((p, t)) => (p, Some(t)),
            None => match game.data().player(player_id) {
                Some(p) => (p, None),
                None => return Err("player not found".to_string()),
            },
        };

        Ok(json!({
            "id": player.id,
            "name": format!("{} {}", player.full_name.first_name, player.full_name.last_name),
            "first_name": player.full_name.first_name,
            "last_name": player.full_name.last_name,
            "age": DateUtils::age(player.birth_date, now),
            "birth_date": player.birth_date.to_string(),
            "country_id": player.country_id,
            "team": team.map(|t| json!({ "id": t.id, "name": t.name, "type": format!("{:?}", t.team_type) })),
            "positions": player.positions.primary().map(|pp| pp.get_short_name().to_string()).unwrap_or_default(),
            "preferred_foot": player.preferred_foot_str(),
            "current_ability": player.player_attributes.current_ability,
            "potential_ability": player.player_attributes.potential_ability,
            "attributes": serde_json::to_value(&player.player_attributes).unwrap_or(Value::Null),
            "skills": serde_json::to_value(&player.skills).unwrap_or(Value::Null),
            "personality": format!("{:?}", player.attributes),
        }))
    });

    to_owned_ptr(json)
}
