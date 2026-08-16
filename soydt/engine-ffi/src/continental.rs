//! Continental club-competition exports — backs `champions-league`,
//! `europa-league`, `conference-league` and `copa-libertadores` index
//! pages. All four share one shape on `core`
//! (`ContinentalCompetitions::{champions_league,europa_league,conference_league,copa_libertadores}`,
//! each a `ChampionsLeague`/`EuropaLeague`/`ConferenceLeague`/`CopaLibertadores`
//! struct with identical fields — see `open-football/src/core/src/continent/competitions/`),
//! so one export parameterized by name covers all four instead of
//! duplicating the projection four times.
//!
//! In this app's scoped world (AR/UY/BR only, South America continent),
//! `champions_league`/`europa_league`/`conference_league` are structurally
//! present but always empty (no European clubs in scope) — only
//! `copa_libertadores` has real data. Same simplification precedent as
//! `national_competitions` staying out of scope for now.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::{read, to_owned_ptr};
use core::continent::competitions::{CompetitionStage, GroupTable, KnockoutTie};
use core::continent::Continent;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct GroupRowJson {
    team_id: u32,
    team_name: String,
    played: u8,
    won: u8,
    drawn: u8,
    lost: u8,
    gf: u8,
    ga: u8,
    points: u8,
}

#[derive(Serialize)]
struct GroupJson {
    name: String,
    rows: Vec<GroupRowJson>,
}

#[derive(Serialize)]
struct KnockoutTieJson {
    home_team_id: u32,
    home_team_name: String,
    away_team_id: u32,
    away_team_name: String,
    leg1_home_goals: Option<u8>,
    leg1_away_goals: Option<u8>,
    leg2_home_goals: Option<u8>,
    leg2_away_goals: Option<u8>,
    winner_team_id: Option<u32>,
    winner_team_name: Option<String>,
}

#[derive(Serialize)]
struct ContinentalCompetitionJson {
    competition: String,
    stage: &'static str,
    groups: Vec<GroupJson>,
    knockout_ties: Vec<KnockoutTieJson>,
}

fn stage_label(stage: &CompetitionStage) -> &'static str {
    match stage {
        CompetitionStage::NotStarted => "NotStarted",
        CompetitionStage::Qualifying => "Qualifying",
        CompetitionStage::GroupStage => "GroupStage",
        CompetitionStage::RoundOf32 => "RoundOf32",
        CompetitionStage::RoundOf16 => "RoundOf16",
        CompetitionStage::QuarterFinals => "QuarterFinals",
        CompetitionStage::SemiFinals => "SemiFinals",
        CompetitionStage::Final => "Final",
    }
}

fn team_name(continent: &Continent, team_id: u32) -> String {
    continent
        .countries
        .iter()
        .flat_map(|c| c.clubs.iter())
        .find_map(|club| club.teams.teams.iter().find(|t| t.id == team_id))
        .map(|t| t.name.clone())
        .unwrap_or_default()
}

fn project_groups(continent: &Continent, groups: &[GroupTable]) -> Vec<GroupJson> {
    groups
        .iter()
        .enumerate()
        .map(|(idx, group)| {
            let letter = (b'A' + idx as u8) as char;
            GroupJson {
                name: format!("Group {letter}"),
                rows: group
                    .rows
                    .iter()
                    .map(|row| GroupRowJson {
                        team_id: row.team_id,
                        team_name: team_name(continent, row.team_id),
                        played: row.played,
                        won: row.won,
                        drawn: row.drawn,
                        lost: row.lost,
                        gf: row.gf,
                        ga: row.ga,
                        points: row.points,
                    })
                    .collect(),
            }
        })
        .collect()
}

fn project_knockout(continent: &Continent, ties: &[KnockoutTie]) -> Vec<KnockoutTieJson> {
    ties.iter()
        .map(|tie| KnockoutTieJson {
            home_team_id: tie.home_team,
            home_team_name: team_name(continent, tie.home_team),
            away_team_id: tie.away_team,
            away_team_name: team_name(continent, tie.away_team),
            leg1_home_goals: tie.leg1_score.map(|(h, _)| h),
            leg1_away_goals: tie.leg1_score.map(|(_, a)| a),
            leg2_home_goals: tie.leg2_score.map(|(h, _)| h),
            leg2_away_goals: tie.leg2_score.map(|(_, a)| a),
            winner_team_id: tie.winner,
            winner_team_name: tie.winner.map(|w| team_name(continent, w)),
        })
        .collect()
}

/// `competition` is one of `"champions_league"`, `"europa_league"`,
/// `"conference_league"`, `"copa_libertadores"`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`; `competition` must be a valid NUL-terminated
/// C string.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_continental_competition(handle: *mut GameHandle, competition: *const c_char) -> *mut c_char {
    let json = run_guarded("engine_get_continental_competition", move || -> Result<ContinentalCompetitionJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let competition = unsafe { read(competition) };

        // The original app scopes each competition to its home continent by
        // name — same lookup here, just data-driven by the requested slug
        // instead of one hand-written handler per competition.
        let continent_name = match competition.as_str() {
            "champions_league" | "europa_league" | "conference_league" => "Europe",
            "copa_libertadores" => "South America",
            other => return Err(format!("unknown competition '{other}'")),
        };

        let continent = game.data().continents.iter().find(|c| c.name == continent_name);

        let Some(continent) = continent else {
            return Ok(ContinentalCompetitionJson {
                competition,
                stage: stage_label(&CompetitionStage::NotStarted),
                groups: Vec::new(),
                knockout_ties: Vec::new(),
            });
        };

        let comps = &continent.continental_competitions;
        let (stage, groups, knockout_round) = match competition.as_str() {
            "champions_league" => (&comps.champions_league.current_stage, &comps.champions_league.groups, &comps.champions_league.knockout_round),
            "europa_league" => (&comps.europa_league.current_stage, &comps.europa_league.groups, &comps.europa_league.knockout_round),
            "conference_league" => (&comps.conference_league.current_stage, &comps.conference_league.groups, &comps.conference_league.knockout_round),
            "copa_libertadores" => (&comps.copa_libertadores.current_stage, &comps.copa_libertadores.groups, &comps.copa_libertadores.knockout_round),
            other => return Err(format!("unknown competition '{other}'")),
        };

        Ok(ContinentalCompetitionJson {
            competition,
            stage: stage_label(stage),
            groups: project_groups(continent, groups),
            knockout_ties: project_knockout(continent, knockout_round),
        })
    });

    to_owned_ptr(json)
}
