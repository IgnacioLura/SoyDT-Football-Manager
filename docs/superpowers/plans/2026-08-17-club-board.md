# Club Board Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `open-football`'s `Club.board: ClubBoard` (confidence, mood, ownership/chairman, pressure, manager-board trust, season targets, vision, promises, takeover watch) as a new read-only `/teams/:teamId/board` page.

**Architecture:** One new export threaded through all four existing layers exactly like every other team domain (see `team_finances.rs` as the reference template): `soydt/engine-ffi/src/team_board.rs` → C# `NativeMethods.TeamBoard.cs`/`NativeGameEngine.TeamBoard.cs`/`GameSession.TeamBoard.cs` + a `SoyDT.Domain` DTO file → a new sibling API controller → a new React page. Along the way, `shared/ui/StatBar.tsx` gets a small backward-compatible extension (`max`/`tone` props) so it can render 0-100 board gauges, not just 0-20 player attributes.

**Tech Stack:** Rust (engine-ffi `cdylib`), C# / .NET 8 (`SoyDT.Engine`, `SoyDT.Api`), React + TypeScript + Vite (`soydt/web`).

**Spec:** `docs/superpowers/specs/2026-08-17-club-board-design.md`

## Global Constraints

- No original template to port from — this is a new feature, scoped fresh from the Rust domain model (spec's "Scope (MVP)" table is authoritative for which fields to include/exclude).
- `CONTRACT_VERSION` (in `soydt/engine-ffi/src/contract.rs`) is bumped only on a **non-additive** change (field removed/renamed/retyped on an *existing* export). This plan only adds a brand-new export, so **no bump is needed** — do not touch `contract.rs`.
- Rust enums cross the FFI boundary as plain strings via `format!("{:?}", value)` on the Debug impl (verified project convention — see `team_tactics.rs`'s `tactical_style: format!("{:?}", tactics.tactical_style())`), never via `serde` on the enum type itself. Every enum-ish field in the new JSON struct is typed `String` (or `Option<String>`).
- Dates cross the boundary as plain `"YYYY-MM-DD"` strings via `.to_string()` on the `NaiveDate` (see `game.rs`'s `date: game.data.date.date().to_string()`), not chrono's own serde impl.
- This Windows dev environment's MSVC linker is broken for raw `cargo build` (confirmed during the design investigation) — all Rust build verification in this plan uses the Docker command from `soydt/CLAUDE.md`'s "Fast Rust-only iteration" section, never bare `cargo`.
- This codebase has zero unit tests anywhere in `engine-ffi` (confirmed: no `#[test]`/`#[cfg(test)]` in any of its `src/*.rs` files) or a frontend test runner — every existing domain is verified via the documented `curl` end-to-end flow plus `cargo`/`dotnet`/`npm run build` staying clean. This plan follows that same convention; do not introduce a new test framework.
- JSON casing: engine-ffi emits `snake_case` (Rust struct field names as-is); `SoyDT.Engine`'s `NativeStringMarshal` deserializes with `JsonNamingPolicy.SnakeCaseLower` into `PascalCase` C# record properties (no `[JsonPropertyName]` needed); ASP.NET's controller output serializes those `PascalCase` properties to `camelCase` JSON by default (confirmed against `TeamFinancesDtos.cs`/`TeamFinancesPage.tsx`'s existing matching field names) — so the TypeScript type's field names are the C# record's properties, camelCased.

---

## Task 1: Rust FFI export — `engine_get_team_board`

**Files:**
- Create: `soydt/engine-ffi/src/team_board.rs`
- Modify: `soydt/engine-ffi/src/lib.rs:33` (insert `mod team_board;` — alphabetically between `mod team_academy;` at line 33 and `mod team_finances;` at line 34)

**Interfaces:**
- Consumes: `crate::contract::run_guarded`, `crate::game::GameHandle`, `crate::strings::to_owned_ptr` (all already used identically by `team_finances.rs` — no new crate-internal APIs needed). Reads `open-football::core`'s `Club.board: ClubBoard` and its nested structs (`BoardConfidence.level: i32`, `BoardMood.state: BoardMoodState`, `ChairmanProfile{ambition, patience, manager_loyalty: u8}`, `OwnershipModel{ownership_type, wealth: u8, interference: u8, risk_tolerance: u8, exit_pressure: u8}`, `BoardPressure{supporter_pressure, media_pressure, dressing_room_pressure, financial_pressure, regulatory_pressure: all u8}`, `ManagerRelationship{trust_results, trust_finances, trust_squad_building, trust_communication, style_alignment: all u8}`, `Option<SeasonTargets>{transfer_budget: i32, wage_budget: i32, max_squad_size: u8, min_squad_size: u8, expected_position: u8, min_acceptable_position: u8}`, `ClubVision{playing_style, youth_focus, signing_preference, financial_stance, long_term_goal: Option<_>, long_term_horizon_seasons: u8}`, `PromiseLedger::active() -> impl Iterator<Item = &BoardPromise>` where `BoardPromise{promise_type, due_date: NaiveDate, ..}` and `BoardPromise::is_overdue(&self, today: NaiveDate) -> bool`, `TakeoverWatch{status: TakeoverStatus, months_in_status: u8}`). None of these types need importing by name — every field is read via chained access (`board.chairman.ambition`) or formatted inline, exactly like `team_finances.rs` never imports `ClubFinances`.
- Produces: the C ABI symbol `engine_get_team_board(handle: *mut GameHandle, team_id: u32) -> *mut c_char`, returning the `{ok, data, error}` envelope wrapping this JSON shape (field names are the exact Rust struct field names below, which Task 2 must match with matching-but-`PascalCase` C# record properties):
  ```
  confidence_level: i32
  mood: string
  manager_on_final_warning: bool
  poor_mood_months: u8
  chairman_ambition: string
  chairman_patience: string
  chairman_manager_loyalty: u8
  ownership_type: string
  ownership_wealth: u8
  ownership_interference: u8
  ownership_risk_tolerance: u8
  ownership_exit_pressure: u8
  supporter_pressure: u8
  media_pressure: u8
  dressing_room_pressure: u8
  financial_pressure: u8
  regulatory_pressure: u8
  trust_results: u8
  trust_finances: u8
  trust_squad_building: u8
  trust_communication: u8
  style_alignment: u8
  season_targets: null | { transfer_budget: i32, wage_budget: i32, max_squad_size: u8, min_squad_size: u8, expected_position: u8, min_acceptable_position: u8 }
  vision_playing_style: string
  vision_youth_focus: string
  vision_signing_preference: string
  vision_financial_stance: string
  vision_long_term_goal: string | null
  vision_long_term_horizon_seasons: u8
  promises: [{ promise_type: string, due_date: string, overdue: bool }]
  takeover_status: string
  takeover_months_in_status: u8
  ```

- [ ] **Step 1: Write `soydt/engine-ffi/src/team_board.rs`**

```rust
//! Team board export — backs React's `/teams/:teamId/board` page. Reuses
//! `team_finances.rs`'s team-lookup pattern (walk continents → countries →
//! clubs, find the club whose `club.teams.teams` contains `team_id`), then
//! reads `Club.board: ClubBoard` (see
//! `open-football/src/core/src/club/board/board.rs`) and projects it into
//! a flat DTO plus a promises list.
//!
//! Deliberately simplified vs. the full `ClubBoard` struct: no
//! `latest_scores` internal component-score breakdown, no manager
//! hiring-market/shortlist fields, no live transfer-proposal/dossier
//! fields, no facility-review state — just the steady-state club status a
//! player would want to see. See
//! docs/superpowers/specs/2026-08-17-club-board-design.md for the full
//! scope rationale.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct BoardPromiseJson {
    promise_type: String,
    due_date: String,
    overdue: bool,
}

#[derive(Serialize)]
struct SeasonTargetsJson {
    transfer_budget: i32,
    wage_budget: i32,
    max_squad_size: u8,
    min_squad_size: u8,
    expected_position: u8,
    min_acceptable_position: u8,
}

#[derive(Serialize)]
struct TeamBoardJson {
    confidence_level: i32,
    mood: String,
    manager_on_final_warning: bool,
    poor_mood_months: u8,
    chairman_ambition: String,
    chairman_patience: String,
    chairman_manager_loyalty: u8,
    ownership_type: String,
    ownership_wealth: u8,
    ownership_interference: u8,
    ownership_risk_tolerance: u8,
    ownership_exit_pressure: u8,
    supporter_pressure: u8,
    media_pressure: u8,
    dressing_room_pressure: u8,
    financial_pressure: u8,
    regulatory_pressure: u8,
    trust_results: u8,
    trust_finances: u8,
    trust_squad_building: u8,
    trust_communication: u8,
    style_alignment: u8,
    season_targets: Option<SeasonTargetsJson>,
    vision_playing_style: String,
    vision_youth_focus: String,
    vision_signing_preference: String,
    vision_financial_stance: String,
    vision_long_term_goal: Option<String>,
    vision_long_term_horizon_seasons: u8,
    promises: Vec<BoardPromiseJson>,
    takeover_status: String,
    takeover_months_in_status: u8,
}

/// Current board-of-directors status for the club that owns `team_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_board(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_board", || -> Result<TeamBoardJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let today = game.data().date.date();

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if club.teams.teams.iter().any(|t| t.id == team_id) {
                    let board = &club.board;

                    let season_targets = board.season_targets.as_ref().map(|t| SeasonTargetsJson {
                        transfer_budget: t.transfer_budget,
                        wage_budget: t.wage_budget,
                        max_squad_size: t.max_squad_size,
                        min_squad_size: t.min_squad_size,
                        expected_position: t.expected_position,
                        min_acceptable_position: t.min_acceptable_position,
                    });

                    let promises = board
                        .promises
                        .active()
                        .map(|p| BoardPromiseJson {
                            promise_type: format!("{:?}", p.promise_type),
                            due_date: p.due_date.to_string(),
                            overdue: p.is_overdue(today),
                        })
                        .collect();

                    return Ok(TeamBoardJson {
                        confidence_level: board.confidence.level,
                        mood: format!("{:?}", board.mood.state),
                        manager_on_final_warning: board.manager_on_final_warning,
                        poor_mood_months: board.poor_mood_months,
                        chairman_ambition: format!("{:?}", board.chairman.ambition),
                        chairman_patience: format!("{:?}", board.chairman.patience),
                        chairman_manager_loyalty: board.chairman.manager_loyalty,
                        ownership_type: format!("{:?}", board.ownership.ownership_type),
                        ownership_wealth: board.ownership.wealth,
                        ownership_interference: board.ownership.interference,
                        ownership_risk_tolerance: board.ownership.risk_tolerance,
                        ownership_exit_pressure: board.ownership.exit_pressure,
                        supporter_pressure: board.pressure.supporter_pressure,
                        media_pressure: board.pressure.media_pressure,
                        dressing_room_pressure: board.pressure.dressing_room_pressure,
                        financial_pressure: board.pressure.financial_pressure,
                        regulatory_pressure: board.pressure.regulatory_pressure,
                        trust_results: board.relationship.trust_results,
                        trust_finances: board.relationship.trust_finances,
                        trust_squad_building: board.relationship.trust_squad_building,
                        trust_communication: board.relationship.trust_communication,
                        style_alignment: board.relationship.style_alignment,
                        season_targets,
                        vision_playing_style: format!("{:?}", board.vision.playing_style),
                        vision_youth_focus: format!("{:?}", board.vision.youth_focus),
                        vision_signing_preference: format!("{:?}", board.vision.signing_preference),
                        vision_financial_stance: format!("{:?}", board.vision.financial_stance),
                        vision_long_term_goal: board.vision.long_term_goal.map(|g| format!("{g:?}")),
                        vision_long_term_horizon_seasons: board.vision.long_term_horizon_seasons,
                        promises,
                        takeover_status: format!("{:?}", board.takeover.status),
                        takeover_months_in_status: board.takeover.months_in_status,
                    });
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
```

- [ ] **Step 2: Register the module in `soydt/engine-ffi/src/lib.rs`**

Open `soydt/engine-ffi/src/lib.rs`. Find line 33 (`mod team_academy;`) and insert a new line directly after it, before line 34 (`mod team_finances;`):

```rust
mod team_board;
```

The surrounding block should read:
```rust
mod team_academy;
mod team_board;
mod team_finances;
```

- [ ] **Step 3: Build via Docker to verify it compiles**

Run from the repo root:
```bash
docker run --rm -v "$(pwd)":/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release
```
Expected: build succeeds with no errors (warnings about unrelated pre-existing code are fine; there must be zero errors or warnings mentioning `team_board.rs`).

- [ ] **Step 4: Commit**

```bash
git add soydt/engine-ffi/src/team_board.rs soydt/engine-ffi/src/lib.rs
git commit -m "feat(engine-ffi): add engine_get_team_board export"
```

---

## Task 2: C# P/Invoke layer + Domain DTOs

**Files:**
- Create: `soydt/src/SoyDT.Engine/NativeMethods.TeamBoard.cs`
- Create: `soydt/src/SoyDT.Engine/NativeGameEngine.TeamBoard.cs`
- Create: `soydt/src/SoyDT.Engine/GameSession.TeamBoard.cs`
- Create: `soydt/src/SoyDT.Domain/TeamBoardDtos.cs`

**Interfaces:**
- Consumes: Task 1's `engine_get_team_board(handle, team_id) -> *mut c_char` C symbol; `SoyDT.Engine`'s existing `NativeMethods.LibName` constant, `GameHandleSafeHandle`, `NativeStringMarshal.ReadEnvelope<T>`, `GameSession`'s private `WithGame` helper (all used identically to the `TeamFinances` sibling trio — no new engine-side infrastructure needed).
- Produces: `SoyDT.Domain.TeamBoard` and `SoyDT.Domain.SeasonTargets`/`SoyDT.Domain.BoardPromise` records; `GameSession.GetTeamBoard(uint teamId) -> TeamBoard`, consumed by Task 3's controller.

- [ ] **Step 1: Write `soydt/src/SoyDT.Domain/TeamBoardDtos.cs`**

```csharp
namespace SoyDT.Domain;

/// Mirrors `engine_get_team_board`'s `data` payload (see
/// engine-ffi/CONTRACT.md). A simplified steady-state snapshot of a club's
/// board-of-directors status — no internal component-score breakdown, no
/// manager hiring-market/shortlist fields, no live transfer-proposal
/// fields, no facility-review state. See
/// docs/superpowers/specs/2026-08-17-club-board-design.md for scope
/// rationale.
public sealed record BoardPromise(
    string PromiseType,
    string DueDate,
    bool Overdue);

public sealed record SeasonTargets(
    int TransferBudget,
    int WageBudget,
    byte MaxSquadSize,
    byte MinSquadSize,
    byte ExpectedPosition,
    byte MinAcceptablePosition);

public sealed record TeamBoard(
    int ConfidenceLevel,
    string Mood,
    bool ManagerOnFinalWarning,
    byte PoorMoodMonths,
    string ChairmanAmbition,
    string ChairmanPatience,
    byte ChairmanManagerLoyalty,
    string OwnershipType,
    byte OwnershipWealth,
    byte OwnershipInterference,
    byte OwnershipRiskTolerance,
    byte OwnershipExitPressure,
    byte SupporterPressure,
    byte MediaPressure,
    byte DressingRoomPressure,
    byte FinancialPressure,
    byte RegulatoryPressure,
    byte TrustResults,
    byte TrustFinances,
    byte TrustSquadBuilding,
    byte TrustCommunication,
    byte StyleAlignment,
    SeasonTargets? SeasonTargets,
    string VisionPlayingStyle,
    string VisionYouthFocus,
    string VisionSigningPreference,
    string VisionFinancialStance,
    string? VisionLongTermGoal,
    byte VisionLongTermHorizonSeasons,
    IReadOnlyList<BoardPromise> Promises,
    string TakeoverStatus,
    byte TakeoverMonthsInStatus);
```

- [ ] **Step 2: Write `soydt/src/SoyDT.Engine/NativeMethods.TeamBoard.cs`**

```csharp
using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the team-board export — new sibling file to
/// `NativeMethods.cs` (see that file's remarks) rather than an edit to it.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team_board(IntPtr handle, uint teamId);
}
```

- [ ] **Step 3: Write `soydt/src/SoyDT.Engine/NativeGameEngine.TeamBoard.cs`**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the team-board wrapper without editing the shared file.
public sealed partial class NativeGameEngine
{
    public TeamBoard GetTeamBoard(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_board(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamBoard>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
```

- [ ] **Step 4: Write `soydt/src/SoyDT.Engine/GameSession.TeamBoard.cs`**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the team-board accessor via the shared `WithGame` helper rather than
/// editing the shared file.
public sealed partial class GameSession
{
    public TeamBoard GetTeamBoard(uint teamId) => WithGame((e, h) => e.GetTeamBoard(h, teamId));
}
```

- [ ] **Step 5: Build to verify it compiles**

Run:
```bash
cd soydt && dotnet build SoyDT.sln
```
Expected: `Build succeeded.` with 0 errors. (This will only succeed once `engine-ffi`'s compiled library is available where `SoyDT.Engine` expects it — if this fails with a missing-native-library error rather than a C# compile error, that's expected in this dev environment per the full-stack Docker build being the actual verification path; a **C# compile error** referencing `TeamBoard`, `NativeMethods.TeamBoard`, etc. is what this step must produce zero of.)

- [ ] **Step 6: Commit**

```bash
git add soydt/src/SoyDT.Domain/TeamBoardDtos.cs soydt/src/SoyDT.Engine/NativeMethods.TeamBoard.cs soydt/src/SoyDT.Engine/NativeGameEngine.TeamBoard.cs soydt/src/SoyDT.Engine/GameSession.TeamBoard.cs
git commit -m "feat(engine): add GameSession.GetTeamBoard"
```

---

## Task 3: API controller + full-stack verification

**Files:**
- Create: `soydt/src/SoyDT.Api/Controllers/TeamBoardController.cs`

**Interfaces:**
- Consumes: `GameSession.GetTeamBoard(uint teamId) -> TeamBoard` from Task 2.
- Produces: `GET /api/teams/{teamId}/board -> TeamBoard` (JSON, `camelCase` field names per ASP.NET's default serializer), consumed by Task 5's React page.

- [ ] **Step 1: Write `soydt/src/SoyDT.Api/Controllers/TeamBoardController.cs`**

```csharp
using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Simplified board-of-directors status snapshot (see
/// docs/superpowers/specs/2026-08-17-club-board-design.md for scope).
/// Read-only, backed by `engine_get_team_board`.
[ApiController]
[Route("api/teams")]
public sealed class TeamBoardController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/board")]
    public ActionResult<TeamBoard> Board(uint teamId)
    {
        return Ok(session.GetTeamBoard(teamId));
    }
}
```

- [ ] **Step 2: Full-stack Docker build**

Run from the repo root (build context must be the repo root per `CLAUDE.md`):
```bash
docker build -f soydt/Dockerfile -t soydt-api .
```
Expected: image builds successfully (this compiles both the Rust `.so`/`.dll` and the .NET publish output together — this is the real end-to-end compile check for this whole feature, since Task 1's Docker cargo build and Task 2's local `dotnet build` each only proved half the picture in isolation).

- [ ] **Step 3: Run the container and verify the endpoint against real game data**

```bash
docker run -d -p 8080:8080 --name soydt-board-check soydt-api
curl -X POST "http://localhost:8080/api/game/create?countries=AR,UY,BR"
curl -X POST "http://localhost:8080/api/game/process?days=5"
curl "http://localhost:8080/api/leagues/140/table"
```
The last call lists the Uruguayan Primera División table — note any `teamId` from its `rows` (e.g. `1917` for Cerro, per this repo's own prior verification run). Then:
```bash
curl "http://localhost:8080/api/teams/1917/board"
```
Expected: a JSON object (not an error) with all the fields listed in Task 1's "Produces" JSON shape, `camelCase`d (e.g. `confidenceLevel`, `chairmanAmbition`, `promises`). `seasonTargets` may legitimately be `null` this early in a save; that is not a bug. Stop and remove the container when done:
```bash
docker stop soydt-board-check && docker rm soydt-board-check
```

- [ ] **Step 4: Commit**

```bash
git add soydt/src/SoyDT.Api/Controllers/TeamBoardController.cs
git commit -m "feat(api): add GET /api/teams/{teamId}/board"
```

---

## Task 4: Extend `StatBar` to support 0-100 gauges

**Files:**
- Modify: `soydt/web/src/shared/ui/StatBar.tsx`

**Interfaces:**
- Consumes: nothing new (still uses `useCountUp`, `attributeColor` stays imported by other callers if any — see removal note in Step 1).
- Produces: `<StatBar label max? tone? value>` — `max` already existed (default `20`, unchanged); new optional `tone?: 'normal' | 'inverse'` (default `'normal'`) flips which end of the bar reads as "good" (green) vs "bad" (red) — needed because board pressure gauges are "high = bad" while trust/confidence gauges are "high = good". Task 5 passes `max={100}` and `tone="inverse"` for pressure gauges, `max={100}` (default `tone="normal"`) for trust/confidence gauges.

The current implementation (`soydt/web/src/shared/ui/StatBar.tsx`) picks the bar's red/yellow/green color via `attributeColor(rounded)`, which hardcodes thresholds `<=8` / `<=13` / else, tuned specifically for the 0-20 player-attribute scale `AttributeGrid.tsx` (`soydt/web/src/features/players/AttributeGrid.tsx:12`, its only other caller) uses. Those thresholds are exactly 40% and 65% of 20 — so switching to **percentage-of-max** bands with those same cutoffs (`<=40%` / `<=65%` / else) reproduces byte-for-byte identical coloring for every existing 0-20 caller, while also working correctly for any `max`.

- [ ] **Step 1: Replace `StatBar.tsx`'s color logic with percentage-of-max bands, add `tone`**

Read the current file first (`soydt/web/src/shared/ui/StatBar.tsx`) to confirm nothing else references `attributeColor` in the file, then replace its full contents with:

```tsx
// soydt/web/src/shared/ui/StatBar.tsx
import { useCountUp } from '../useCountUp'
import './StatBar.css'

type StatBarTone = 'normal' | 'inverse'

// Percentage-of-max bands, not absolute thresholds, so this scales to any
// `max` — verified equivalent to the old attributeColor(rounded) behavior
// at the default max=20 (its <=8/<=13 cutoffs are exactly 40%/65% of 20).
// `tone="inverse"` flips which end reads as "good" (green) — needed for
// gauges where high = bad, e.g. board pressure (see DESIGN_SYSTEM.md /
// docs/superpowers/specs/2026-08-17-club-board-design.md).
function barColor(pct: number, tone: StatBarTone): 'red' | 'yellow' | 'green' {
  const effective = tone === 'inverse' ? 100 - pct : pct
  if (effective <= 40) return 'red'
  if (effective <= 65) return 'yellow'
  return 'green'
}

type StatBarProps = {
  label: string
  value: number
  max?: number
  tone?: StatBarTone
}

function StatBar({ label, value, max = 20, tone = 'normal' }: StatBarProps) {
  const rounded = Math.round(value)
  const displayed = useCountUp(rounded)
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const color = barColor(pct, tone)
  return (
    <div className="sb-row">
      <span className="sb-label">{label}</span>
      <div className="sb-track">
        <div className={`sb-fill sb-fill-${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="sb-value">{displayed}</span>
    </div>
  )
}

export default StatBar
```

- [ ] **Step 2: Verify `attributeColor.ts` still has other callers (it is not becoming dead code)**

```bash
cd soydt/web/src && grep -rl "attributeColor" . 2>/dev/null
```
Expected: at least `shared/attributeColor.ts` itself; if grep also finds callers outside `StatBar.tsx` (there may or may not be any), leave `attributeColor.ts` in place either way — it's a small standalone utility, not worth deleting speculatively as part of this feature even if `StatBar.tsx` turns out to be its last caller (a follow-up dead-code pass, not this task, should make that call with a full check).

- [ ] **Step 3: Build to verify no regressions**

```bash
cd soydt/web && npm run build
```
Expected: clean build (this is a plain `tsc -b && vite build` — TypeScript will catch any prop-type mismatch immediately; there are no runtime tests to run since none exist for this codebase's frontend, per this plan's Global Constraints).

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/shared/ui/StatBar.tsx
git commit -m "feat(web): extend StatBar with max/tone for 0-100 gauges"
```

---

## Task 5: `TeamBoardPage` + route

**Files:**
- Create: `soydt/web/src/features/teams/TeamBoardPage.tsx`
- Modify: `soydt/web/src/App.tsx` (add import + route)
- Modify: `soydt/MIGRATION_CHECKLIST.md` (record the new page)

**Interfaces:**
- Consumes: `GET /api/teams/{teamId}/board` (Task 3), `callApi` (`soydt/web/src/shared/api.ts`), `useTeamCountryId` (`soydt/web/src/shared/useTeamCountryId.ts`), `Layout` (`soydt/web/src/shared/Layout.tsx`), `SectionPanel` (`soydt/web/src/shared/ui/SectionPanel.tsx`), `DataTable`/`DataTableColumn` (`soydt/web/src/shared/ui/DataTable.tsx`), `StatBar` with its new `max`/`tone` props (Task 4).
- Produces: the `/teams/:teamId/board` route, a new page component `TeamBoardPage` default-exported for `App.tsx` to import.

- [ ] **Step 1: Write `soydt/web/src/features/teams/TeamBoardPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import StatBar from '../../shared/ui/StatBar'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// New feature, not a port — the original app never had a board page. See
// docs/superpowers/specs/2026-08-17-club-board-design.md for scope.

type SeasonTargets = {
  transferBudget: number
  wageBudget: number
  maxSquadSize: number
  minSquadSize: number
  expectedPosition: number
  minAcceptablePosition: number
}

type BoardPromise = {
  promiseType: string
  dueDate: string
  overdue: boolean
}

type TeamBoard = {
  confidenceLevel: number
  mood: string
  managerOnFinalWarning: boolean
  poorMoodMonths: number
  chairmanAmbition: string
  chairmanPatience: string
  chairmanManagerLoyalty: number
  ownershipType: string
  ownershipWealth: number
  ownershipInterference: number
  ownershipRiskTolerance: number
  ownershipExitPressure: number
  supporterPressure: number
  mediaPressure: number
  dressingRoomPressure: number
  financialPressure: number
  regulatoryPressure: number
  trustResults: number
  trustFinances: number
  trustSquadBuilding: number
  trustCommunication: number
  styleAlignment: number
  seasonTargets: SeasonTargets | null
  visionPlayingStyle: string
  visionYouthFocus: string
  visionSigningPreference: string
  visionFinancialStance: string
  visionLongTermGoal: string | null
  visionLongTermHorizonSeasons: number
  promises: BoardPromise[]
  takeoverStatus: string
  takeoverMonthsInStatus: number
}

function TeamBoardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [board, setBoard] = useState<TeamBoard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBoard(null)
    setError(null)
    callApi<TeamBoard>(`/api/teams/${teamId}/board`)
      .then(setBoard)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Board" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!board) {
    return (
      <Layout title="Board" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Board" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <SectionPanel title="Board confidence">
          <StatBar label="Confidence" value={board.confidenceLevel} max={100} />
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Mood</span>
              <span className="fm-detail-value">{board.mood}</span>
            </div>
            {board.managerOnFinalWarning && (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Status</span>
                <span className="fm-detail-value" style={{ color: 'crimson' }}>
                  On final warning
                </span>
              </div>
            )}
            <div className="fm-detail-row">
              <span className="fm-detail-label">Poor-mood months</span>
              <span className="fm-detail-value">{board.poorMoodMonths}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Ownership">
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Chairman ambition</span>
              <span className="fm-detail-value">{board.chairmanAmbition}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Chairman patience</span>
              <span className="fm-detail-value">{board.chairmanPatience}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Chairman loyalty</span>
              <span className="fm-detail-value">{board.chairmanManagerLoyalty}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Ownership type</span>
              <span className="fm-detail-value">{board.ownershipType}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Wealth</span>
              <span className="fm-detail-value">{board.ownershipWealth}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Interference</span>
              <span className="fm-detail-value">{board.ownershipInterference}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Risk tolerance</span>
              <span className="fm-detail-value">{board.ownershipRiskTolerance}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Exit pressure</span>
              <span className="fm-detail-value">{board.ownershipExitPressure}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Pressure">
          <StatBar label="Supporters" value={board.supporterPressure} max={100} tone="inverse" />
          <StatBar label="Media" value={board.mediaPressure} max={100} tone="inverse" />
          <StatBar label="Dressing room" value={board.dressingRoomPressure} max={100} tone="inverse" />
          <StatBar label="Financial" value={board.financialPressure} max={100} tone="inverse" />
          <StatBar label="Regulatory" value={board.regulatoryPressure} max={100} tone="inverse" />
        </SectionPanel>

        <SectionPanel title="Manager relationship">
          <StatBar label="Results" value={board.trustResults} max={100} />
          <StatBar label="Finances" value={board.trustFinances} max={100} />
          <StatBar label="Squad building" value={board.trustSquadBuilding} max={100} />
          <StatBar label="Communication" value={board.trustCommunication} max={100} />
          <StatBar label="Style alignment" value={board.styleAlignment} max={100} />
        </SectionPanel>

        <SectionPanel title="Season targets & vision">
          <div className="fm-personal-detail">
            {board.seasonTargets && (
              <>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Expected position</span>
                  <span className="fm-detail-value">{board.seasonTargets.expectedPosition}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Min acceptable position</span>
                  <span className="fm-detail-value">{board.seasonTargets.minAcceptablePosition}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Transfer budget</span>
                  <span className="fm-detail-value">{board.seasonTargets.transferBudget}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Wage budget</span>
                  <span className="fm-detail-value">{board.seasonTargets.wageBudget}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Squad size</span>
                  <span className="fm-detail-value">
                    {board.seasonTargets.minSquadSize}–{board.seasonTargets.maxSquadSize}
                  </span>
                </div>
              </>
            )}
            <div className="fm-detail-row">
              <span className="fm-detail-label">Playing style</span>
              <span className="fm-detail-value">{board.visionPlayingStyle}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Youth focus</span>
              <span className="fm-detail-value">{board.visionYouthFocus}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Signing preference</span>
              <span className="fm-detail-value">{board.visionSigningPreference}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Financial stance</span>
              <span className="fm-detail-value">{board.visionFinancialStance}</span>
            </div>
            {board.visionLongTermGoal && (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Long-term goal</span>
                <span className="fm-detail-value">
                  {board.visionLongTermGoal} ({board.visionLongTermHorizonSeasons}s)
                </span>
              </div>
            )}
          </div>
        </SectionPanel>

        <SectionPanel title="Promises" actions={<span className="fm-panel-count">{board.promises.length}</span>}>
          <DataTable
            rows={board.promises}
            rowKey={(p, i) => `${p.promiseType}-${i}`}
            emptyMessage="No active promises"
            columns={[
              { key: 'type', header: 'Promise', render: (p) => p.promiseType },
              { key: 'due', header: 'Due', render: (p) => p.dueDate },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (p.overdue ? <span style={{ color: 'crimson' }}>Overdue</span> : 'On track'),
              },
            ]}
          />
        </SectionPanel>

        {board.takeoverStatus !== 'None' && (
          <SectionPanel title="Takeover watch">
            <div className="fm-personal-detail">
              <div className="fm-detail-row">
                <span className="fm-detail-label">Status</span>
                <span className="fm-detail-value">{board.takeoverStatus}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Months in status</span>
                <span className="fm-detail-value">{board.takeoverMonthsInStatus}</span>
              </div>
            </div>
          </SectionPanel>
        )}
      </div>
    </Layout>
  )
}

export default TeamBoardPage
```

- [ ] **Step 2: Wire the route in `soydt/web/src/App.tsx`**

Add the import next to the other team-page imports (after line 22, `import TeamFinancesPage from './features/teams/TeamFinancesPage'`):
```tsx
import TeamBoardPage from './features/teams/TeamBoardPage'
```

Add the route next to the other team routes (after line 77, `<Route path="/teams/:teamId/finances" element={<TeamFinancesPage />} />`):
```tsx
<Route path="/teams/:teamId/board" element={<TeamBoardPage />} />
```

- [ ] **Step 3: Build and lint**

```bash
cd soydt/web && npm run build && ./node_modules/.bin/oxlint
```
Expected: `npm run build` clean (`tsc -b && vite build` with no errors); `oxlint` shows only the pre-existing warnings already present before this feature (in `ProcessContext.tsx`, `NewGamePage.tsx`, `positions.tsx`, `RatingBadge.tsx` — no new warnings from `TeamBoardPage.tsx` or `App.tsx`).

- [ ] **Step 4: Manual verification against the running container from Task 3**

If the container from Task 3 Step 3 is still available (or re-run `docker build`/`docker run` per Task 3 Step 2-3 if not), start the Vite dev server pointed at it:
```bash
cd soydt/web && npm run dev
```
Open `http://localhost:5173/teams/1917/board` in a browser (adjust the port to whatever `npm run dev` prints, and the team id to whatever real id you verified against in Task 3). Confirm the page renders all seven panels with real data and no console errors. If no browser/screenshot tool is available in this environment (a documented limitation for several other pages in `MIGRATION_CHECKLIST.md`), state that explicitly in Step 5's checklist entry rather than claiming visual verification that didn't happen.

- [ ] **Step 5: Update `soydt/MIGRATION_CHECKLIST.md`**

Add a new entry near the other `teams/*` entries (follow the existing checkbox format used by e.g. the `teams/scouting.html` line), noting: this is a new feature with no original template, what's included/excluded (link to the spec file), and whether real-data + visual verification was completed or is still pending (per Step 4).

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/features/teams/TeamBoardPage.tsx soydt/web/src/App.tsx soydt/MIGRATION_CHECKLIST.md
git commit -m "feat(web): add Club Board page"
```
