# DT random events

## Purpose

From matchday 5 onward, DT (manager) mode occasionally surfaces a random event tied to the user's own club — a sponsor deal, a player's hot/cold streak, a staff experiment. Each event resolves to success or failure on its own probability and applies a temporary, self-contained buff/debuff (morale, OVR bonus for the lineup picker) that decays over a fixed number of matches. Pure flavor/variety layer on top of the existing DT loop; not a rewrite of match simulation.

## Non-goals

- Does not touch `engine-ffi` / Rust `SimulatorData` — no real engine finances, morale, or CA are read or written. All numbers live in a separate .NET-side ledger, same pattern as the existing `-15 OVR` out-of-position penalty in `DtSquadPage.tsx`, which is also frontend/API-side only and never touches the engine.
- No user decision/branching before an event resolves — v1 is fully automatic (event fires, resolves, shown).
- No persistence across API process restarts — consistent with the rest of `GameSession` (in-memory singleton, no persistence layer exists anywhere in the app today).
- No effect on actual match simulation outcomes (goals, results) — buffs only shift the OVR number shown in the lineup picker, same as the existing out-of-position penalty already does cosmetically.
- Catalog fixed at 3 events for v1; no admin/config UI to add more.

## Architecture

Three layers touched, no `engine-ffi` involvement — this deviates from the usual four-layer pattern in `CLAUDE.md` because nothing here reads or writes `SimulatorData`.

### 1. `SoyDT.Engine/GameSession.DtEvents.cs` — event engine + state

New sibling file on `GameSession`, following the existing per-domain file-split convention (even though there's no matching `engine-ffi`/`NativeMethods` file this time, since state lives entirely in .NET).

State (in-memory, keyed to the single active game like the rest of `GameSession`):
- `List<DtEventLogEntry>` — full history, newest first: event id, display name, story text, success/failure, matchday it fired on.
- `List<DtActiveBuff>` — currently active effects: scope (`Team` or `Player`), `playerId` (null for team scope), `ovrDelta` (signed int), `moraleDelta` (signed int, informational only in v1 — no consumer yet beyond the event log/UI), `matchesRemaining`.
- Last-seen completed-match-count for `MyClubId`, used to detect "a new matchday for my team just completed."

Fixed catalog (3 entries), each with: id, name, story text for success and for failure separately, scope, resolution probability (all 50/50 for v1), effect deltas for success and failure.

1. **Investor / sponsor** (team scope) — success: team-wide `moraleDelta` +, `ovrDelta` + for 2 matches. Failure: team-wide `moraleDelta` −, `ovrDelta` − for 2 matches (bad clause).
2. **Player hot streak** (player scope, target picked randomly from the current squad at resolution time) — success: that player's `ovrDelta` + for 2 matches. Failure: that player's `ovrDelta` − for 2 matches (loss of form).
3. **Staff experiment** (team scope) — success: team-wide small `ovrDelta` + and `moraleDelta` + for 2 matches. Failure: team-wide `moraleDelta` − for 2 matches, no `ovrDelta` change.

Hook: `ProcessDays` and `ProcessDaysWithProgress` both funnel through the same internal advance step already. After each engine day-advance call inside that step, re-read `MyClubId`'s completed-match count via the existing team-schedule export (same one `teams/schedule.html`'s pipe already uses) and compare to the last-seen count.

For each newly-completed match (there can be more than one if several days were processed in one call):
1. Decrement `matchesRemaining` on every active buff by 1; drop any that hit 0.
2. If this match's index (1-based, per team) is ≥ 5: roll 35%. If it fires, pick one catalog entry at random (uniform), roll its own 50/50, apply the corresponding effect deltas as new `DtActiveBuff` entries (2 matches remaining), append a `DtEventLogEntry`.

Use a single `Random` instance stored on `GameSession` (already how the rest of the session is single-instance/non-reentrant; no new concurrency concerns beyond what `GameSession`'s existing lock already covers).

### 2. `SoyDT.Domain/GameDtos.cs` — DTOs

```csharp
public record DtEventLogEntryDto(string EventId, string Name, string StoryText, bool Success, int Matchday);
public record DtActiveBuffDto(string Scope, int? PlayerId, int OvrDelta, int MoraleDelta, int MatchesRemaining);
public record DtEventsResponseDto(IReadOnlyList<DtEventLogEntryDto> Log, IReadOnlyList<DtActiveBuffDto> ActiveBuffs);
```

### 3. `SoyDT.Api/Controllers/DtEventsController.cs`

`GET /api/dt/events` → `DtEventsResponseDto`, thin passthrough to `GameSession`, matching the existing controller pattern. No POST endpoint — events only ever fire as a side effect of `process`/`process/live`.

### 4. Frontend

- `soydt/web/src/features/dt/DtEventsPage.tsx` (new) — full log + currently active buffs, list view. Route added in `App.tsx`, nav entry in `DtLayout.tsx`, matching existing DT pages' structure (`DtFinancesPage.tsx` etc. as the closest analog).
- Event-fired modal: after a `process`/`process/live` call returns, diff `/api/dt/events` log length against what was last seen (stored in component state, no new backend "unseen" flag needed) and show a modal for any new entries, one at a time if several fired. Lives alongside wherever `process` is currently triggered from (`DtLayout.tsx` or the page that owns the process-days control — confirm exact location during implementation).
- `DtSquadPage.tsx` picker: fetch active buffs alongside squad data, sum matching `ovrDelta` (team-wide buffs apply to every player, player-scoped buffs apply only to their `playerId`) into the effective OVR *before* the existing `OUT_OF_POSITION_PENALTY` is applied, so both stack the same way the current out-of-position math already does.

## Error handling

State updates happen per-completed-match inside the existing `ProcessDays`/`ProcessDaysWithProgress` flow, not batched at the end — if `process/live` fails or is interrupted partway (already-handled case per `GameController`'s existing try/catch), whatever matches were processed before the failure have already had their event rolls applied and logged, consistent with how the rest of `GameSession` treats partial progress as valid state (no transaction/rollback concept exists anywhere in the app today).

## Addendum (2026-08-17): daily AI-generated event

A second, independent trigger into the same ledger — see `soydt/prompts/daily_event.md`. Fires once per calendar day of a `process/live` run (not gated by matchday index or a trigger-chance roll), always `Player` scope on a random player from the DT's own club, story text + a `[-2, 2]` morale delta generated by the same OpenAI-compatible LLM endpoint the AI-report features use (`AiConfig`/`AiClient`, `SoyDT.Api/Ai/DailyAiEventGenerator.cs`). Logged via `GameSession.RecordDailyAiEvent` (`eventId="daily_ai"`) into the same `_dtEventLog` — no `DtActiveBuff` is created, so this delta has no OVR/lineup effect, unlike the catalog above. Runs fully outside `_writeGate` (fire-and-forget from `GameController.ProcessLive`'s per-day progress callback) so LLM latency/failure never slows or blocks day-processing; one retry on a bad/unparseable reply, then silently skipped. Only wired into `process/live` — the sync `process` endpoint has no per-day loop to hook into.

## Testing

- `SoyDT.Engine` unit tests: inject/mock the RNG (or test the pure roll/decay functions directly if extracted) to verify the 35% trigger only considers matches with index ≥ 5, and that `matchesRemaining` decay removes buffs at the right time.
- End-to-end via Docker: `POST /api/game/create`, `POST /api/game/process?days=N` across several matchdays, `GET /api/dt/events` to confirm the log populates and buffs expire on schedule.
- Browser verification: trigger the event modal, confirm the log page renders, confirm `DtSquadPage.tsx`'s picker OVR numbers shift while a buff is active and revert after `matchesRemaining` hits 0.
