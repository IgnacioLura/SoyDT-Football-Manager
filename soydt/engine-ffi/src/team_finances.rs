//! Team finances export — a simplified read-only snapshot of a club's
//! current financial position, backing React's `/teams/:teamId/finances`
//! page. Mirrors `team.rs`'s pattern of walking `continents` → `countries`
//! → `clubs` to find the `core::Club` that owns the given team (via
//! `team.club_id`), then projects `club.finance` (`core::club::finance::ClubFinances`,
//! see `open-football/src/core/src/club/finance/balance.rs`) into a flat DTO.
//!
//! Deliberately simplified vs. the original app's finance tab: no 12-month
//! history table (`ClubFinances::history`), no sponsorship contract list
//! (`ClubFinances::sponsorship`), and no chart/JSON-series fields — just the
//! current `ClubFinancialBalance` snapshot plus the two optional budgets.
//! A later pass can extend this export (additively) to bring those back.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamFinancesJson {
    balance: i64,
    transfer_budget: Option<f64>,
    wage_budget: Option<f64>,
    income_total: i64,
    expense_total: i64,
    income_tv: i64,
    income_matchday: i64,
    income_sponsorship: i64,
    income_merchandising: i64,
    income_prize_money: i64,
    expense_player_wages: i64,
    expense_staff_wages: i64,
    expense_facilities: i64,
}

/// Current financial snapshot for the club that owns `team_id`: cash
/// balance, transfer/wage budgets (if set), and this period's income/expense
/// category totals. Looks up the team's club the same way `engine_get_team`
/// does (`club.teams.teams` search, not `club.id == team_id` — teams and
/// clubs have distinct ids in `open-football`'s model).
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_finances(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_finances", || -> Result<TeamFinancesJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if club.teams.teams.iter().any(|t| t.id == team_id) {
                    let balance = &club.finance.balance;
                    return Ok(TeamFinancesJson {
                        balance: balance.balance,
                        transfer_budget: club.finance.transfer_budget.as_ref().map(|c| c.amount),
                        wage_budget: club.finance.wage_budget.as_ref().map(|c| c.amount),
                        income_total: balance.income,
                        expense_total: balance.outcome,
                        income_tv: balance.income_tv,
                        income_matchday: balance.income_matchday,
                        income_sponsorship: balance.income_sponsorship,
                        income_merchandising: balance.income_merchandising,
                        income_prize_money: balance.income_prize_money,
                        expense_player_wages: balance.expense_player_wages,
                        expense_staff_wages: balance.expense_staff_wages,
                        expense_facilities: balance.expense_facilities,
                    });
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
