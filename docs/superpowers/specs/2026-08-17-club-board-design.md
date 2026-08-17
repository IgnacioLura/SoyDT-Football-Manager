# Club Board page — design spec

Date: 2026-08-17
Status: approved, ready for implementation plan

## Problem

`open-football/src/core/src/club/board/` (`Club.board: ClubBoard`, ~10 submodules,
`board.rs` alone 136KB) is a rich board-of-directors simulation — confidence,
mood, chairman/ownership archetypes, pressure gauges, manager-board trust,
season targets, long-term vision, promises, rare takeover events — that is
never exposed anywhere in `soydt`. It has no original template to port from
(the deleted `open-football/src/web` never had a board page either); this is
a new feature built directly from the Rust domain model.

This spec covers **only** the Club Board page. Two adjacent large
subsystems — deeper transfer-market logic (`transfers/{market,negotiation,
offer,window,squad_needs,scouting_region}`) and the `simulator` module — are
explicitly out of scope; each would get its own separate spec if pursued
later.

## Scope (MVP)

Read-only snapshot of a team's board state, one new page:
`soydt/web/src/features/teams/TeamBoardPage.tsx`, route
`/teams/:teamId/board`.

**Included fields**, all sourced from `Club.board: ClubBoard`:

| Section | Fields | Source |
|---|---|---|
| Confidence & mood | `confidence.level` (0-100), `mood`, `manager_on_final_warning`, `poor_mood_months` | `ClubBoard` top-level |
| Chairman & ownership | `chairman.ambition`, `chairman.patience`, `chairman.manager_loyalty`; `ownership.ownership_type`, `.wealth`, `.interference`, `.risk_tolerance`, `.exit_pressure` | `ClubBoard.chairman: ChairmanProfile`, `.ownership: OwnershipModel` |
| Pressure gauges (5) | `supporter_pressure`, `media_pressure`, `dressing_room_pressure`, `financial_pressure`, `regulatory_pressure` (each 0-100) | `ClubBoard.pressure: BoardPressure` |
| Manager-board trust (5 facets) | `trust_results`, `trust_finances`, `trust_squad_building`, `trust_communication`, `style_alignment` (each 0-100) | `ClubBoard.relationship: ManagerRelationship` |
| Season targets | `expected_position`, `min_acceptable_position`, `transfer_budget`, `wage_budget`, `max_squad_size`, `min_squad_size` — all optional (`ClubBoard.season_targets: Option<SeasonTargets>`) | `ClubBoard.season_targets` |
| Vision | `playing_style`, `youth_focus`, `signing_preference`, `financial_stance`, `long_term_goal` (optional), `long_term_horizon_seasons` | `ClubBoard.vision: ClubVision` |
| Promises | active promises only, via `PromiseLedger::active()`: `promise_type`, `due_date`, overdue flag (derived: `due_date < today`) | `ClubBoard.promises: PromiseLedger` |
| Takeover watch | only rendered when `status != TakeoverStatus::None`: `status`, `months_in_status` | `ClubBoard.takeover: TakeoverWatch` |

**Explicitly excluded from MVP** (simulation-internal mechanics, not
steady-state club status — can be added additively later, same pattern
`team_finances.rs`'s doc comment already establishes for that domain):
- `latest_scores: BoardComponentScores` — the board's internal "why" breakdown behind its mood.
- `manager_shortlist`, `shortlist_built_at`, `manager_search_since`, `search_window_days` — manager hiring-market mechanics (`manager_market.rs`, `ManagerCandidate`, etc.) — only relevant when a club's manager gets sacked, which for the player's own DT club can't happen to *them*, and browsing another team's in-progress managerial search is a rare, transient state not worth the UI surface yet.
- `BoardTransferProposal`/`BoardTransferEconomics`/`BoardDossierSummary` — live transfer-evaluation inputs, not persisted club state.
- `FacilityReview` (`infrastructure/`) — an occasional yearly event, not steady-state.
- `vision_start_year`, `vision_goal_achieved` — bookkeeping fields that don't add reader-facing value beyond what `long_term_goal`/`long_term_horizon_seasons` already convey.

## Architecture

Follows the existing per-domain sibling-file convention exactly (see
`team_finances.rs` / `NativeMethods.TeamFinances.cs` / etc. as the template
this mirrors).

1. **`soydt/engine-ffi/src/team_board.rs`** (new file) — one export:
   `engine_get_team_board(handle: *mut GameHandle, team_id: u32) -> *mut c_char`.
   Walks `continents → countries → clubs`, finds the club whose
   `club.teams.teams` contains `team_id` (identical lookup to
   `engine_get_team_finances`), projects `club.board` into a flat
   `TeamBoardJson` struct (`#[derive(Serialize)]`), returns via
   `to_owned_ptr`. Enums (mood, ambition, patience, ownership type, playing
   style, etc.) serialize as their serde string variant names — the C# side
   maps those strings to enums or just displays them, whichever is simpler
   per field (decide during implementation, consistent with how existing
   domains handle Rust enums crossing the boundary — check an existing
   precedent like `team_tactics.rs` first).
   Register `mod team_board; pub use team_board::*;` in `lib.rs`. Bump
   `CONTRACT_VERSION` in `contract.rs` (breaking-shape-change convention —
   this is a new export, not a breaking change to an existing one, but the
   project's convention bumps on any contract surface change; confirm against
   `CONTRACT.md`'s exact rule during implementation).

2. **C# P/Invoke layer** (`soydt/src/SoyDT.Engine`):
   - `NativeMethods.TeamBoard.cs` — raw `[LibraryImport]` declaration.
   - `NativeGameEngine.TeamBoard.cs` — `SafeHandle` wrapper (`DangerousAddRef`/`DangerousGetHandle`/`finally DangerousRelease`).
   - `GameSession.TeamBoard.cs` — thread-safe entry point via the shared `WithGame` helper.
   - `soydt/src/SoyDT.Domain/TeamBoardDtos.cs` — plain DTO record(s) matching `TeamBoardJson`'s shape, named/structured following `TeamFinancesDtos.cs`'s pattern.

3. **API**: new action on the existing `soydt/src/SoyDT.Api/Controllers/TeamsController.cs`:
   `[HttpGet("{teamId}/board")]` → `GameSession.GetTeamBoard(teamId)`. Not a
   new controller — matches the one-controller-per-resource convention.

4. **Web**: `soydt/web/src/features/teams/TeamBoardPage.tsx` (+ route entry
   in `App.tsx`, per `CLAUDE.md`'s "App.tsx is the single source of truth
   for routes"). No new team-wide tab bar — team sub-pages
   (Finances/Tactics/Scouting/Academy) currently have no shared navigation
   between them either (confirmed: each is a standalone route, reached only
   by direct URL, not linked from `TeamPage.tsx`); `TeamBoardPage` follows
   that same existing posture. Fixing team sub-page navigation, if wanted,
   is a separate follow-up, out of scope here.

## UI design (must follow `soydt/DESIGN_SYSTEM.md`)

- Wrapped in `Layout`, page body split into `SectionPanel`s exactly like
  `TeamFinancesPage`/`TeamTacticsPage`. No new `accent` needed —
  `secondary`/`tertiary`/`gold` are already claimed by Finances/Tactics/
  Scouting respectively; Board uses the default `primary` accent (same as
  Academy — not every domain needs a unique tint).
- Panels (suggested grouping, adjust during implementation if a different
  grouping reads better):
  1. **"Board confidence"** — confidence level (large stat, use
     `useCountUp`/`RatingBadge`-style treatment if it fits, else a plain
     number), mood label, final-warning banner (only if true).
  2. **"Ownership"** — chairman ambition/patience/loyalty + ownership type/
     wealth/interference/risk/exit-pressure, rendered as
     `fm-detail-row`/`fm-detail-label`/`fm-detail-value` pairs (same pattern
     `TeamFinancesPage`'s Overview panel already uses) rather than gauges —
     these are mostly discrete archetype labels, not continuous meters.
  3. **"Pressure"** — 5 gauges via `shared/ui/StatBar` (already built for
     0-100 attribute bars, reuse as-is rather than inventing a new gauge
     component).
  4. **"Manager relationship"** — 5 trust facets, same `StatBar` treatment.
  5. **"Season targets & vision"** — `fm-detail-row` pairs; omit the whole
     season-targets block if `season_targets` is `None` (fresh club/no
     targets set yet).
  6. **"Promises"** — `shared/ui/DataTable` (type / due date / overdue
     badge), `emptyMessage="No active promises"` when the list is empty.
  7. **"Takeover watch"** — only rendered when `status != 'None'`; status +
     months-in-status.

## Testing / verification

Same discipline as `MIGRATION_CHECKLIST.md`'s existing pages: verify against
real game data via the documented `curl` flow (`engine/create` →
`engine/process` → `curl /api/teams/{teamId}/board`), then `npm run build`
+ `oxlint` clean, then a manual look at the rendered page (no browser/
screenshot tool in this environment per prior pages' notes — same caveat
applies here, document it if still true at implementation time).

## Out of scope (future specs, not this one)

- Deeper transfer-market logic (`transfers::{market,negotiation,offer,window,squad_needs,scouting_region}`).
- `simulator` module (`newsroom`, `matchday`, `awards`, `seeding`, `data`) — likely already partially wired into the day-processing loop; needs its own investigation before any exposure design.
- Manager hiring-market mechanics (`manager_market.rs`) if ever wanted for browsing AI-controlled clubs mid-search.
- A shared team-domain tab bar (`TeamPage`/`TeamFinancesPage`/etc. cross-navigation) — a real but separate gap noticed during this spec's research, not caused or required by this feature.
