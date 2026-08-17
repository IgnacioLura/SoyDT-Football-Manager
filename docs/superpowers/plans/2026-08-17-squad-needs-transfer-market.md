# Squad Needs + Transfer Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose two read-only slices of `open-football`'s transfer engine: per-team squad-depth shortfalls (a new panel on the existing team overview page) and a country's active transfer listings (a new page/tab).

**Architecture:** Two independent features, each threaded through the same four layers used by every other domain in this codebase (see `team_finances.rs`/`FreeAgentsPage.tsx` as templates): Rust FFI export → C# P/Invoke sibling files → ASP.NET controller action → React UI. Squad Needs adds a panel to an *existing* page (`TeamPage.tsx`); Transfer Market adds a *new* page + route + tab.

**Tech Stack:** Rust (engine-ffi `cdylib`), C# / .NET 8 (`SoyDT.Engine`, `SoyDT.Api`), React + TypeScript + Vite (`soydt/web`).

**Spec:** `docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md`

## Global Constraints

- `CONTRACT_VERSION` (`soydt/engine-ffi/src/contract.rs`) is bumped only on a non-additive change. Both exports here are brand-new — do not touch `contract.rs`.
- Rust enums cross the FFI boundary as plain strings via `format!("{:?}", value)` — never via `serde` on the enum type itself (verified project convention, see `team_tactics.rs`).
- Dates cross the boundary as plain `"YYYY-MM-DD"` strings via `.to_string()` on the `NaiveDate` — not chrono's own serde impl.
- This Windows dev environment's MSVC linker is broken for raw `cargo build` — all Rust build verification uses the Docker command from `soydt/CLAUDE.md`'s "Fast Rust-only iteration" section: `docker run --rm -v "<repo-root>":/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release` (on this machine's Git Bash, run with `MSYS_NO_PATHCONV=1` prefixed and `"$(pwd)"` for `<repo-root>`, or path mounting silently fails).
- This codebase has zero unit tests anywhere in `engine-ffi` and no frontend test runner — every domain is verified via the documented `curl` end-to-end flow (`soydt/CLAUDE.md`'s "Verifying an endpoint end-to-end" section) plus `cargo`/`dotnet`/`npm run build` staying clean. Do not introduce a new test framework.
- JSON casing: engine-ffi emits `snake_case`; `SoyDT.Engine`'s `NativeStringMarshal` deserializes with `JsonNamingPolicy.SnakeCaseLower` into `PascalCase` C# record properties (no `[JsonPropertyName]` needed); ASP.NET's controller output serializes those `PascalCase` properties to `camelCase` JSON by default.
- Country-scoped endpoints in this codebase are **not** one-controller-per-domain: `soydt/src/SoyDT.Api/Controllers/CountriesController.cs` already bundles `leagues`/`squad`/`schedule`/`staff`/`free-agents` as separate actions on one controller class. The Transfer Market endpoint is a new action added to that existing file, not a new controller. Team-scoped endpoints ARE one-controller-per-domain (confirmed via `TeamFinancesController.cs`) — Squad Needs gets its own new controller file.
- Neither feature gets a `SectionPanel` `accent` override — `secondary`/`tertiary`/`gold` are already claimed by Finances/Tactics/Scouting; both use the default `primary` accent.

---

## Task 1: Squad Needs — Rust FFI export

**Files:**
- Create: `soydt/engine-ffi/src/team_squad_needs.rs`
- Modify: `soydt/engine-ffi/src/lib.rs` (insert `mod team_squad_needs;` alphabetically — between `mod team_stats;` and `mod team_staff;`... actually check current order: the existing block reads `mod team_academy; mod team_finances; mod team_relations; mod team_schedule; mod team_scouting; mod team_stats; mod team_staff; mod team_lineup; mod team_tactics; mod team_transfer_action; mod team_transfers;` — this list is NOT strictly alphabetical (team_staff comes after team_stats, team_lineup after team_staff). Insert `mod team_squad_needs;` right after `mod team_scouting;` and before `mod team_stats;`, keeping it near the other `team_s*` entries without trying to fix the file's pre-existing non-alphabetical ordering.)

**Interfaces:**
- Consumes: `crate::contract::run_guarded`, `crate::game::GameHandle`, `crate::strings::to_owned_ptr` (identical to every other domain file). Reads `core::transfers::FirstTeamSquadNeeds::for_club(&Club) -> FirstTeamSquadNeeds`, a struct with fields `main_team_size: usize`, `total_missing: usize`, `urgent: bool`, `gk_count`/`gk_missing`/`def_count`/`def_missing`/`mid_count`/`mid_missing`/`fwd_count`/`fwd_missing: usize`.
- Produces: the C ABI symbol `engine_get_team_squad_needs(handle: *mut GameHandle, team_id: u32) -> *mut c_char`, envelope-wrapping this JSON shape (all counts as `u32`, cast down from `usize`):
  ```
  main_team_size: u32
  total_missing: u32
  urgent: bool
  gk_count: u32
  gk_missing: u32
  def_count: u32
  def_missing: u32
  mid_count: u32
  mid_missing: u32
  fwd_count: u32
  fwd_missing: u32
  ```
  Task 2's C# DTO must match these field names/order exactly (PascalCase conversion of the above).

- [ ] **Step 1: Write `soydt/engine-ffi/src/team_squad_needs.rs`**

```rust
//! Team squad-needs export — backs a new "Squad Needs" panel on React's
//! `/teams/:teamId` overview page. Reuses `team_finances.rs`'s team-lookup
//! pattern (walk continents → countries → clubs, find the club whose
//! `club.teams.teams` contains `team_id`), then projects
//! `core::transfers::FirstTeamSquadNeeds::for_club` — a pure, stateless
//! snapshot of how short the main team is against fixed per-position-group
//! minimums (see `open-football/src/core/src/transfers/squad_needs.rs`).
//! No simplification here — the whole struct is small and every field is
//! directly meaningful, so it's exposed verbatim. See
//! docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::transfers::FirstTeamSquadNeeds;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TeamSquadNeedsJson {
    main_team_size: u32,
    total_missing: u32,
    urgent: bool,
    gk_count: u32,
    gk_missing: u32,
    def_count: u32,
    def_missing: u32,
    mid_count: u32,
    mid_missing: u32,
    fwd_count: u32,
    fwd_missing: u32,
}

impl From<FirstTeamSquadNeeds> for TeamSquadNeedsJson {
    fn from(n: FirstTeamSquadNeeds) -> Self {
        TeamSquadNeedsJson {
            main_team_size: n.main_team_size as u32,
            total_missing: n.total_missing as u32,
            urgent: n.urgent,
            gk_count: n.gk_count as u32,
            gk_missing: n.gk_missing as u32,
            def_count: n.def_count as u32,
            def_missing: n.def_missing as u32,
            mid_count: n.mid_count as u32,
            mid_missing: n.mid_missing as u32,
            fwd_count: n.fwd_count as u32,
            fwd_missing: n.fwd_missing as u32,
        }
    }
}

/// Squad-depth shortfall snapshot for the club that owns `team_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_team_squad_needs(handle: *mut GameHandle, team_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_team_squad_needs", || -> Result<TeamSquadNeedsJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };

        for country in game.data().continents.iter().flat_map(|c| c.countries.iter()) {
            for club in &country.clubs {
                if club.teams.teams.iter().any(|t| t.id == team_id) {
                    return Ok(FirstTeamSquadNeeds::for_club(club).into());
                }
            }
        }

        Err(format!("no team with id {team_id}"))
    });

    to_owned_ptr(json)
}
```

- [ ] **Step 2: Register the module in `soydt/engine-ffi/src/lib.rs`**

Find the line `mod team_scouting;` and insert directly after it, before `mod team_stats;`:
```rust
mod team_squad_needs;
```

- [ ] **Step 3: Build via Docker to verify it compiles**

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)":/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release
```
Expected: build succeeds with no errors (pre-existing warnings in vendored `core` code are fine; zero errors or warnings mentioning `team_squad_needs.rs`).

- [ ] **Step 4: Commit**

```bash
git add soydt/engine-ffi/src/team_squad_needs.rs soydt/engine-ffi/src/lib.rs
git commit -m "feat(engine-ffi): add engine_get_team_squad_needs export"
```

---

## Task 2: Squad Needs — C# layer + controller

**Files:**
- Create: `soydt/src/SoyDT.Domain/TeamSquadNeedsDtos.cs`
- Create: `soydt/src/SoyDT.Engine/NativeMethods.TeamSquadNeeds.cs`
- Create: `soydt/src/SoyDT.Engine/NativeGameEngine.TeamSquadNeeds.cs`
- Create: `soydt/src/SoyDT.Engine/GameSession.TeamSquadNeeds.cs`
- Create: `soydt/src/SoyDT.Api/Controllers/TeamSquadNeedsController.cs`

**Interfaces:**
- Consumes: Task 1's `engine_get_team_squad_needs(handle, team_id) -> *mut c_char` C symbol.
- Produces: `GET /api/teams/{teamId}/squad-needs -> TeamSquadNeeds` (JSON, `camelCase`), consumed by Task 3.

- [ ] **Step 1: Write `soydt/src/SoyDT.Domain/TeamSquadNeedsDtos.cs`**

```csharp
namespace SoyDT.Domain;

/// Mirrors `engine_get_team_squad_needs`'s `data` payload (see
/// engine-ffi/CONTRACT.md) — a pure snapshot of how short a club's main
/// team is against fixed per-position-group minimums.
public sealed record TeamSquadNeeds(
    int MainTeamSize,
    int TotalMissing,
    bool Urgent,
    int GkCount,
    int GkMissing,
    int DefCount,
    int DefMissing,
    int MidCount,
    int MidMissing,
    int FwdCount,
    int FwdMissing);
```

- [ ] **Step 2: Write `soydt/src/SoyDT.Engine/NativeMethods.TeamSquadNeeds.cs`**

```csharp
using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the team-squad-needs export — new sibling file to
/// `NativeMethods.cs` (see that file's remarks) rather than an edit to it.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team_squad_needs(IntPtr handle, uint teamId);
}
```

- [ ] **Step 3: Write `soydt/src/SoyDT.Engine/NativeGameEngine.TeamSquadNeeds.cs`**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the team-squad-needs wrapper without editing the shared file.
public sealed partial class NativeGameEngine
{
    public TeamSquadNeeds GetTeamSquadNeeds(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_squad_needs(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamSquadNeeds>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
```

- [ ] **Step 4: Write `soydt/src/SoyDT.Engine/GameSession.TeamSquadNeeds.cs`**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the team-squad-needs accessor via the shared `WithGame` helper rather
/// than editing the shared file.
public sealed partial class GameSession
{
    public TeamSquadNeeds GetTeamSquadNeeds(uint teamId) => WithGame((e, h) => e.GetTeamSquadNeeds(h, teamId));
}
```

- [ ] **Step 5: Write `soydt/src/SoyDT.Api/Controllers/TeamSquadNeedsController.cs`**

```csharp
using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Squad-depth shortfall snapshot (see
/// docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md).
/// Read-only, backed by `engine_get_team_squad_needs`.
[ApiController]
[Route("api/teams")]
public sealed class TeamSquadNeedsController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/squad-needs")]
    public ActionResult<TeamSquadNeeds> SquadNeeds(uint teamId)
    {
        return Ok(session.GetTeamSquadNeeds(teamId));
    }
}
```

- [ ] **Step 6: Build to verify it compiles**

```bash
cd soydt && dotnet build SoyDT.sln
```
Expected: `Build succeeded.` with 0 errors. (A missing-native-library runtime error is expected in this dev environment — only a **C# compile error** referencing `TeamSquadNeeds`/`NativeMethods.TeamSquadNeeds`/etc. is a real failure here.)

- [ ] **Step 7: Commit**

```bash
git add soydt/src/SoyDT.Domain/TeamSquadNeedsDtos.cs soydt/src/SoyDT.Engine/NativeMethods.TeamSquadNeeds.cs soydt/src/SoyDT.Engine/NativeGameEngine.TeamSquadNeeds.cs soydt/src/SoyDT.Engine/GameSession.TeamSquadNeeds.cs soydt/src/SoyDT.Api/Controllers/TeamSquadNeedsController.cs
git commit -m "feat(engine): add GameSession.GetTeamSquadNeeds + GET /api/teams/{teamId}/squad-needs"
```

---

## Task 3: Squad Needs — `TeamPage.tsx` panel

**Files:**
- Modify: `soydt/web/src/features/teams/TeamPage.tsx`

**Interfaces:**
- Consumes: `GET /api/teams/{teamId}/squad-needs` (Task 2), `callApi` (`soydt/web/src/shared/api.ts`), `SectionPanel` (`soydt/web/src/shared/ui/SectionPanel.tsx`).
- Produces: nothing consumed by later tasks (this is the last step of the Squad Needs feature).

The full current content of `soydt/web/src/features/teams/TeamPage.tsx` is:

```tsx
// soydt/web/src/features/teams/TeamPage.tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Layout from '../../shared/Layout'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import PlayerCard from '../../shared/ui/PlayerCard'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
import './TeamPage.css'

// Phase 1: team overview/squad page, mirrors the original app's
// `/{lang}/teams/{slug}` route (overview tab only so far — tactics/staff/
// transfers/etc. are separate tabs there, not yet ported).
//
// Fase A (2026-08-16 EA FC redesign spec): squad renders as a PlayerCard
// grid instead of a table — same underlying `players` data, no API change.

type TeamPlayer = { id: number; name: string; position: string; age: number; currentAbility: number }
type TeamDetail = {
  id: number
  name: string
  slug: string
  clubId: number
  countryId: number
  leagueId: number | null
  leagueName: string | null
  reputation: number
  players: TeamPlayer[]
}

function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('position')

  useEffect(() => {
    setTeam(null)
    setError(null)
    callApi<TeamDetail>(`/api/teams/${teamId}`)
      .then(setTeam)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Team">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!team) {
    return (
      <Layout title="Team">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const subTitle = team.leagueId ? (
    <Link to={`/leagues/${team.leagueId}`}>{team.leagueName}</Link>
  ) : undefined

  return (
    <Layout title={team.name} subTitle={subTitle} sidebarCountryId={team.countryId}>
      <div className="fm-page">
        <SectionPanel
          title="Squad"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="tp-count">{team.players.length}</span>
              <AiReportButton title="AI scouting report" startUrl={`/api/teams/${teamId}/ai-report`} />
            </>
          }
        >
          <div className="tp-grid">
            {sortByMode(team.players, sortMode, (p) => p.position, (p) => p.currentAbility).map((p, i) => (
              <PlayerCard
                key={p.id}
                id={p.id}
                name={p.name}
                position={p.position}
                age={p.age}
                currentAbility={p.currentAbility}
                index={i}
              />
            ))}
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamPage
```

- [ ] **Step 1: Add a `TeamSquadNeeds` type and fetch state**

Add this type next to `TeamDetail`:

```tsx
type TeamSquadNeeds = {
  mainTeamSize: number
  totalMissing: number
  urgent: boolean
  gkCount: number
  gkMissing: number
  defCount: number
  defMissing: number
  midCount: number
  midMissing: number
  fwdCount: number
  fwdMissing: number
}
```

Add a second piece of state and a second fetch effect, independent of the main `team` fetch (the squad-needs panel should render once it loads, whether or not it arrives before or after the main squad data — do not block or gate the main page on this fetch):

```tsx
  const [squadNeeds, setSquadNeeds] = useState<TeamSquadNeeds | null>(null)

  useEffect(() => {
    setSquadNeeds(null)
    callApi<TeamSquadNeeds>(`/api/teams/${teamId}/squad-needs`).then(setSquadNeeds).catch(() => setSquadNeeds(null))
  }, [teamId])
```
Place this second `useState`/`useEffect` pair directly after the existing `sortMode` state declaration and its effect, before the `if (error)` branch.

- [ ] **Step 2: Add the "Squad Needs" panel**

Insert a new `SectionPanel` directly after the closing `</SectionPanel>` of the existing "Squad" panel (still inside the `<div className="fm-page">` wrapper, before its closing `</div>`):

```tsx
        {squadNeeds && (
          <SectionPanel title="Squad Needs">
            <div className="fm-personal-detail">
              {squadNeeds.urgent && (
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Status</span>
                  <span className="fm-detail-value" style={{ color: 'crimson' }}>
                    Urgent — squad below minimum
                  </span>
                </div>
              )}
              <div className="fm-detail-row">
                <span className="fm-detail-label">Goalkeepers</span>
                <span className="fm-detail-value" style={squadNeeds.gkMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.gkCount}
                  {squadNeeds.gkMissing > 0 ? ` (${squadNeeds.gkMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Defenders</span>
                <span className="fm-detail-value" style={squadNeeds.defMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.defCount}
                  {squadNeeds.defMissing > 0 ? ` (${squadNeeds.defMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Midfielders</span>
                <span className="fm-detail-value" style={squadNeeds.midMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.midCount}
                  {squadNeeds.midMissing > 0 ? ` (${squadNeeds.midMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Forwards</span>
                <span className="fm-detail-value" style={squadNeeds.fwdMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.fwdCount}
                  {squadNeeds.fwdMissing > 0 ? ` (${squadNeeds.fwdMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Total missing</span>
                <span
                  className="fm-detail-value"
                  style={squadNeeds.totalMissing > 0 ? { color: 'crimson' } : undefined}
                >
                  {squadNeeds.totalMissing}
                </span>
              </div>
            </div>
          </SectionPanel>
        )}
```

- [ ] **Step 3: Build and lint**

```bash
cd soydt/web && npm run build && ./node_modules/.bin/oxlint
```
Expected: clean build, no new lint warnings (existing pre-existing warnings in unrelated files are fine).

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/features/teams/TeamPage.tsx
git commit -m "feat(web): add Squad Needs panel to team page"
```

---

## Task 4: Transfer Market — Rust FFI export

**Files:**
- Create: `soydt/engine-ffi/src/country_transfer_market.rs`
- Modify: `soydt/engine-ffi/src/lib.rs` (insert `mod country_transfer_market;` — the file's `mod` list starts with `mod ai_tools; mod awards; mod contract; mod continental; mod cups; mod game; ...`; insert alphabetically between `mod continental;` and `mod cups;`)

**Interfaces:**
- Consumes: `crate::contract::run_guarded`, `crate::game::GameHandle`, `crate::strings::to_owned_ptr`, `core::utils::DateUtils` (all used identically elsewhere, e.g. `watchlist.rs`). Reads `Country.transfer_market: core::transfers::TransferMarket` (field `transfer_window_open: bool`, field `listings: Vec<TransferListing>` where each has `player_id: u32`, `asking_price: CurrencyValue` (take `.amount: f64`), `listed_date: NaiveDate`, `listing_type: TransferListingType`, `status: TransferListingStatus` — variants `Available`/`InNegotiation`/`Completed`/`Cancelled`). Uses `game.data().country(country_id) -> Option<&Country>` and `game.data().player_with_team(player_id) -> Option<(&Player, &Team)>` (both existing `SimulatorData` helper methods, the latter already used by `watchlist.rs`).
- Produces: the C ABI symbol `engine_get_country_transfer_market(handle: *mut GameHandle, country_id: u32) -> *mut c_char`, envelope-wrapping this JSON shape (Task 5's C# DTOs must match field names/order exactly):
  ```
  {
    "transfer_window_open": true,
    "listings": [
      {
        "player_id": 123,
        "player_name": "...",
        "position": "ST",
        "age": 24,
        "team_id": 456,
        "team_name": "...",
        "team_slug": "...",
        "asking_price": 5000000.0,
        "listing_type": "Transfer",
        "status": "Available",
        "listed_date": "2026-07-01"
      }
    ]
  }
  ```

- [ ] **Step 1: Write `soydt/engine-ffi/src/country_transfer_market.rs`**

```rust
//! Country transfer-market export — backs a new "Transfer Market" tab on
//! React's `/countries/:countryId` sub-pages (`countries/tabs.tsx`). Reads
//! `Country.transfer_market: core::transfers::TransferMarket`, already
//! populated by the AI transfer pipeline — no new computation needed.
//!
//! SIMPLIFIED: only `Available`/`InNegotiation` listings are returned
//! (`Completed`/`Cancelled` are historical noise here — `transfers.rs`'s
//! `engine_get_league_transfers` already covers completed deals). Live
//! negotiation/offer state (`TransferMarket.negotiations`) is deliberately
//! not exposed — internal AI bookkeeping with no stable browsable shape.
//! See docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md.

use crate::contract::run_guarded;
use crate::game::GameHandle;
use crate::strings::to_owned_ptr;
use core::transfers::TransferListingStatus;
use core::utils::DateUtils;
use serde::Serialize;
use std::os::raw::c_char;

#[derive(Serialize)]
struct TransferListingJson {
    player_id: u32,
    player_name: String,
    position: String,
    age: u8,
    team_id: u32,
    team_name: String,
    team_slug: String,
    asking_price: f64,
    listing_type: String,
    status: String,
    listed_date: String,
}

#[derive(Serialize)]
struct CountryTransferMarketJson {
    transfer_window_open: bool,
    listings: Vec<TransferListingJson>,
}

/// Current transfer-window status and active listings for `country_id`.
///
/// # Safety
/// `handle` must be a live pointer returned by `engine_create_game` or
/// `engine_create_scoped_game`.
#[unsafe(no_mangle)]
pub extern "C" fn engine_get_country_transfer_market(handle: *mut GameHandle, country_id: u32) -> *mut c_char {
    let json = run_guarded("engine_get_country_transfer_market", || -> Result<CountryTransferMarketJson, String> {
        if handle.is_null() {
            return Err("null game handle".to_string());
        }
        let game = unsafe { &*handle };
        let now = game.data().date.date();

        let country = game
            .data()
            .country(country_id)
            .ok_or_else(|| format!("no country with id {country_id}"))?;

        let listings = country
            .transfer_market
            .listings
            .iter()
            .filter(|l| matches!(l.status, TransferListingStatus::Available | TransferListingStatus::InNegotiation))
            .filter_map(|l| {
                let (player, team) = game.data().player_with_team(l.player_id)?;
                Some(TransferListingJson {
                    player_id: player.id,
                    player_name: format!("{} {}", player.full_name.first_name, player.full_name.last_name),
                    position: player.positions.primary().map(|p| p.get_short_name().to_string()).unwrap_or_default(),
                    age: DateUtils::age(player.birth_date, now),
                    team_id: team.id,
                    team_name: team.name.clone(),
                    team_slug: team.slug.clone(),
                    asking_price: l.asking_price.amount,
                    listing_type: format!("{:?}", l.listing_type),
                    status: format!("{:?}", l.status),
                    listed_date: l.listed_date.to_string(),
                })
            })
            .collect();

        Ok(CountryTransferMarketJson {
            transfer_window_open: country.transfer_market.transfer_window_open,
            listings,
        })
    });

    to_owned_ptr(json)
}
```

- [ ] **Step 2: Register the module in `soydt/engine-ffi/src/lib.rs`**

Find `mod continental;` near the top of the `mod` list and insert directly after it, before `mod cups;`:
```rust
mod country_transfer_market;
```

- [ ] **Step 3: Build via Docker to verify it compiles**

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)":/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release
```
Expected: build succeeds with no errors (pre-existing unrelated warnings are fine; zero errors or warnings mentioning `country_transfer_market.rs`).

- [ ] **Step 4: Commit**

```bash
git add soydt/engine-ffi/src/country_transfer_market.rs soydt/engine-ffi/src/lib.rs
git commit -m "feat(engine-ffi): add engine_get_country_transfer_market export"
```

---

## Task 5: Transfer Market — C# layer + controller

**Files:**
- Create: `soydt/src/SoyDT.Domain/CountryTransferMarketDtos.cs`
- Create: `soydt/src/SoyDT.Engine/NativeMethods.CountryTransferMarket.cs`
- Create: `soydt/src/SoyDT.Engine/NativeGameEngine.CountryTransferMarket.cs`
- Create: `soydt/src/SoyDT.Engine/GameSession.CountryTransferMarket.cs`
- Modify: `soydt/src/SoyDT.Api/Controllers/CountriesController.cs`

**Interfaces:**
- Consumes: Task 4's `engine_get_country_transfer_market(handle, country_id) -> *mut c_char` C symbol.
- Produces: `GET /api/countries/{countryId}/transfer-market -> CountryTransferMarket` (JSON, `camelCase`), consumed by Task 6.

- [ ] **Step 1: Write `soydt/src/SoyDT.Domain/CountryTransferMarketDtos.cs`**

```csharp
namespace SoyDT.Domain;

/// Mirrors `engine_get_country_transfer_market`'s `data` payload (see
/// engine-ffi/CONTRACT.md). Only `Available`/`InNegotiation` listings are
/// included — completed/cancelled listings are historical noise here.
public sealed record TransferListing(
    uint PlayerId,
    string PlayerName,
    string Position,
    byte Age,
    uint TeamId,
    string TeamName,
    string TeamSlug,
    double AskingPrice,
    string ListingType,
    string Status,
    string ListedDate);

public sealed record CountryTransferMarket(
    bool TransferWindowOpen,
    IReadOnlyList<TransferListing> Listings);
```

- [ ] **Step 2: Write `soydt/src/SoyDT.Engine/NativeMethods.CountryTransferMarket.cs`**

```csharp
using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the country-transfer-market export — new sibling
/// file to `NativeMethods.cs` (see that file's remarks) rather than an edit
/// to it.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_country_transfer_market(IntPtr handle, uint countryId);
}
```

- [ ] **Step 3: Write `soydt/src/SoyDT.Engine/NativeGameEngine.CountryTransferMarket.cs`**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the country-transfer-market wrapper without editing the shared
/// file.
public sealed partial class NativeGameEngine
{
    public CountryTransferMarket GetCountryTransferMarket(GameHandleSafeHandle game, uint countryId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_country_transfer_market(game.DangerousGetHandle(), countryId);
            return NativeStringMarshal.ReadEnvelope<CountryTransferMarket>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
```

- [ ] **Step 4: Write `soydt/src/SoyDT.Engine/GameSession.CountryTransferMarket.cs`**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the country-transfer-market accessor via the shared `WithGame` helper
/// rather than editing the shared file.
public sealed partial class GameSession
{
    public CountryTransferMarket GetCountryTransferMarket(uint countryId) =>
        WithGame((e, h) => e.GetCountryTransferMarket(h, countryId));
}
```

- [ ] **Step 5: Add an action to `soydt/src/SoyDT.Api/Controllers/CountriesController.cs`**

The current full content of this file is:

```csharp
using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: the countries index page (mirrors the original app's
/// `/{lang}/countries` route). Read-only, backed by `engine_get_countries`.
[ApiController]
[Route("api/countries")]
public sealed class CountriesController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<CountryListItem>> List()
    {
        return Ok(session.GetCountries());
    }

    [HttpGet("{countryId}/leagues")]
    public ActionResult<IReadOnlyList<LeagueListItem>> Leagues(uint countryId)
    {
        return Ok(session.GetLeagues(countryId));
    }

    [HttpGet("{countryId}/squad")]
    public ActionResult<IReadOnlyList<NationalSquadRow>> Squad(uint countryId, [FromQuery] bool u21 = false)
    {
        return Ok(session.GetNationalSquad(countryId, u21));
    }

    [HttpGet("{countryId}/schedule")]
    public ActionResult<IReadOnlyList<NationalScheduleItem>> Schedule(uint countryId, [FromQuery] bool u21 = false)
    {
        return Ok(session.GetNationalSchedule(countryId, u21));
    }

    [HttpGet("{countryId}/staff")]
    public ActionResult<IReadOnlyList<NationalStaffMember>> Staff(uint countryId, [FromQuery] bool u21 = false)
    {
        return Ok(session.GetNationalStaff(countryId, u21));
    }

    [HttpGet("{countryId}/free-agents")]
    public ActionResult<IReadOnlyList<FreeAgent>> FreeAgents(uint countryId)
    {
        return Ok(session.GetFreeAgents(countryId));
    }
}
```

Add a new action, `TransferMarket`, right after `FreeAgents` and before the closing `}` of the class:

```csharp
    [HttpGet("{countryId}/transfer-market")]
    public ActionResult<CountryTransferMarket> TransferMarket(uint countryId)
    {
        return Ok(session.GetCountryTransferMarket(countryId));
    }
```

- [ ] **Step 6: Build to verify it compiles**

```bash
cd soydt && dotnet build SoyDT.sln
```
Expected: `Build succeeded.` with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add soydt/src/SoyDT.Domain/CountryTransferMarketDtos.cs soydt/src/SoyDT.Engine/NativeMethods.CountryTransferMarket.cs soydt/src/SoyDT.Engine/NativeGameEngine.CountryTransferMarket.cs soydt/src/SoyDT.Engine/GameSession.CountryTransferMarket.cs soydt/src/SoyDT.Api/Controllers/CountriesController.cs
git commit -m "feat(engine): add GameSession.GetCountryTransferMarket + GET /api/countries/{countryId}/transfer-market"
```

---

## Task 6: Transfer Market — page + route + tab

**Files:**
- Create: `soydt/web/src/features/countries/TransferMarketPage.tsx`
- Modify: `soydt/web/src/features/countries/tabs.tsx`
- Modify: `soydt/web/src/App.tsx`

**Interfaces:**
- Consumes: `GET /api/countries/{countryId}/transfer-market` (Task 5), `callApi`, `Layout`, `SectionPanel`, `DataTable` (`soydt/web/src/shared/ui/DataTable.tsx`), `countryTabs` (Task 6's own modification to `tabs.tsx`).
- Produces: the `/countries/:countryId/transfer-market` route.

- [ ] **Step 1: Add the `transfer_market` tab to `soydt/web/src/features/countries/tabs.tsx`**

The current full content of this file is:

```tsx
import TabBar from '../../shared/ui/TabBar'

// Shared tab bar for the country sub-pages (squad/schedule/staff/leagues/
// free-agents) — mirrors open-football/src/web/src/countries/countries_layout.html.

export type CountryTab = 'squad' | 'schedule' | 'staff' | 'leagues' | 'free_agents'

export function countryTabs(countryId: string, active: CountryTab) {
  return (
    <TabBar
      active={active}
      items={[
        { key: 'squad', label: 'Squad', to: `/countries/${countryId}` },
        { key: 'schedule', label: 'Schedule', to: `/countries/${countryId}/schedule` },
        { key: 'staff', label: 'Staff', to: `/countries/${countryId}/staff` },
        { key: 'leagues', label: 'Leagues', to: `/countries/${countryId}/leagues` },
        { key: 'free_agents', label: 'Free agents', to: `/countries/${countryId}/free-agents` },
      ]}
    />
  )
}
```

Replace it with:

```tsx
import TabBar from '../../shared/ui/TabBar'

// Shared tab bar for the country sub-pages (squad/schedule/staff/leagues/
// free-agents/transfer-market) — mirrors open-football/src/web/src/countries/countries_layout.html
// (transfer_market is a new tab, not in the original template — see
// docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md).

export type CountryTab = 'squad' | 'schedule' | 'staff' | 'leagues' | 'free_agents' | 'transfer_market'

export function countryTabs(countryId: string, active: CountryTab) {
  return (
    <TabBar
      active={active}
      items={[
        { key: 'squad', label: 'Squad', to: `/countries/${countryId}` },
        { key: 'schedule', label: 'Schedule', to: `/countries/${countryId}/schedule` },
        { key: 'staff', label: 'Staff', to: `/countries/${countryId}/staff` },
        { key: 'leagues', label: 'Leagues', to: `/countries/${countryId}/leagues` },
        { key: 'free_agents', label: 'Free agents', to: `/countries/${countryId}/free-agents` },
        { key: 'transfer_market', label: 'Transfer Market', to: `/countries/${countryId}/transfer-market` },
      ]}
    />
  )
}
```

- [ ] **Step 2: Write `soydt/web/src/features/countries/TransferMarketPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import { countryTabs } from './tabs'

// New feature, not a port — the original app has no transfer-market
// browse page. See docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md.

type TransferListing = {
  playerId: number
  playerName: string
  position: string
  age: number
  teamId: number
  teamName: string
  teamSlug: string
  askingPrice: number
  listingType: string
  status: string
  listedDate: string
}

type CountryTransferMarket = {
  transferWindowOpen: boolean
  listings: TransferListing[]
}

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function TransferMarketPage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [market, setMarket] = useState<CountryTransferMarket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMarket(null)
    setError(null)
    callApi<CountryTransferMarket>(`/api/countries/${countryId}/transfer-market`)
      .then(setMarket)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId])

  const tabs = countryTabs(countryId!, 'transfer_market')

  if (error) {
    return (
      <Layout title="Transfer Market" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!market) {
    return (
      <Layout title="Transfer Market" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Transfer Market" subTitle={tabs} sidebarCountryId={Number(countryId)}>
      <div className="fm-page">
        <SectionPanel
          title="Transfer Market"
          actions={
            <span className="fm-panel-count">
              {market.transferWindowOpen ? 'Window open' : 'Window closed'} · {market.listings.length}
            </span>
          }
        >
          <DataTable
            rows={market.listings}
            rowKey={(l) => l.playerId}
            emptyMessage="No players currently listed"
            columns={[
              {
                key: 'name',
                header: 'Player',
                render: (l) => <Link to={`/players/${l.playerId}`}>{l.playerName}</Link>,
              },
              { key: 'pos', header: 'Pos', align: 'center', render: (l) => <PositionBadge position={l.position} /> },
              { key: 'age', header: 'Age', align: 'center', render: (l) => l.age },
              {
                key: 'team',
                header: 'Team',
                render: (l) => <Link to={`/teams/${l.teamId}`}>{l.teamName}</Link>,
              },
              { key: 'price', header: 'Asking price', align: 'right', render: (l) => money(l.askingPrice) },
              { key: 'type', header: 'Type', render: (l) => l.listingType },
              { key: 'status', header: 'Status', render: (l) => l.status },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TransferMarketPage
```

- [ ] **Step 3: Wire the route in `soydt/web/src/App.tsx`**

Add the import next to the other country-page imports (after `import FreeAgentsPage from './features/countries/FreeAgentsPage'`):
```tsx
import TransferMarketPage from './features/countries/TransferMarketPage'
```

Add the route next to the other country routes (after `<Route path="/countries/:countryId/free-agents" element={<FreeAgentsPage />} />`):
```tsx
<Route path="/countries/:countryId/transfer-market" element={<TransferMarketPage />} />
```

- [ ] **Step 4: Build and lint**

```bash
cd soydt/web && npm run build && ./node_modules/.bin/oxlint
```
Expected: clean build, no new lint warnings.

- [ ] **Step 5: Update `soydt/MIGRATION_CHECKLIST.md`**

Add a new entry near the other `countries/*` entries (match the surrounding entries' exact checkbox/prose format), noting this is a new feature with no original template, linking the spec, and listing what's included (Available/InNegotiation listings, transfer window status) and excluded (negotiation/offer internals).

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/features/countries/TransferMarketPage.tsx soydt/web/src/features/countries/tabs.tsx soydt/web/src/App.tsx soydt/MIGRATION_CHECKLIST.md
git commit -m "feat(web): add Transfer Market page"
```
