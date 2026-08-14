use core::r#match::MatchPlayer;
use core::r#match::engine::FootballEngine;
use core::r#match::squad::MatchSquad;
use core::{MatchTacticType, PersonAttributes, PlayerAttributes, PlayerPositionType, PlayerSkills, Tactics};
use serde::Deserialize;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

fn make_squad(team_id: u32, team_name: &str) -> MatchSquad {
    let tactics = Tactics::new(MatchTacticType::T442);
    let positions = *tactics.positions();

    let birth_date = chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap();

    let main_squad: Vec<MatchPlayer> = positions
        .iter()
        .enumerate()
        .map(|(i, pos)| {
            MatchPlayer::from_inputs(
                team_id * 100 + i as u32,
                team_id,
                [0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0],
                PersonAttributes::default(),
                PlayerAttributes {
                    condition: 10000,
                    fitness: 10000,
                    ..Default::default()
                },
                PlayerSkills::default(),
                *pos,
                None,
                Vec::new(),
                birth_date,
                false,
                10000,
                0.0,
                0.5,
                0.5,
                false,
            )
        })
        .collect();

    MatchSquad {
        team_id,
        team_name: team_name.to_string(),
        tactics,
        main_squad,
        substitutes: Vec::new(),
        captain_id: None,
        vice_captain_id: None,
        penalty_taker_id: None,
        free_kick_taker_id: None,
        selection_omissions: Vec::new(),
        coach_snapshot: None,
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn simulate_spike_match(home_name: *const c_char, away_name: *const c_char) -> *mut c_char {
    let home_name = unsafe { CStr::from_ptr(home_name) }.to_string_lossy().into_owned();
    let away_name = unsafe { CStr::from_ptr(away_name) }.to_string_lossy().into_owned();

    let home = make_squad(1, &home_name);
    let away = make_squad(2, &away_name);

    let result = FootballEngine::<840, 545>::play(home, away, false, true, false);
    let score = result.score.expect("score");

    let summary = format!(
        "{} {} - {} {} (match_time_ms={})",
        home_name,
        score.home_team.get(),
        score.away_team.get(),
        away_name,
        result.match_time_ms
    );

    CString::new(summary).unwrap().into_raw()
}

// --- simulate_from_json: real RatingBase-derived squads ---------------------
//
// `core::PlayerAttributes` carries many bookkeeping fields (ability marker,
// injury bookkeeping, international caps, ...) that SoyDT.Engine.AttributeMapping
// never populates — the C# side only sends the subset that actually matters for
// a match simulation (condition/fitness/value/reputation/current_ability). A
// direct `#[derive(Deserialize)]` on `core::PlayerAttributes` would reject that
// JSON (missing fields, no `#[serde(default)]` on the vendored struct, which we
// don't want to patch — it's someone else's crate). So `JsonPlayerAttributes`
// mirrors just the subset the DTO actually sends, and `into_engine_attributes`
// fills in the remaining bookkeeping fields with inert defaults.
#[derive(Deserialize)]
struct JsonPlayerAttributes {
    is_banned: bool,
    is_injured: bool,
    condition: i16,
    fitness: i16,
    jadedness: i16,
    weight: u8,
    height: u8,
    value: u32,
    current_reputation: i16,
    home_reputation: i16,
    world_reputation: i16,
    current_ability: u8,
}

impl JsonPlayerAttributes {
    fn into_engine_attributes(self) -> PlayerAttributes {
        PlayerAttributes {
            is_banned: self.is_banned,
            is_injured: self.is_injured,
            condition: self.condition,
            fitness: self.fitness,
            jadedness: self.jadedness,
            weight: self.weight,
            height: self.height,
            value: self.value,
            current_reputation: self.current_reputation,
            home_reputation: self.home_reputation,
            world_reputation: self.world_reputation,
            current_ability: self.current_ability,
            ..Default::default()
        }
    }
}

#[derive(Deserialize)]
struct JsonPlayer {
    id: u32,
    position: String,
    skills: PlayerSkills,
    attributes: JsonPlayerAttributes,
    person: PersonAttributes,
}

fn make_squad_from_json(team_id: u32, team_name: &str, json: &str) -> Result<MatchSquad, String> {
    let players: Vec<JsonPlayer> =
        serde_json::from_str(json).map_err(|e| format!("failed to parse squad JSON: {e}"))?;

    let birth_date = chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap();

    let main_squad: Vec<MatchPlayer> = players
        .into_iter()
        .map(|p| -> Result<MatchPlayer, String> {
            // Rust's derived enum Deserialize accepts the bare variant name
            // as a JSON string, so wrap the plain string in quotes and reuse
            // it rather than hand-rolling a second position-name mapping.
            let quoted = format!("\"{}\"", p.position);
            let tactical_position: PlayerPositionType = serde_json::from_str(&quoted)
                .map_err(|e| format!("unknown position '{}': {e}", p.position))?;

            Ok(MatchPlayer::from_inputs(
                p.id,
                team_id,
                [0.0, 0.0, 0.0],
                [0.0, 0.0, 0.0],
                p.person,
                p.attributes.into_engine_attributes(),
                p.skills,
                tactical_position,
                None,
                Vec::new(),
                birth_date,
                false,
                10000,
                0.0,
                0.5,
                0.5,
                false,
            ))
        })
        .collect::<Result<Vec<_>, _>>()?;

    let tactics = Tactics::new(MatchTacticType::T442);

    Ok(MatchSquad {
        team_id,
        team_name: team_name.to_string(),
        tactics,
        main_squad,
        substitutes: Vec::new(),
        captain_id: None,
        vice_captain_id: None,
        penalty_taker_id: None,
        free_kick_taker_id: None,
        selection_omissions: Vec::new(),
        coach_snapshot: None,
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn simulate_from_json(
    home_json: *const c_char,
    away_json: *const c_char,
) -> *mut c_char {
    let home_json = unsafe { CStr::from_ptr(home_json) }.to_string_lossy().into_owned();
    let away_json = unsafe { CStr::from_ptr(away_json) }.to_string_lossy().into_owned();

    let home = match make_squad_from_json(1, "Home", &home_json) {
        Ok(squad) => squad,
        Err(e) => return CString::new(format!("ERROR: {e}")).unwrap().into_raw(),
    };
    let away = match make_squad_from_json(2, "Away", &away_json) {
        Ok(squad) => squad,
        Err(e) => return CString::new(format!("ERROR: {e}")).unwrap().into_raw(),
    };

    let result = FootballEngine::<840, 545>::play(home, away, false, true, false);
    let score = match result.score {
        Some(s) => s,
        None => return CString::new("ERROR: no score produced").unwrap().into_raw(),
    };

    let summary = format!(
        "Home {} - {} Away (match_time_ms={})",
        score.home_team.get(),
        score.away_team.get(),
        result.match_time_ms
    );

    CString::new(summary).unwrap().into_raw()
}

// --- simulate_match_full: structured goals/injuries/cards/subs ------------
//
// Richer FFI contract consumed by SoyDT.Api's NativeMatchEngine. Returns a
// JSON object (see docs/superpowers/plans/2026-08-13-open-football-engine-wiring-plan.md
// Task 2) with goal/injury/substitution minutes derived from the engine's
// millisecond-stamped fields, and card events assigned a synthetic minute of
// 90 — the engine only exposes end-of-match aggregate yellow/red counts
// (`PlayerMatchEndStats.yellow_cards`/`red_cards`), not per-card minutes.
use serde::Serialize;

#[derive(Serialize)]
struct GoalJson { player_id: u32, is_home: bool, minute: u64, is_auto_goal: bool }

#[derive(Serialize)]
struct InjuryJson { player_id: u32, is_home: bool, minute: u64 }

#[derive(Serialize)]
struct CardJson { player_id: u32, is_home: bool, card_type: String }

#[derive(Serialize)]
struct SubstitutionJson { player_out_id: u32, player_in_id: u32, is_home: bool, minute: u64 }

#[derive(Serialize)]
struct MatchResultJson {
    home_goals: u8,
    away_goals: u8,
    home_possession_percentage: f32,
    goals: Vec<GoalJson>,
    injuries: Vec<InjuryJson>,
    cards: Vec<CardJson>,
    substitutions: Vec<SubstitutionJson>,
    #[serde(skip_serializing_if = "Option::is_none")]
    position_data: Option<serde_json::Value>,
}

// The engine records positions at a ~30ms cadence (see
// `ResultMatchPositionData::POSITION_RECORD_INTERVAL_MS` in open-football's
// core) — for a full ~95-minute match that's ~190k ball samples plus one
// equally-dense series per player, ~77MB of JSON. That's fine for their own
// replay viewer's chunked HTTP loading, but we return the whole thing in one
// API response for a single browser-side animation — way more temporal
// resolution than a linearly-interpolated pitch view needs to look smooth.
// Resample via the engine's own public nearest-neighbour lookups
// (`get_ball_position_at`/`get_player_position_at`) at a coarser, fixed
// interval instead of serializing its internal (private-field) storage
// directly — keeps this a consumer of open-football's public API, not a
// patch to its vendored source.
const POSITION_SAMPLE_INTERVAL_MS: u64 = 500;

fn downsample_positions(position_data: &core::r#match::result::ResultMatchPositionData) -> serde_json::Value {
    let max_t = position_data.max_timestamp();

    let sample_series = |get_at: &dyn Fn(u64) -> Option<core::Vector3<f32>>| -> Vec<serde_json::Value> {
        let mut samples = Vec::new();
        let mut t = 0u64;
        loop {
            if let Some(pos) = get_at(t) {
                samples.push(serde_json::json!([
                    t,
                    (pos.x * 10.0).round() / 10.0,
                    (pos.y * 10.0).round() / 10.0
                ]));
            }
            if t >= max_t {
                break;
            }
            t = (t + POSITION_SAMPLE_INTERVAL_MS).min(max_t);
        }
        samples
    };

    let ball = sample_series(&|t| position_data.get_ball_position_at(t));

    let mut players = serde_json::Map::new();
    for player_id in position_data.get_player_ids() {
        let series = sample_series(&|t| position_data.get_player_position_at(player_id, t));
        players.insert(player_id.to_string(), serde_json::Value::Array(series));
    }

    serde_json::json!({ "ball": ball, "players": players })
}

fn build_match_result_json(home_json: &str, away_json: &str, record_positions: bool) -> Result<String, String> {
    let home = make_squad_from_json(1, "Home", home_json)?;
    let away = make_squad_from_json(2, "Away", away_json)?;

    let result = FootballEngine::<840, 545>::play(home, away, record_positions, true, false);
    let score = result.score.as_ref().ok_or_else(|| "no score produced".to_string())?;
    let home_team_id = score.home_team.team_id;

    // Resolve home/away membership per-player from the two FieldSquads directly
    // (left/right are pitch sides, not home/away — map by team_id).
    let home_field_squad = if result.left_team_players.team_id == home_team_id {
        &result.left_team_players
    } else {
        &result.right_team_players
    };
    let player_is_home = |player_id: u32| -> bool {
        home_field_squad.main.contains(&player_id) || home_field_squad.substitutes_used.contains(&player_id)
    };

    let goals: Vec<GoalJson> = score
        .details
        .iter()
        // `Score.details` carries one GoalDetail per Goal AND per Assist on that goal
        // (see core::match::engine::player::statistics::MatchStatisticType) — keep only
        // the Goal entries or every scored goal double-counts when there was an assist.
        .filter(|g| g.stat_type == core::r#match::engine::player::statistics::MatchStatisticType::Goal)
        .map(|g| {
            let scorer_is_home = player_is_home(g.player_id);
            // Own goals credit the OPPOSITE side on the scoreboard — mirrors
            // core::simulator::newsroom's `scored_for_home` flip for auto-goals.
            let scored_for_home = if g.is_auto_goal { !scorer_is_home } else { scorer_is_home };
            GoalJson {
                player_id: g.player_id,
                is_home: scored_for_home,
                minute: g.time / 60_000,
                is_auto_goal: g.is_auto_goal,
            }
        })
        .collect();

    let injuries: Vec<InjuryJson> = result
        .substitutions
        .iter()
        .filter(|s| s.reason == core::r#match::engine::flow::result::SubstitutionReason::CriticalInjury)
        .map(|s| InjuryJson {
            player_id: s.player_out_id,
            is_home: s.team_id == home_team_id,
            minute: s.match_time_ms / 60_000,
        })
        .collect();

    let substitutions: Vec<SubstitutionJson> = result
        .substitutions
        .iter()
        .map(|s| SubstitutionJson {
            player_out_id: s.player_out_id,
            player_in_id: s.player_in_id,
            is_home: s.team_id == home_team_id,
            minute: s.match_time_ms / 60_000,
        })
        .collect();

    let mut cards: Vec<CardJson> = Vec::new();
    for (player_id, stats) in result.player_stats.iter() {
        let is_home = player_is_home(*player_id);
        for _ in 0..stats.yellow_cards {
            cards.push(CardJson { player_id: *player_id, is_home, card_type: "Yellow".to_string() });
        }
        for _ in 0..stats.red_cards {
            cards.push(CardJson { player_id: *player_id, is_home, card_type: "Red".to_string() });
        }
    }

    let total_passes: u32 = result
        .player_stats
        .values()
        .map(|s| s.passes_attempted as u32)
        .sum();
    let home_passes: u32 = home_field_squad
        .main
        .iter()
        .chain(home_field_squad.substitutes_used.iter())
        .filter_map(|id| result.player_stats.get(id))
        .map(|s| s.passes_attempted as u32)
        .sum();
    let home_possession_percentage = if total_passes > 0 {
        home_passes as f32 / total_passes as f32 * 100.0
    } else {
        50.0
    };

    let home_goals = score.home_team.get();
    let away_goals = score.away_team.get();
    let position_data = if record_positions {
        Some(downsample_positions(&result.position_data))
    } else {
        None
    };

    let payload = MatchResultJson {
        home_goals,
        away_goals,
        home_possession_percentage,
        goals,
        injuries,
        cards,
        substitutions,
        position_data,
    };

    serde_json::to_string(&payload).map_err(|e| format!("serialize failed: {e}"))
}

fn run_match_ffi(home_json: *const c_char, away_json: *const c_char, record_positions: bool) -> *mut c_char {
    let home_json_str = unsafe { CStr::from_ptr(home_json) }.to_string_lossy().into_owned();
    let away_json_str = unsafe { CStr::from_ptr(away_json) }.to_string_lossy().into_owned();

    let json = match build_match_result_json(&home_json_str, &away_json_str, record_positions) {
        Ok(j) => j,
        Err(e) => format!("{{\"error\":\"{e}\"}}"),
    };

    CString::new(json).unwrap().into_raw()
}

#[unsafe(no_mangle)]
pub extern "C" fn simulate_match_full(home_json: *const c_char, away_json: *const c_char) -> *mut c_char {
    run_match_ffi(home_json, away_json, false)
}

#[unsafe(no_mangle)]
pub extern "C" fn simulate_match_full_with_positions(home_json: *const c_char, away_json: *const c_char) -> *mut c_char {
    run_match_ffi(home_json, away_json, true)
}

#[unsafe(no_mangle)]
pub extern "C" fn free_spike_string(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    unsafe {
        drop(CString::from_raw(s));
    }
}
