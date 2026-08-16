# DT Random Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From matchday 5 onward, DT mode has a 35% chance per completed matchday of firing one of 3 flavor events (investor, player hot streak, staff experiment), each resolving 50/50 success/failure and applying a 2-match OVR/morale buff or debuff, shown via a modal after processing and a dedicated log page.

**Architecture:** Self-contained .NET-side ledger (event catalog, log, active buffs) hooked into `GameSession.ProcessDays`/`ProcessDaysWithProgress` — no `engine-ffi`/Rust changes. A new `GET /api/dt/events` endpoint exposes the log + active buffs; the frontend shows a one-time modal after a `process` run and folds active buffs into `DtSquadPage.tsx`'s existing OVR display, the same way the out-of-position penalty already works.

**Tech Stack:** ASP.NET Core (C#) for `SoyDT.Engine`/`SoyDT.Domain`/`SoyDT.Api`; React + TypeScript (Vite) for `soydt/web`.

**Spec:** [docs/superpowers/specs/2026-08-16-dt-random-events-design.md](../specs/2026-08-16-dt-random-events-design.md)

## Global Constraints

- No `engine-ffi` (Rust) changes — this feature never reads or writes real `SimulatorData` (finances, CA, morale). All numbers live in a separate .NET ledger.
- Trigger chance: 35% per completed matchday, only considered once the team's completed-match count is ≥ 5.
- Buff/debuff duration: exactly 2 matches, decremented once per completed matchday (own team's matches only).
- Event catalog is fixed at exactly 3 entries for v1 (investor/team, hot streak/player, staff experiment/team) — no config UI.
- This repo has **no .NET or JS unit test project** (verified: no `*.Tests.csproj`, no `vitest`/`jest` configured in `soydt/web/package.json`) — the established verification convention project-wide is `dotnet build` / Docker + curl / browser checks (see `MIGRATION_CHECKLIST.md`). Do not introduce a new test framework; every task below ends with a build + manual verification step instead of an automated test run.
- ASP.NET Core's default JSON casing is camelCase on the wire (confirmed against existing DTOs, e.g. `TeamScheduleItem.HomeGoals` → frontend `homeGoals`) — new DTOs follow the same convention without any explicit `[JsonPropertyName]`.

---

### Task 1: Domain DTOs for events

**Files:**
- Create: `soydt/src/SoyDT.Domain/DtEventDtos.cs`

**Interfaces:**
- Produces: `DtEventLogEntryDto(string EventId, string Name, string StoryText, bool Success, int Matchday, string Scope, uint? PlayerId, string? PlayerName)`, `DtActiveBuffDto(string Scope, uint? PlayerId, string? PlayerName, int OvrDelta, int MoraleDelta, int MatchesRemaining)`, `DtEventsResponseDto(IReadOnlyList<DtEventLogEntryDto> Log, IReadOnlyList<DtActiveBuffDto> ActiveBuffs)` — consumed by Task 2 (`GameSession.GetDtEvents`) and Task 3 (controller).

- [ ] **Step 1: Write the DTOs**

```csharp
namespace SoyDT.Domain;

/// One resolved DT random event — see
/// docs/superpowers/specs/2026-08-16-dt-random-events-design.md. `Scope` is
/// "Team" or "Player"; `PlayerId`/`PlayerName` are only set when `Scope` is
/// "Player". Purely a .NET-side ledger entry — never touches real engine
/// state (finances/CA/morale).
public sealed record DtEventLogEntryDto(
    string EventId,
    string Name,
    string StoryText,
    bool Success,
    int Matchday,
    string Scope,
    uint? PlayerId,
    string? PlayerName);

/// A currently-active OVR/morale modifier from a resolved event, still
/// counting down. `Scope`/`PlayerId`/`PlayerName` mirror
/// <see cref="DtEventLogEntryDto"/> — "Team" buffs apply to every player,
/// "Player" buffs apply only to the named one.
public sealed record DtActiveBuffDto(
    string Scope,
    uint? PlayerId,
    string? PlayerName,
    int OvrDelta,
    int MoraleDelta,
    int MatchesRemaining);

/// `GET /api/dt/events` response — full history (newest first) plus
/// whatever buffs are still counting down.
public sealed record DtEventsResponseDto(
    IReadOnlyList<DtEventLogEntryDto> Log,
    IReadOnlyList<DtActiveBuffDto> ActiveBuffs);
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd soydt && dotnet build SoyDT.sln`
Expected: build succeeds, no errors (this file has no consumers yet, so nothing else changes).

- [ ] **Step 3: Commit**

```bash
git add soydt/src/SoyDT.Domain/DtEventDtos.cs
git commit -m "Add DT event DTOs"
```

---

### Task 2: Event engine + trigger hook in `GameSession`

**Files:**
- Create: `soydt/src/SoyDT.Engine/GameSession.DtEvents.cs`
- Modify: `soydt/src/SoyDT.Engine/GameSession.cs:142-152` (reset on new game), `:157-167` (`ProcessDays` hook), `:182-201` (`ProcessDaysWithProgress` hook)

**Interfaces:**
- Consumes: `NativeGameEngine.GetTeamSchedule(GameHandleSafeHandle, uint) -> IReadOnlyList<TeamScheduleItem>` (existing, `TeamScheduleItem.HomeGoals`/`AwayGoals` are `byte?`, non-null once played); `NativeGameEngine.GetTeam(GameHandleSafeHandle, uint) -> TeamDetail` (existing, `TeamDetail.Players -> IReadOnlyList<PlayerCard>`, `PlayerCard(uint Id, string Name, ...)`); `GameSession._myClubId` (existing private field, same partial class).
- Produces: `GameSession.GetDtEvents() -> DtEventsResponseDto` (consumed by Task 3's controller); private `AdvanceDtEvents(NativeGameEngine engine, GameHandleSafeHandle working)` and `ResetDtEvents()` (consumed by the `GameSession.cs` hook edits in this same task).

- [ ] **Step 1: Write the event engine file**

```csharp
using SoyDT.Domain;

namespace SoyDT.Engine;

/// DT random events — from matchday 5 onward, a 35% chance per completed
/// matchday of firing one of a fixed 3-entry catalog (investor, player hot
/// streak, staff experiment), each resolving 50/50 and applying a 2-match
/// OVR/morale buff or debuff. Entirely a .NET-side ledger: never reads or
/// writes real engine finances/CA/morale — see
/// docs/superpowers/specs/2026-08-16-dt-random-events-design.md. State is
/// read under `_writeGate` (see GameSession.cs) since it's a plain mutable
/// CLR list shared across threads, unlike the read paths that only ever
/// touch the immutable published native handle.
public sealed partial class GameSession
{
    private const double DtEventTriggerChance = 0.35;
    private const int DtEventMinMatchday = 5;
    private const int DtBuffDurationMatches = 2;

    private sealed record DtEventDefinition(
        string Id,
        string Name,
        string SuccessText,
        string FailureText,
        string Scope,
        int SuccessOvrDelta,
        int SuccessMoraleDelta,
        int FailureOvrDelta,
        int FailureMoraleDelta);

    private sealed class DtActiveBuffState
    {
        public required string Scope;
        public uint? PlayerId;
        public string? PlayerName;
        public int OvrDelta;
        public int MoraleDelta;
        public int MatchesRemaining;
    }

    // {player} is replaced with the resolved player's name at trigger time
    // for "Player"-scope entries; ignored for "Team"-scope entries.
    private static readonly DtEventDefinition[] DtEventCatalog =
    [
        new(
            "investor",
            "Inversor extranjero",
            "Un grupo inversor extranjero pone plata en el club — el plantel llega con la moral por las nubes.",
            "El acuerdo con el grupo inversor se cae en el último momento y deja una cláusula desfavorable — el plantel queda golpeado.",
            "Team",
            SuccessOvrDelta: 3, SuccessMoraleDelta: 10,
            FailureOvrDelta: -3, FailureMoraleDelta: -10),
        new(
            "hot_streak",
            "Racha de un jugador",
            "{player} está que arde en los entrenamientos — rinde a otro nivel.",
            "{player} perdió la chispa esta semana — se lo nota bajoneado.",
            "Player",
            SuccessOvrDelta: 8, SuccessMoraleDelta: 5,
            FailureOvrDelta: -8, FailureMoraleDelta: -5),
        new(
            "staff_experiment",
            "El cuerpo técnico prueba algo nuevo",
            "El cuerpo técnico prueba una rutina nueva y el plantel responde de diez.",
            "La rutina nueva del cuerpo técnico no cayó bien — hay quejas en el vestuario.",
            "Team",
            SuccessOvrDelta: 2, SuccessMoraleDelta: 8,
            FailureOvrDelta: 0, FailureMoraleDelta: -8),
    ];

    private readonly Random _dtEventRng = new();
    private readonly List<DtEventLogEntryDto> _dtEventLog = [];
    private readonly List<DtActiveBuffState> _dtActiveBuffs = [];
    private uint _dtLastCompletedMatchCount;

    /// Called from `CreateNewGame` — a fresh world has no matches played
    /// yet, so any carried-over event state would be stale.
    private void ResetDtEvents()
    {
        _dtEventLog.Clear();
        _dtActiveBuffs.Clear();
        _dtLastCompletedMatchCount = 0;
    }

    /// Called after each engine day-advance, with the still-unpublished
    /// `working` handle — reads straight from it (not `WithGame`, which
    /// only ever sees the published `_current`) so
    /// `ProcessDaysWithProgress`'s per-day loop, which publishes once at
    /// the very end, still sees each day's real match completions as they
    /// happen rather than only the final state.
    private void AdvanceDtEvents(NativeGameEngine engine, GameHandleSafeHandle working)
    {
        if (_myClubId is not { } clubId) return;

        var schedule = engine.GetTeamSchedule(working, clubId);
        var completedCount = (uint)schedule.Count(m => m.HomeGoals.HasValue && m.AwayGoals.HasValue);
        if (completedCount <= _dtLastCompletedMatchCount) return;

        for (var matchday = _dtLastCompletedMatchCount + 1; matchday <= completedCount; matchday++)
        {
            DecayDtBuffs();
            if (matchday >= DtEventMinMatchday)
            {
                MaybeTriggerDtEvent(engine, working, clubId, (int)matchday);
            }
        }

        _dtLastCompletedMatchCount = completedCount;
    }

    private void DecayDtBuffs()
    {
        foreach (var buff in _dtActiveBuffs)
        {
            buff.MatchesRemaining--;
        }
        _dtActiveBuffs.RemoveAll(b => b.MatchesRemaining <= 0);
    }

    private void MaybeTriggerDtEvent(NativeGameEngine engine, GameHandleSafeHandle working, uint clubId, int matchday)
    {
        if (_dtEventRng.NextDouble() >= DtEventTriggerChance) return;

        var definition = DtEventCatalog[_dtEventRng.Next(DtEventCatalog.Length)];
        var success = _dtEventRng.NextDouble() < 0.5;

        uint? playerId = null;
        string? playerName = null;
        if (definition.Scope == "Player")
        {
            var team = engine.GetTeam(working, clubId);
            if (team.Players.Count == 0) return;
            var picked = team.Players[_dtEventRng.Next(team.Players.Count)];
            playerId = picked.Id;
            playerName = picked.Name;
        }

        var rawText = success ? definition.SuccessText : definition.FailureText;
        var storyText = playerName is not null ? rawText.Replace("{player}", playerName) : rawText;
        var ovrDelta = success ? definition.SuccessOvrDelta : definition.FailureOvrDelta;
        var moraleDelta = success ? definition.SuccessMoraleDelta : definition.FailureMoraleDelta;

        _dtEventLog.Insert(0, new DtEventLogEntryDto(
            definition.Id, definition.Name, storyText, success, matchday, definition.Scope, playerId, playerName));

        _dtActiveBuffs.Add(new DtActiveBuffState
        {
            Scope = definition.Scope,
            PlayerId = playerId,
            PlayerName = playerName,
            OvrDelta = ovrDelta,
            MoraleDelta = moraleDelta,
            MatchesRemaining = DtBuffDurationMatches,
        });
    }

    /// Reads under `_writeGate` — `_dtEventLog`/`_dtActiveBuffs` are plain
    /// mutable lists mutated inside that same lock by `AdvanceDtEvents`
    /// (see `ProcessDays`/`ProcessDaysWithProgress`), so a concurrent GET
    /// needs the same lock to avoid a torn read.
    public DtEventsResponseDto GetDtEvents()
    {
        lock (_writeGate)
        {
            return new DtEventsResponseDto(
                _dtEventLog.ToList(),
                _dtActiveBuffs
                    .Select(b => new DtActiveBuffDto(b.Scope, b.PlayerId, b.PlayerName, b.OvrDelta, b.MoraleDelta, b.MatchesRemaining))
                    .ToList());
        }
    }
}
```

- [ ] **Step 2: Hook the reset into `CreateNewGame`**

In `soydt/src/SoyDT.Engine/GameSession.cs`, find:

```csharp
            var next = countryCodes is { Count: > 0 }
                ? engine.CreateScopedGame(countryCodes)
                : engine.CreateGame();
            _myClubId = null;
            Publish(next)?.Dispose();
```

Replace with:

```csharp
            var next = countryCodes is { Count: > 0 }
                ? engine.CreateScopedGame(countryCodes)
                : engine.CreateGame();
            _myClubId = null;
            ResetDtEvents();
            Publish(next)?.Dispose();
```

- [ ] **Step 3: Hook the trigger into `ProcessDays`**

In the same file, find:

```csharp
    public ProcessResult ProcessDays(uint days)
    {
        lock (_writeGate)
        {
            var previous = CaptureCurrent();
            var working = engine.CloneGame(previous);
            var result = engine.ProcessDays(working, days);
            Publish(working)?.Dispose();
            return result;
        }
    }
```

Replace with:

```csharp
    public ProcessResult ProcessDays(uint days)
    {
        lock (_writeGate)
        {
            var previous = CaptureCurrent();
            var working = engine.CloneGame(previous);
            var result = engine.ProcessDays(working, days);
            AdvanceDtEvents(engine, working);
            Publish(working)?.Dispose();
            return result;
        }
    }
```

- [ ] **Step 4: Hook the trigger into `ProcessDaysWithProgress`**

In the same file, find:

```csharp
            for (uint day = 1; day <= days; day++)
            {
                var result = engine.ProcessDays(working, 1);
                matchesPlayed += result.MatchesPlayed;
                date = result.Date;
                onProgress(new ProcessProgress(date, day, days, matchesPlayed, day == days));
            }
```

Replace with:

```csharp
            for (uint day = 1; day <= days; day++)
            {
                var result = engine.ProcessDays(working, 1);
                AdvanceDtEvents(engine, working);
                matchesPlayed += result.MatchesPlayed;
                date = result.Date;
                onProgress(new ProcessProgress(date, day, days, matchesPlayed, day == days));
            }
```

- [ ] **Step 5: Build to verify it compiles**

Run: `cd soydt && dotnet build SoyDT.sln`
Expected: build succeeds, no errors.

- [ ] **Step 6: Commit**

```bash
git add soydt/src/SoyDT.Engine/GameSession.DtEvents.cs soydt/src/SoyDT.Engine/GameSession.cs
git commit -m "Add DT random events engine, hooked into day-advance"
```

---

### Task 3: `GET /api/dt/events` controller + backend e2e verification

**Files:**
- Create: `soydt/src/SoyDT.Api/Controllers/DtEventsController.cs`

**Interfaces:**
- Consumes: `GameSession.GetDtEvents() -> DtEventsResponseDto` (Task 2).
- Produces: `GET /api/dt/events -> DtEventsResponseDto` (consumed by Task 4/5/6 frontend work).

- [ ] **Step 1: Write the controller**

```csharp
using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// DT random events log + active buffs — see
/// docs/superpowers/specs/2026-08-16-dt-random-events-design.md. Read-only:
/// events fire as a side effect of `POST /api/game/process` /
/// `POST /api/game/process/live`, there's no endpoint to trigger one
/// directly.
[ApiController]
[Route("api/dt/events")]
public sealed class DtEventsController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<DtEventsResponseDto> Get()
    {
        return session.GetDtEvents();
    }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `cd soydt && dotnet build SoyDT.sln`
Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add soydt/src/SoyDT.Api/Controllers/DtEventsController.cs
git commit -m "Add GET /api/dt/events endpoint"
```

- [ ] **Step 4: Verify end-to-end in Docker**

Build and run the full stack (build context is the repo root — see `CLAUDE.md`):

```bash
docker build -f soydt/Dockerfile -t soydt-api .
docker run -p 8080:8080 soydt-api
```

In another terminal, create a small scoped world, pick a club, and process enough days to clear 5+ matchdays — repeat `process` a few times since 5+ matchdays of a domestic league schedule typically span well over 5 real days (rest days, international breaks):

```bash
curl -X POST "http://localhost:8080/api/game/create?countries=UY"
curl -X POST "http://localhost:8080/api/game/my-club?clubId=<pick an id from GET /api/countries/<uy id>/leagues -> a league table>"
curl -X POST "http://localhost:8080/api/game/process?days=30"
curl "http://localhost:8080/api/dt/events"
```

Expected: `activeBuffs`/`log` come back as `[]` if fewer than 5 matchdays completed or the 35% roll never hit yet (this is probabilistic — if `log` is still empty after 30 days, run `process?days=30` again once or twice more before concluding something's wrong). Once `log` has entries, confirm each has a non-empty `storyText`, `matchday >= 5`, and `scope` is `"Team"` or `"Player"` (with `playerId`/`playerName` set only for `"Player"`). Confirm `activeBuffs` entries have `matchesRemaining` of 1 or 2 and shrink/disappear after processing further days.

---

### Task 4: `DtEventsPage.tsx` — log + active buffs view

**Files:**
- Create: `soydt/web/src/features/dt/DtEventsPage.tsx`
- Modify: `soydt/web/src/App.tsx` (add import + route)
- Modify: `soydt/web/src/features/dt/DtLayout.tsx:15-20` (add nav entry)

**Interfaces:**
- Consumes: `GET /api/dt/events -> { log: DtEventLogEntry[]; activeBuffs: DtActiveBuff[] }` (Task 3); `useMyTeamId()` (existing, `soydt/web/src/features/dt/useMyTeamId.ts`); `callApi<T>(path)` (existing, `soydt/web/src/shared/api.ts`).
- Produces: route `/dt/events`; the `DtEventLogEntry`/`DtActiveBuff` TS types defined here are re-declared (not imported — no shared-types module exists in this codebase; every DT page defines its own local response type, see `DtFinancesPage.tsx`) in Task 6 for `DtSquadPage.tsx`'s narrower `{ activeBuffs: DtActiveBuff[] }` fetch.

- [ ] **Step 1: Write the page**

```tsx
import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's random-events log — history of resolved events (investor/streak/
// staff catalog, see GameSession.DtEvents.cs) plus whatever OVR/morale
// buffs are still counting down. Read-only: events fire as a side effect
// of advancing days elsewhere (see ProcessContext.tsx), not from this page.

type DtEventLogEntry = {
  eventId: string
  name: string
  storyText: string
  success: boolean
  matchday: number
  scope: string
  playerId: number | null
  playerName: string | null
}

type DtActiveBuff = {
  scope: string
  playerId: number | null
  playerName: string | null
  ovrDelta: number
  moraleDelta: number
  matchesRemaining: number
}

type DtEventsResponse = { log: DtEventLogEntry[]; activeBuffs: DtActiveBuff[] }

function DtEventsPage() {
  const myTeamId = useMyTeamId()
  const [data, setData] = useState<DtEventsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<DtEventsResponse>('/api/dt/events')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  if (myTeamId === undefined || (myTeamId != null && !data && !error)) {
    return (
      <DtLayout title="Eventos">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Eventos">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  if (error || !data) {
    return (
      <DtLayout title="Eventos">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Eventos">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Efectos activos</h3>
            <span className="fm-panel-count">{data.activeBuffs.length}</span>
          </div>
          {data.activeBuffs.length === 0 && <p style={{ padding: '0 1rem 1rem' }}>Ninguno por ahora.</p>}
          {data.activeBuffs.map((b, i) => (
            <div className="fm-detail-row" key={i}>
              <span className="fm-detail-label">{b.scope === 'Player' ? b.playerName : 'Todo el plantel'}</span>
              <span className="fm-detail-value" style={{ color: b.ovrDelta >= 0 ? '#4ade80' : '#ef4444' }}>
                {b.ovrDelta >= 0 ? '+' : ''}
                {b.ovrDelta} OVR · {b.matchesRemaining} partido{b.matchesRemaining === 1 ? '' : 's'} restante
                {b.matchesRemaining === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Historial</h3>
            <span className="fm-panel-count">{data.log.length}</span>
          </div>
          {data.log.length === 0 && (
            <p style={{ padding: '0 1rem 1rem' }}>Todavía no pasó nada — a partir de la fecha 5 pueden aparecer eventos.</p>
          )}
          {data.log.map((e, i) => (
            <div className="fm-detail-row" key={i}>
              <span className="fm-detail-label">
                Fecha {e.matchday} — {e.name}
              </span>
              <span className="fm-detail-value" style={{ color: e.success ? '#4ade80' : '#ef4444' }}>
                {e.storyText}
              </span>
            </div>
          ))}
        </section>
      </div>
    </DtLayout>
  )
}

export default DtEventsPage
```

- [ ] **Step 2: Add the route**

In `soydt/web/src/App.tsx`, add the import next to the other DT imports:

```tsx
import DtEventsPage from './features/dt/DtEventsPage'
```

And add the route next to the other `/dt/*` routes:

```tsx
        <Route path="/dt/events" element={<DtEventsPage />} />
```

- [ ] **Step 3: Add the nav entry**

In `soydt/web/src/features/dt/DtLayout.tsx`, find:

```tsx
const NAV_ITEMS: NavItem[] = [
  { title: 'Plantel', icon: 'fa-users', url: '/dt/squad' },
  { title: 'Transferencias', icon: 'fa-right-left', url: '/dt/transfers' },
  { title: 'Finanzas', icon: 'fa-coins', url: '/dt/finances' },
  { title: 'Tabla', icon: 'fa-list-ol', url: '/dt/table' },
]
```

Replace with:

```tsx
const NAV_ITEMS: NavItem[] = [
  { title: 'Plantel', icon: 'fa-users', url: '/dt/squad' },
  { title: 'Transferencias', icon: 'fa-right-left', url: '/dt/transfers' },
  { title: 'Finanzas', icon: 'fa-coins', url: '/dt/finances' },
  { title: 'Tabla', icon: 'fa-list-ol', url: '/dt/table' },
  { title: 'Eventos', icon: 'fa-bolt', url: '/dt/events' },
]
```

- [ ] **Step 4: Build to verify types**

Run: `cd soydt/web && npm run build`
Expected: `tsc -b && vite build` succeeds, no type errors.

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/features/dt/DtEventsPage.tsx soydt/web/src/App.tsx soydt/web/src/features/dt/DtLayout.tsx
git commit -m "Add DT events log page"
```

- [ ] **Step 6: Browser verification**

Against the running Docker container from Task 3 (or `npm run dev` pointed at it), navigate to `/dt/events` and confirm: the "Efectos activos" and "Historial" panels render, the empty states show correctly before matchday 5, and — using the same account/game advanced past matchday 5 in Task 3 — real entries show once they've fired.

---

### Task 5: Event-fired modal after processing

**Files:**
- Create: `soydt/web/src/shared/DtEventModal.tsx`
- Modify: `soydt/web/src/shared/ProcessContext.tsx:150-213` (capture new events before reload)
- Modify: `soydt/web/src/App.tsx` (mount the modal)

**Interfaces:**
- Consumes: `GET /api/dt/events -> { log: DtEventLogEntry[] }` (Task 3, reusing the shape from Task 4 — this component defines its own local copy per this codebase's per-file-type convention, same as `DtEventsPage.tsx`).
- Produces: nothing consumed elsewhere — self-contained via `sessionStorage` key `"dtPendingEvents"`.

- [ ] **Step 1: Capture new events in `ProcessContext.tsx` before the reload**

In `soydt/web/src/shared/ProcessContext.tsx`, find:

```tsx
      ;(async () => {
        let succeeded = false
        try {
          const before = await callApi<GameSnapshot>('/api/game/snapshot').catch(() => null)
```

Replace with:

```tsx
      ;(async () => {
        let succeeded = false
        try {
          const before = await callApi<GameSnapshot>('/api/game/snapshot').catch(() => null)
          const eventsBefore = await callApi<{ log: DtEventLogEntry[] }>('/api/dt/events').catch(() => ({ log: [] }))
```

Then find:

```tsx
          succeeded = true
        } catch (e) {
          console.error('process failed:', e)
        }
```

Replace with:

```tsx
          const eventsAfter = await callApi<{ log: DtEventLogEntry[] }>('/api/dt/events').catch(() => ({ log: [] }))
          const newCount = eventsAfter.log.length - eventsBefore.log.length
          if (newCount > 0) {
            sessionStorage.setItem('dtPendingEvents', JSON.stringify(eventsAfter.log.slice(0, newCount)))
          }

          succeeded = true
        } catch (e) {
          console.error('process failed:', e)
        }
```

Add the `DtEventLogEntry` type near the file's other local types (`GameSnapshot`, `ProcessProgress`):

```tsx
type DtEventLogEntry = {
  eventId: string
  name: string
  storyText: string
  success: boolean
  matchday: number
  scope: string
  playerId: number | null
  playerName: string | null
}
```

- [ ] **Step 2: Write the modal component**

```tsx
import { useState } from 'react'

// Shows whatever DT random events fired during the last `process`/
// `process/live` run — captured into sessionStorage by ProcessContext.tsx
// right before its post-success `window.location.reload()`, since every
// page (including this one, mounted once at the App root) re-fetches on
// mount anyway. One event at a time; "Continuar" advances the queue.

type DtEventLogEntry = {
  eventId: string
  name: string
  storyText: string
  success: boolean
  matchday: number
  scope: string
  playerId: number | null
  playerName: string | null
}

function readPending(): DtEventLogEntry[] {
  try {
    const raw = sessionStorage.getItem('dtPendingEvents')
    if (!raw) return []
    return JSON.parse(raw) as DtEventLogEntry[]
  } catch {
    return []
  }
}

function DtEventModal() {
  const [queue, setQueue] = useState<DtEventLogEntry[]>(readPending)

  if (queue.length === 0) return null

  const current = queue[0]

  const dismiss = () => {
    const rest = queue.slice(1)
    setQueue(rest)
    if (rest.length === 0) {
      sessionStorage.removeItem('dtPendingEvents')
    } else {
      sessionStorage.setItem('dtPendingEvents', JSON.stringify(rest))
    }
  }

  return (
    <div
      role="alertdialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 16, 28, 0.72)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          width: 'min(420px, 90vw)',
          background: 'var(--card-bg, #1a2436)',
          color: '#fff',
          borderRadius: 10,
          padding: '1.5rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: current.success ? '#4ade80' : '#ef4444' }}>
          {current.name}
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>{current.storyText}</p>
        <button
          onClick={dismiss}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.25rem',
            borderRadius: 6,
            border: 'none',
            background: '#e8c46a',
            color: '#1a2436',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Continuar ▶
        </button>
      </div>
    </div>
  )
}

export default DtEventModal
```

- [ ] **Step 3: Mount it in `App.tsx`**

In `soydt/web/src/App.tsx`, find:

```tsx
import { ProcessProvider } from './shared/ProcessContext'
import ProcessOverlay from './shared/ProcessOverlay'

function App() {
  return (
    <ProcessProvider>
      <ProcessOverlay />
```

Replace with:

```tsx
import { ProcessProvider } from './shared/ProcessContext'
import ProcessOverlay from './shared/ProcessOverlay'
import DtEventModal from './shared/DtEventModal'

function App() {
  return (
    <ProcessProvider>
      <ProcessOverlay />
      <DtEventModal />
```

- [ ] **Step 4: Build to verify types**

Run: `cd soydt/web && npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/shared/DtEventModal.tsx soydt/web/src/shared/ProcessContext.tsx soydt/web/src/App.tsx
git commit -m "Show a modal for DT events fired during processing"
```

- [ ] **Step 6: Browser verification**

Against the running stack, process days from the admin area (`ProcessControl`, e.g. `/countries` or any non-DT page) until the game crosses a matchday where an event fires (reuse the scoped Uruguay game from Task 3, already past matchday 5). After the reload, confirm the modal appears with the fired event's story text, and that clicking "Continuar" dismisses it and it doesn't reappear on further navigation (i.e. `sessionStorage` was cleared).

---

### Task 6: Fold active buffs into `DtSquadPage.tsx`'s lineup picker

**Files:**
- Modify: `soydt/web/src/features/dt/DtSquadPage.tsx`

**Interfaces:**
- Consumes: `GET /api/dt/events -> { activeBuffs: DtActiveBuff[] }` (Task 3).

- [ ] **Step 1: Fetch active buffs and add the delta helper**

Find:

```tsx
  const [teamInfo, setTeamInfo] = useState<{ name: string; slug: string } | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<{ name: string; slug: string }>(`/api/teams/${myTeamId}`)
      .then(setTeamInfo)
      .catch(() => setTeamInfo(null))
  }, [myTeamId])
```

Replace with:

```tsx
  const [teamInfo, setTeamInfo] = useState<{ name: string; slug: string } | null>(null)
  const [activeBuffs, setActiveBuffs] = useState<DtActiveBuff[]>([])

  useEffect(() => {
    if (myTeamId == null) return
    callApi<{ name: string; slug: string }>(`/api/teams/${myTeamId}`)
      .then(setTeamInfo)
      .catch(() => setTeamInfo(null))
  }, [myTeamId])

  useEffect(() => {
    if (myTeamId == null) return
    callApi<{ activeBuffs: DtActiveBuff[] }>('/api/dt/events')
      .then((r) => setActiveBuffs(r.activeBuffs))
      .catch(() => setActiveBuffs([]))
  }, [myTeamId])
```

Add the type and helper function near the top of the file, after the existing `LineupPlayer` type:

```tsx
type DtActiveBuff = {
  scope: string
  playerId: number | null
  playerName: string | null
  ovrDelta: number
  moraleDelta: number
  matchesRemaining: number
}
```

- [ ] **Step 2: Add a `buffDeltaFor` helper inside the component**

Find:

```tsx
  const assignedIds = useMemo(() => new Set(slots.filter((id): id is number => id != null)), [slots])
  const filledCount = assignedIds.size
```

Replace with:

```tsx
  const assignedIds = useMemo(() => new Set(slots.filter((id): id is number => id != null)), [slots])
  const filledCount = assignedIds.size

  // Sum of every active DT-event buff/debuff touching this player — "Team"
  // scope applies to everyone, "Player" scope only to its own playerId.
  // Stacks with (and is applied before) the existing out-of-position
  // penalty, same as `eligibility`'s penalty already stacks onto the raw
  // OVR everywhere it's used below.
  const buffDeltaFor = (playerId: number) =>
    activeBuffs.filter((b) => b.scope === 'Team' || b.playerId === playerId).reduce((sum, b) => sum + b.ovrDelta, 0)
```

- [ ] **Step 3: Use the buff delta in the candidate sort**

Find:

```tsx
      .filter((c) => c.eligible)
      .sort((a, b) => {
        if (a.isReadyForMatch !== b.isReadyForMatch) return a.isReadyForMatch ? -1 : 1
        return b.currentAbility - a.currentAbility - (b.penalty - a.penalty)
      })
```

Replace with:

```tsx
      .filter((c) => c.eligible)
      .sort((a, b) => {
        if (a.isReadyForMatch !== b.isReadyForMatch) return a.isReadyForMatch ? -1 : 1
        const effA = a.currentAbility + buffDeltaFor(a.playerId) - a.penalty
        const effB = b.currentAbility + buffDeltaFor(b.playerId) - b.penalty
        return effB - effA
      })
```

- [ ] **Step 4: Show the buff badge next to the out-of-position penalty badge**

Find the slot-button rendering:

```tsx
                        {player &&
                          (() => {
                            const penalty = eligibility(player.position, slot).penalty
                            return (
                              <>
                                <span className="fm-slot-name">{player.name}</span>
                                <span className="fm-slot-ovr-row">
                                  <span className={`fm-ability fm-ability-${abilityColor(player.currentAbility)}`}>
                                    {player.currentAbility}
                                  </span>
                                  {penalty > 0 && <span className="fm-ovr-penalty">-{penalty}</span>}
                                </span>
                              </>
                            )
                          })()}
```

Replace with:

```tsx
                        {player &&
                          (() => {
                            const penalty = eligibility(player.position, slot).penalty
                            const buff = buffDeltaFor(player.playerId)
                            return (
                              <>
                                <span className="fm-slot-name">{player.name}</span>
                                <span className="fm-slot-ovr-row">
                                  <span className={`fm-ability fm-ability-${abilityColor(player.currentAbility)}`}>
                                    {player.currentAbility}
                                  </span>
                                  {buff !== 0 && (
                                    <span className={buff > 0 ? 'fm-ovr-buff-positive' : 'fm-ovr-buff-negative'}>
                                      {buff > 0 ? '+' : ''}
                                      {buff}
                                    </span>
                                  )}
                                  {penalty > 0 && <span className="fm-ovr-penalty">-{penalty}</span>}
                                </span>
                              </>
                            )
                          })()}
```

And the dropdown candidate rendering:

```tsx
                                {c.isReadyForMatch ? (
                                  <>
                                    <span className={`fm-ability fm-ability-${abilityColor(c.currentAbility)}`}>{c.currentAbility}</span>
                                    {c.penalty > 0 && <span className="fm-ovr-penalty">-{c.penalty}</span>}
                                  </>
                                ) : (
                                  <span className="fm-unavailable">{unavailableLabel(c)}</span>
                                )}
```

Replace with:

```tsx
                                {c.isReadyForMatch ? (
                                  <>
                                    <span className={`fm-ability fm-ability-${abilityColor(c.currentAbility)}`}>{c.currentAbility}</span>
                                    {buffDeltaFor(c.playerId) !== 0 && (
                                      <span className={buffDeltaFor(c.playerId) > 0 ? 'fm-ovr-buff-positive' : 'fm-ovr-buff-negative'}>
                                        {buffDeltaFor(c.playerId) > 0 ? '+' : ''}
                                        {buffDeltaFor(c.playerId)}
                                      </span>
                                    )}
                                    {c.penalty > 0 && <span className="fm-ovr-penalty">-{c.penalty}</span>}
                                  </>
                                ) : (
                                  <span className="fm-unavailable">{unavailableLabel(c)}</span>
                                )}
```

- [ ] **Step 5: Build to verify types**

Run: `cd soydt/web && npm run build`
Expected: succeeds, no type errors (Task 7 adds the CSS classes referenced here — `npm run build` doesn't check CSS, so this step only validates TS).

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/features/dt/DtSquadPage.tsx
git commit -m "Fold active DT-event buffs into the lineup picker's OVR"
```

---

### Task 7: CSS for buff badges

**Files:**
- Modify: `soydt/web/public/static/css/style.css:14343` (next to `.fm-ovr-penalty`)

**Interfaces:**
- Consumes: nothing.
- Produces: `.fm-ovr-buff-positive`, `.fm-ovr-buff-negative` classes (consumed by Task 6).

- [ ] **Step 1: Add the classes**

Find:

```css
/* Out-of-position penalty — how much playing outside their exact EA
   position costs a player's effective rating in this slot. */
.fm-ovr-penalty {
    color: #ef4444;
    font-weight: 700;
    font-size: 11px;
}
```

Replace with:

```css
/* Out-of-position penalty — how much playing outside their exact EA
   position costs a player's effective rating in this slot. */
.fm-ovr-penalty {
    color: #ef4444;
    font-weight: 700;
    font-size: 11px;
}

/* Active DT-event OVR buff/debuff (see GameSession.DtEvents.cs) — same
   sizing as .fm-ovr-penalty, colored green/red for buff vs debuff. */
.fm-ovr-buff-positive {
    color: #4ade80;
    font-weight: 700;
    font-size: 11px;
}

.fm-ovr-buff-negative {
    color: #ef4444;
    font-weight: 700;
    font-size: 11px;
}
```

- [ ] **Step 2: Commit**

```bash
git add soydt/web/public/static/css/style.css
git commit -m "Add CSS for DT-event OVR buff badges"
```

- [ ] **Step 3: Browser verification**

Against the running stack, open `/dt/squad` for a game with an active buff (from Task 5/6's verification runs) and confirm the badge renders green for a positive buff / red for a negative one, next to (not overlapping) the existing out-of-position penalty badge, both in the formation slot and in the bench dropdown.
