# Player Attributes, Icons, Color Palette & Nacional Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the engine's existing 37 outfield skill values (+13 goalkeeping) per player through the full stack, render them on `PlayerPage.tsx` as an icon+color-coded attribute grid, and show real photos for the 6 Club Nacional players whose source data carries a Transfermarkt id (every other player keeps the existing placeholder silhouette).

**Architecture:** Three independent slices that ship together: (1) `engine-ffi` → `.NET` DTO grows additively (no FFI signature change, no contract version bump — purely additive per `CONTRACT_VERSION`'s own doc comment), (2) a one-off bash script downloads 6 real photos into a static asset folder with zero backend involvement, (3) a new frontend `AttributeGrid` component + icon/color lookup renders the richer DTO. Each slice is independently buildable/verifiable.

**Tech Stack:** Rust (engine-ffi, serde), C# / ASP.NET Core (SoyDT.Engine, SoyDT.Domain, SoyDT.Api), React + TypeScript (soydt/web), bash (photo download script).

**Spec:** `docs/superpowers/specs/2026-08-16-player-attributes-design.md`

## Global Constraints

- All skill values are `f32` on a 1.0–20.0 scale (verified against `open-football/src/core/src/club/player/ability/skills.rs`) — color bands: `value <= 8` → red, `9 <= value <= 13` → yellow, `value >= 14` → green.
- `engine_get_player`'s JSON envelope and function signature do not change — only its `data` payload grows with new fields. No `CONTRACT_VERSION` bump (additive-only change, per `soydt/engine-ffi/src/contract.rs:10-13`'s own rule).
- `.NET` deserializes engine-ffi JSON via `JsonNamingPolicy.SnakeCaseLower` (`soydt/src/SoyDT.Engine/NativeStringMarshal.cs:12-15`) — every new C# record property name must be the exact PascalCase form of the Rust snake_case field name (e.g. `OffTheBall` ↔ `off_the_ball`).
- ASP.NET Core's default output JSON uses camelCase — the React `PlayerDetail` type's new nested fields use camelCase keys matching the existing convention in `PlayerPage.tsx`.
- Photos: only 6 of Nacional's 90 players have a `transfermarkt.com` id in `open-football-database/data/uy/uruguayan-first-division/nacional/players/*.json` (Bruno Zuculini/115507→id 14018037, Sebastián Coates/102427→id 78016342, Nicolás Lodeiro/72653→id 78018171, Agustín Rogel/456535→id 78078857, Luciano Boggio/577259→id 78094298, Francisco Calvo/188470→id 80013411). All other players — Nacional or not — fall back to the existing `placeholder-face.svg` with no special-casing needed in the app.
- Downloaded photos are always saved as `{engine_id}.jpg` regardless of the source file's real format (browsers render by content-sniffing, not by extension — same approach already used for the team-crest downloads under `static/images/teams/`, several of which were originally SVGs).

---

### Task 1: engine-ffi — expose full skill breakdown on `engine_get_player`

**Files:**
- Modify: `soydt/engine-ffi/src/player.rs`
- Modify: `soydt/engine-ffi/CONTRACT.md:149-162`

**Interfaces:**
- Consumes: `p.skills.technical` (`core::club::player::ability::skills::Technical` — 14 `f32` fields: `corners, crossing, dribbling, finishing, first_touch, free_kicks, heading, long_shots, long_throws, marking, passing, penalty_taking, tackling, technique`), `p.skills.mental` (`Mental` — 14 fields: `aggression, anticipation, bravery, composure, concentration, decisions, determination, flair, leadership, off_the_ball, positioning, teamwork, vision, work_rate`), `p.skills.physical` (`Physical` — 9 fields: `acceleration, agility, balance, jumping, natural_fitness, pace, stamina, strength, match_readiness`), `p.skills.goalkeeping` (`Goalkeeping` — 13 fields: `aerial_reach, command_of_area, communication, eccentricity, first_touch, handling, kicking, one_on_ones, passing, punching, reflexes, rushing_out, throwing`), `p.positions.is_goalkeeper() -> bool` (already used identically in `soydt/engine-ffi/src/team_tactics.rs:52-57`).
- Produces: `PlayerDetailJson` gains `technical: TechnicalJson`, `mental: MentalJson`, `physical: PhysicalJson`, `goalkeeping: Option<GoalkeepingJson>` — consumed by Task 2.

- [ ] **Step 1: Add the four new nested JSON structs**

In `soydt/engine-ffi/src/player.rs`, after the existing `PlayerDetailJson` struct (currently lines 12-34), add:

```rust
#[derive(Serialize)]
struct TechnicalJson {
    corners: f32,
    crossing: f32,
    dribbling: f32,
    finishing: f32,
    first_touch: f32,
    free_kicks: f32,
    heading: f32,
    long_shots: f32,
    long_throws: f32,
    marking: f32,
    passing: f32,
    penalty_taking: f32,
    tackling: f32,
    technique: f32,
}

#[derive(Serialize)]
struct MentalJson {
    aggression: f32,
    anticipation: f32,
    bravery: f32,
    composure: f32,
    concentration: f32,
    decisions: f32,
    determination: f32,
    flair: f32,
    leadership: f32,
    off_the_ball: f32,
    positioning: f32,
    teamwork: f32,
    vision: f32,
    work_rate: f32,
}

#[derive(Serialize)]
struct PhysicalJson {
    acceleration: f32,
    agility: f32,
    balance: f32,
    jumping: f32,
    natural_fitness: f32,
    pace: f32,
    stamina: f32,
    strength: f32,
    match_readiness: f32,
}

#[derive(Serialize)]
struct GoalkeepingJson {
    aerial_reach: f32,
    command_of_area: f32,
    communication: f32,
    eccentricity: f32,
    first_touch: f32,
    handling: f32,
    kicking: f32,
    one_on_ones: f32,
    passing: f32,
    punching: f32,
    reflexes: f32,
    rushing_out: f32,
    throwing: f32,
}
```

- [ ] **Step 2: Add the four new fields to `PlayerDetailJson`**

In the same file, change the struct (currently lines 12-34) by inserting four fields right after `physical_avg: f32,` and before `team_id: Option<u32>,`:

```rust
#[derive(Serialize)]
struct PlayerDetailJson {
    id: u32,
    first_name: String,
    last_name: String,
    age: u8,
    position: String,
    country_id: u32,
    country_code: String,
    country_name: String,
    current_ability: u8,
    value: u32,
    current_reputation: i16,
    height: u8,
    weight: u8,
    is_injured: bool,
    is_banned: bool,
    technical_avg: f32,
    mental_avg: f32,
    physical_avg: f32,
    technical: TechnicalJson,
    mental: MentalJson,
    physical: PhysicalJson,
    goalkeeping: Option<GoalkeepingJson>,
    team_id: Option<u32>,
    team_name: Option<String>,
}
```

- [ ] **Step 3: Populate the new fields in `engine_get_player`**

In the same file, inside the `Ok(PlayerDetailJson { ... })` construction (currently lines 64-85), insert these four fields right after `physical_avg: p.skills.physical.average(),` and before `team_id: Some(team.id),`:

```rust
                                technical: TechnicalJson {
                                    corners: p.skills.technical.corners,
                                    crossing: p.skills.technical.crossing,
                                    dribbling: p.skills.technical.dribbling,
                                    finishing: p.skills.technical.finishing,
                                    first_touch: p.skills.technical.first_touch,
                                    free_kicks: p.skills.technical.free_kicks,
                                    heading: p.skills.technical.heading,
                                    long_shots: p.skills.technical.long_shots,
                                    long_throws: p.skills.technical.long_throws,
                                    marking: p.skills.technical.marking,
                                    passing: p.skills.technical.passing,
                                    penalty_taking: p.skills.technical.penalty_taking,
                                    tackling: p.skills.technical.tackling,
                                    technique: p.skills.technical.technique,
                                },
                                mental: MentalJson {
                                    aggression: p.skills.mental.aggression,
                                    anticipation: p.skills.mental.anticipation,
                                    bravery: p.skills.mental.bravery,
                                    composure: p.skills.mental.composure,
                                    concentration: p.skills.mental.concentration,
                                    decisions: p.skills.mental.decisions,
                                    determination: p.skills.mental.determination,
                                    flair: p.skills.mental.flair,
                                    leadership: p.skills.mental.leadership,
                                    off_the_ball: p.skills.mental.off_the_ball,
                                    positioning: p.skills.mental.positioning,
                                    teamwork: p.skills.mental.teamwork,
                                    vision: p.skills.mental.vision,
                                    work_rate: p.skills.mental.work_rate,
                                },
                                physical: PhysicalJson {
                                    acceleration: p.skills.physical.acceleration,
                                    agility: p.skills.physical.agility,
                                    balance: p.skills.physical.balance,
                                    jumping: p.skills.physical.jumping,
                                    natural_fitness: p.skills.physical.natural_fitness,
                                    pace: p.skills.physical.pace,
                                    stamina: p.skills.physical.stamina,
                                    strength: p.skills.physical.strength,
                                    match_readiness: p.skills.physical.match_readiness,
                                },
                                goalkeeping: if p.positions.is_goalkeeper() {
                                    Some(GoalkeepingJson {
                                        aerial_reach: p.skills.goalkeeping.aerial_reach,
                                        command_of_area: p.skills.goalkeeping.command_of_area,
                                        communication: p.skills.goalkeeping.communication,
                                        eccentricity: p.skills.goalkeeping.eccentricity,
                                        first_touch: p.skills.goalkeeping.first_touch,
                                        handling: p.skills.goalkeeping.handling,
                                        kicking: p.skills.goalkeeping.kicking,
                                        one_on_ones: p.skills.goalkeeping.one_on_ones,
                                        passing: p.skills.goalkeeping.passing,
                                        punching: p.skills.goalkeeping.punching,
                                        reflexes: p.skills.goalkeeping.reflexes,
                                        rushing_out: p.skills.goalkeeping.rushing_out,
                                        throwing: p.skills.goalkeeping.throwing,
                                    })
                                } else {
                                    None
                                },
```

- [ ] **Step 4: Build and verify it compiles**

Run (from repo root):
```bash
docker run --rm -v $(pwd):/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release
```
Expected: build succeeds with no errors (warnings about unused code are fine — this is a library crate).

- [ ] **Step 5: Update `CONTRACT.md`'s documented example**

In `soydt/engine-ffi/CONTRACT.md`, replace the `engine_get_player` JSON example (currently lines 153-162) with:

```json
{
  "id": 123, "first_name": "...", "last_name": "...", "age": 27, "position": "GK",
  "country_id": 1649, "country_code": "ar", "country_name": "Argentina",
  "current_ability": 140, "value": 5000000, "current_reputation": 4000,
  "height": 183, "weight": 78, "is_injured": false, "is_banned": false,
  "technical_avg": 12.3, "mental_avg": 13.1, "physical_avg": 14.0,
  "technical": { "corners": 8.0, "crossing": 7.5, "dribbling": 11.0, "finishing": 6.0, "first_touch": 12.0, "free_kicks": 5.0, "heading": 9.0, "long_shots": 6.5, "long_throws": 4.0, "marking": 8.0, "passing": 13.0, "penalty_taking": 7.0, "tackling": 8.5, "technique": 10.0 },
  "mental": { "aggression": 10.0, "anticipation": 12.0, "bravery": 13.0, "composure": 11.0, "concentration": 12.0, "decisions": 11.5, "determination": 14.0, "flair": 6.0, "leadership": 9.0, "off_the_ball": 8.0, "positioning": 15.0, "teamwork": 12.0, "vision": 10.0, "work_rate": 13.0 },
  "physical": { "acceleration": 9.0, "agility": 10.0, "balance": 11.0, "jumping": 14.0, "natural_fitness": 15.0, "pace": 9.5, "stamina": 13.0, "strength": 12.0, "match_readiness": 20.0 },
  "goalkeeping": { "aerial_reach": 15.0, "command_of_area": 14.0, "communication": 13.0, "eccentricity": 6.0, "first_touch": 10.0, "handling": 15.0, "kicking": 11.0, "one_on_ones": 14.0, "passing": 10.0, "punching": 12.0, "reflexes": 16.0, "rushing_out": 10.0, "throwing": 12.0 },
  "team_id": 82, "team_name": "Boca Juniors"
}
```

Directly above the example, add a short note: "`goalkeeping` is `null` for outfield players — only populated when the player's primary position is `Goalkeeper`."

- [ ] **Step 6: Commit**

```bash
git add soydt/engine-ffi/src/player.rs soydt/engine-ffi/CONTRACT.md
git commit -m "$(cat <<'EOF'
Expose full per-attribute skill breakdown from engine_get_player

Adds technical/mental/physical (always) and goalkeeping (GK only)
nested objects alongside the existing averages, so the frontend can
render individual attributes instead of just the three averages.
EOF
)"
```

---

### Task 2: .NET — mirror the richer `PlayerDetail` DTO

**Files:**
- Modify: `soydt/src/SoyDT.Domain/GameDtos.cs:157-178`

**Interfaces:**
- Consumes: JSON shape produced by Task 1 (`technical`/`mental`/`physical`/`goalkeeping` objects, deserialized via `JsonNamingPolicy.SnakeCaseLower`).
- Produces: `PlayerDetail.Technical: TechnicalAttributes`, `.Mental: MentalAttributes`, `.Physical: PhysicalAttributes`, `.Goalkeeping: GoalkeepingAttributes?` — consumed by Task 5 (the frontend receives these serialized as camelCase JSON by ASP.NET Core's default output policy, with no controller changes needed since `PlayersController.Get` already does a plain `Ok(session.GetPlayer(playerId))` passthrough).

- [ ] **Step 1: Add the four new nested records**

In `soydt/src/SoyDT.Domain/GameDtos.cs`, directly above the `PlayerDetail` record (currently starting at line 158), add:

```csharp
public sealed record TechnicalAttributes(
    float Corners,
    float Crossing,
    float Dribbling,
    float Finishing,
    float FirstTouch,
    float FreeKicks,
    float Heading,
    float LongShots,
    float LongThrows,
    float Marking,
    float Passing,
    float PenaltyTaking,
    float Tackling,
    float Technique);

public sealed record MentalAttributes(
    float Aggression,
    float Anticipation,
    float Bravery,
    float Composure,
    float Concentration,
    float Decisions,
    float Determination,
    float Flair,
    float Leadership,
    float OffTheBall,
    float Positioning,
    float Teamwork,
    float Vision,
    float WorkRate);

public sealed record PhysicalAttributes(
    float Acceleration,
    float Agility,
    float Balance,
    float Jumping,
    float NaturalFitness,
    float Pace,
    float Stamina,
    float Strength,
    float MatchReadiness);

public sealed record GoalkeepingAttributes(
    float AerialReach,
    float CommandOfArea,
    float Communication,
    float Eccentricity,
    float FirstTouch,
    float Handling,
    float Kicking,
    float OneOnOnes,
    float Passing,
    float Punching,
    float Reflexes,
    float RushingOut,
    float Throwing);
```

- [ ] **Step 2: Add the four new fields to `PlayerDetail`**

In the same file, change the `PlayerDetail` record (currently lines 158-178) by inserting four parameters right after `PhysicalAvg` and before `TeamId`:

```csharp
/// Mirrors `engine_get_player`'s `data` payload.
public sealed record PlayerDetail(
    uint Id,
    string FirstName,
    string LastName,
    byte Age,
    string Position,
    uint CountryId,
    string CountryCode,
    string CountryName,
    byte CurrentAbility,
    uint Value,
    short CurrentReputation,
    byte Height,
    byte Weight,
    bool IsInjured,
    bool IsBanned,
    float TechnicalAvg,
    float MentalAvg,
    float PhysicalAvg,
    TechnicalAttributes Technical,
    MentalAttributes Mental,
    PhysicalAttributes Physical,
    GoalkeepingAttributes? Goalkeeping,
    uint? TeamId,
    string? TeamName);
```

- [ ] **Step 3: Build and verify it compiles**

Run:
```bash
cd soydt && dotnet build SoyDT.sln
```
Expected: build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add soydt/src/SoyDT.Domain/GameDtos.cs
git commit -m "$(cat <<'EOF'
Mirror engine-ffi's richer PlayerDetail shape in the .NET DTO

Adds TechnicalAttributes/MentalAttributes/PhysicalAttributes/
GoalkeepingAttributes records matching the new engine_get_player
fields. No controller or P/Invoke changes needed — engine_get_player's
binding already deserializes the whole envelope generically.
EOF
)"
```

---

### Task 3: React — attribute color function, icon set, and `AttributeGrid` component

**Files:**
- Create: `soydt/web/src/shared/attributeColor.ts`
- Create: `soydt/web/src/shared/attributeIcons.tsx`
- Create: `soydt/web/src/features/players/AttributeGrid.tsx`
- Modify: `soydt/web/public/static/css/style.css`

**Interfaces:**
- Produces: `attributeColor(value: number): 'red' | 'yellow' | 'green'` (from `attributeColor.ts`), `ATTRIBUTE_ICONS: Record<string, JSX.Element>` (from `attributeIcons.tsx`), `<AttributeGrid title={string} entries={{key: string; label: string; value: number}[]} />` (from `AttributeGrid.tsx`) — all consumed by Task 5's `PlayerPage.tsx`.

- [ ] **Step 1: Write `attributeColor.ts`**

Create `soydt/web/src/shared/attributeColor.ts`:

```typescript
// Engine skill values run 1.0–20.0 (see open-football's PlayerSkills).
// Bands mirror the classic FM-style read: weak / average / strong.
export type AttributeColor = 'red' | 'yellow' | 'green'

export function attributeColor(value: number): AttributeColor {
  if (value <= 8) return 'red'
  if (value <= 13) return 'yellow'
  return 'green'
}
```

- [ ] **Step 2: Write `attributeIcons.tsx`**

Create `soydt/web/src/shared/attributeIcons.tsx` — one small inline-SVG line icon per attribute key, keyed by the same camelCase name the API returns (shared keys like `firstTouch`/`passing` are reused between the `technical` and `goalkeeping` categories since they're the same concept):

```tsx
import type { ReactNode } from 'react'

type IconProps = { className?: string }

const base = (children: ReactNode, props: IconProps = {}) => (
  <svg
    className={props.className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

export const ATTRIBUTE_ICONS: Record<string, (props?: IconProps) => JSX.Element> = {
  // Technical
  corners: (p) => base(<><path d="M4 3v18" /><path d="M4 3h8l-3 4 3 4H4" /></>, p),
  crossing: (p) => base(<><path d="M4 4l16 16" /><path d="M20 4L4 20" /></>, p),
  dribbling: (p) => base(<><path d="M3 18c3-6 6 6 9 0s6-6 9 0" /><circle cx="12" cy="8" r="2" /></>, p),
  finishing: (p) => base(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>, p),
  firstTouch: (p) => base(<><circle cx="9" cy="9" r="2" /><path d="M11 11l8 8" /></>, p),
  freeKicks: (p) => base(<><path d="M3 20c4-10 14-10 18-16" strokeDasharray="3 3" /><circle cx="21" cy="4" r="1.5" /></>, p),
  heading: (p) => base(<><circle cx="12" cy="7" r="4" /><path d="M12 11v6" /><path d="M17 9l4-2" /></>, p),
  longShots: (p) => base(<><path d="M3 20L20 4" /><path d="M13 4h7v7" /></>, p),
  longThrows: (p) => base(<><path d="M4 20c4-8 12-8 16-16" /><circle cx="20" cy="4" r="1.5" /></>, p),
  marking: (p) => base(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12h8" /></>, p),
  passing: (p) => base(<><path d="M4 12h13" /><path d="M13 6l6 6-6 6" /></>, p),
  penaltyTaking: (p) => base(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></>, p),
  tackling: (p) => base(<><path d="M4 18l7-10" /><path d="M11 8l9 4" /></>, p),
  technique: (p) => base(<path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />, p),

  // Mental
  aggression: (p) => base(<path d="M8 12a4 4 0 118 0v3a4 4 0 01-8 0zM8 12l-3-2m11 2l3-2" />, p),
  anticipation: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>, p),
  bravery: (p) => base(<><path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" /><path d="M9 12l2 2 4-4" /></>, p),
  composure: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M8 13c1.5 2 6.5 2 8 0" /></>, p),
  concentration: (p) => base(<><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="0.7" fill="currentColor" /></>, p),
  decisions: (p) => base(<><path d="M12 3v6" /><path d="M12 9l-6 12h12z" /></>, p),
  determination: (p) => base(<path d="M12 21c-4-3-6-6-6-9a6 6 0 0112 0c0 3-2 6-6 9z" />, p),
  flair: (p) => base(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="3" /></>, p),
  leadership: (p) => base(<><path d="M4 19h16" /><path d="M6 19V9l3 3 3-6 3 6 3-3v10" /></>, p),
  offTheBall: (p) => base(<><circle cx="6" cy="6" r="2" strokeDasharray="2 2" /><path d="M6 8v6l4 2M10 14l6-2" /></>, p),
  positioning: (p) => base(<><path d="M12 21s7-6.5 7-12a7 7 0 00-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></>, p),
  teamwork: (p) => base(<><circle cx="8" cy="10" r="3" /><circle cx="16" cy="10" r="3" /><path d="M4 20c0-3 2-5 4-5s4 2 4 5M12 20c0-3 2-5 4-5s4 2 4 5" /></>, p),
  vision: (p) => base(<><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.5" /></>, p),
  workRate: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 3" strokeWidth="2" /></>, p),

  // Physical
  acceleration: (p) => base(<><path d="M3 17l5-5 4 4 8-8" /><path d="M14 8h6v6" /></>, p),
  agility: (p) => base(<path d="M5 19l4-6-3-3 5-2 2 4 6-6M15 6l3 1" />, p),
  balance: (p) => base(<><path d="M12 3v6" /><path d="M4 15h16" /><path d="M4 15l3-6h10l3 6" /></>, p),
  jumping: (p) => base(<><path d="M12 3v6" /><path d="M9 7l3 2 3-2" /><path d="M6 21c2-6 4-8 6-8s4 2 6 8" /></>, p),
  naturalFitness: (p) => base(<path d="M12 20s-7-4.4-7-10a4 4 0 018-1 4 4 0 018 1c0 5.6-7 10-7 10z" />, p),
  pace: (p) => base(<path d="M13 2L4 14h6l-1 8 9-12h-6z" />, p),
  stamina: (p) => base(<><rect x="3" y="8" width="16" height="8" rx="1" /><path d="M21 10v4" /><path d="M6 10v4M9 10v4M12 10v4" /></>, p),
  strength: (p) => base(<><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="12" r="2.5" /><path d="M7.5 12h9" strokeWidth="3" /></>, p),
  matchReadiness: (p) => base(<><circle cx="12" cy="12" r="8" /><path d="M9 12l2 2 4-4" /></>, p),

  // Goalkeeping-only
  aerialReach: (p) => base(<><path d="M12 20V8" /><path d="M8 12l4-4 4 4" /></>, p),
  commandOfArea: (p) => base(<><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M12 8v8M8 12h8" strokeDasharray="2 2" /></>, p),
  communication: (p) => base(<><path d="M4 5h13v9H9l-5 4z" /></>, p),
  eccentricity: (p) => base(<path d="M9 9a3 3 0 116 0c0 2-3 2-3 5M12 18v.01" />, p),
  handling: (p) => base(<><circle cx="12" cy="9" r="3" /><path d="M6 20c0-3 2.5-5 6-5s6 2 6 5" /></>, p),
  kicking: (p) => base(<><path d="M4 18l6-3 3-7 6 4-4 3" /><circle cx="18" cy="7" r="1.5" /></>, p),
  oneOnOnes: (p) => base(<><circle cx="7" cy="12" r="3" /><circle cx="17" cy="12" r="3" /><path d="M10 12h4" /></>, p),
  punching: (p) => base(<><path d="M12 21v-7" /><path d="M8 10l4-4 4 4" /><rect x="9" y="4" width="6" height="4" rx="1" /></>, p),
  reflexes: (p) => base(<><path d="M4 12h4l2-5 4 10 2-5h4" /></>, p),
  rushingOut: (p) => base(<><path d="M4 12h13" /><path d="M11 6l6 6-6 6" strokeWidth="2" /></>, p),
  throwing: (p) => base(<><path d="M4 20c4-8 12-8 16-16" strokeDasharray="4 2" /><circle cx="20" cy="4" r="1.5" /></>, p),
}
```

- [ ] **Step 3: Write `AttributeGrid.tsx`**

Create `soydt/web/src/features/players/AttributeGrid.tsx`:

```tsx
import { attributeColor } from '../../shared/attributeColor'
import { ATTRIBUTE_ICONS } from '../../shared/attributeIcons'

export type AttributeEntry = { key: string; label: string; value: number }

function AttributeGrid({ title, entries }: { title: string; entries: AttributeEntry[] }) {
  return (
    <div className="fm-attr-group">
      <h4>{title}</h4>
      <div className="fm-attr-grid">
        {entries.map((entry) => {
          const Icon = ATTRIBUTE_ICONS[entry.key]
          const color = attributeColor(entry.value)
          return (
            <div key={entry.key} className={`fm-attr-tile fm-attr-${color}`}>
              <span className="fm-attr-icon">{Icon ? Icon() : null}</span>
              <span className="fm-attr-label">{entry.label}</span>
              <span className="fm-attr-value">{Math.round(entry.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AttributeGrid
```

- [ ] **Step 4: Add CSS for the grid and the three color states**

In `soydt/web/public/static/css/style.css`, append at the end of the file:

```css
/* Player attribute grid — icon + label + color-coded value, one tile per
   engine skill. Colors read weak/average/strong on the 1-20 scale. */
.fm-attr-group {
    margin-top: 18px;
}

.fm-attr-group h4 {
    margin: 0 0 8px;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.6px;
    color: #6c8290;
}

.fm-attr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
}

.fm-attr-tile {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 4px;
    border-left: 3px solid transparent;
    background: #f5f7f8;
}

.fm-attr-icon {
    flex-shrink: 0;
    display: inline-flex;
}

.fm-attr-label {
    flex: 1;
    font-size: 13px;
}

.fm-attr-value {
    font-weight: 600;
    font-size: 13px;
}

.fm-attr-red {
    border-left-color: #e74c3c;
}
.fm-attr-red .fm-attr-value {
    color: #e74c3c;
}

.fm-attr-yellow {
    border-left-color: #f1c40f;
}
.fm-attr-yellow .fm-attr-value {
    color: #b8960c;
}

.fm-attr-green {
    border-left-color: #2ecc71;
}
.fm-attr-green .fm-attr-value {
    color: #219150;
}
```

- [ ] **Step 5: Verify the frontend still builds**

Run:
```bash
cd soydt/web && npm run build
```
Expected: `tsc -b && vite build` succeeds with no type errors (this catches any icon-map/typo issues before wiring it into `PlayerPage.tsx` in Task 5).

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/shared/attributeColor.ts soydt/web/src/shared/attributeIcons.tsx soydt/web/src/features/players/AttributeGrid.tsx soydt/web/public/static/css/style.css
git commit -m "$(cat <<'EOF'
Add attribute color function, per-attribute icon set, and AttributeGrid

Pure frontend building blocks: attributeColor() bands the engine's
1-20 skill scale into red/yellow/green, ATTRIBUTE_ICONS gives each of
the 37 outfield + 13 goalkeeping attributes a small inline-SVG icon,
and AttributeGrid renders one category (technical/mental/physical/
goalkeeping) as a colored tile grid. Not yet wired into PlayerPage.
EOF
)"
```

---

### Task 4: Photo download script — 6 real Nacional player photos

**Files:**
- Create: `soydt/scripts/download-nacional-photos.sh`

**Interfaces:**
- Produces: `soydt/web/public/static/images/players/{engine_id}.jpg` for the 6 Nacional players with a Transfermarkt id — consumed at runtime by Task 5's `PlayerPage.tsx` `<img>` fallback logic (no code-level interface; it's a static asset path convention: `/static/images/players/{id}.jpg`).

- [ ] **Step 1: Write the download script**

Create `soydt/scripts/download-nacional-photos.sh`:

```bash
#!/usr/bin/env bash
# One-off: downloads real player photos for Club Nacional's squad from
# Transfermarkt, for the subset of players whose source data (in
# open-football-database) carries a transfermarkt.com id. Every other
# player (Nacional or not) has no file here and PlayerPage.tsx falls
# back to the existing placeholder silhouette — this is expected, not
# an error, since most lower-profile squad entries lack a Transfermarkt
# id in this dataset.
#
# Usage: run from repo root: soydt/scripts/download-nacional-photos.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLAYERS_DIR="$REPO_ROOT/open-football-database/data/uy/uruguayan-first-division/nacional/players"
OUT_DIR="$REPO_ROOT/soydt/web/public/static/images/players"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

mkdir -p "$OUT_DIR"

for f in "$PLAYERS_DIR"/*.json; do
  tm_id=$(grep -o '"transfermarkt.com": *"[0-9]*"' "$f" | grep -o '[0-9]*' || true)
  if [ -z "$tm_id" ]; then
    continue
  fi
  engine_id=$(grep -o '"id": *[0-9]*' "$f" | head -1 | grep -o '[0-9]*')

  html=$(curl -sf -A "$UA" -L "https://www.transfermarkt.com/x/profil/spieler/${tm_id}") || {
    echo "SKIP $engine_id (tm=$tm_id): profile page fetch failed"
    continue
  }
  photo_url=$(echo "$html" | grep -o 'og:image" content="[^"]*"' | head -1 | sed 's/og:image" content="//;s/"$//')
  if [ -z "$photo_url" ]; then
    echo "SKIP $engine_id (tm=$tm_id): no og:image found"
    continue
  fi

  if curl -sfL -A "$UA" -o "$OUT_DIR/${engine_id}.jpg" "$photo_url"; then
    echo "OK   $engine_id (tm=$tm_id) -> ${engine_id}.jpg"
  else
    echo "SKIP $engine_id (tm=$tm_id): image download failed"
  fi
  sleep 1
done
```

- [ ] **Step 2: Make it executable and run it**

```bash
chmod +x soydt/scripts/download-nacional-photos.sh
soydt/scripts/download-nacional-photos.sh
```
Expected output: 6 `OK` lines, one per player (engine ids `14018037`, `78016342`, `78018171`, `78078857`, `78094298`, `80013411`).

- [ ] **Step 3: Verify the files are real images, not error pages**

```bash
file soydt/web/public/static/images/players/*.jpg
```
Expected: each line reports `JPEG image data` or `PNG image data` (mixed formats are fine — see Global Constraints; the `.jpg` extension is cosmetic), not `HTML document` or `ASCII text`.

- [ ] **Step 4: Commit**

```bash
git add soydt/scripts/download-nacional-photos.sh soydt/web/public/static/images/players/
git commit -m "$(cat <<'EOF'
Add Nacional player photo download script + downloaded photos

One-off script (same pattern as the earlier team-crest download)
pulling real photos from Transfermarkt for the 6 Nacional players
whose open-football-database record carries a transfermarkt.com id.
Every other player keeps the existing placeholder silhouette.
EOF
)"
```

---

### Task 5: Wire attributes + photo into `PlayerPage.tsx`

**Files:**
- Modify: `soydt/web/src/features/players/PlayerPage.tsx`

**Interfaces:**
- Consumes: `AttributeGrid` + `AttributeEntry` from Task 3 (`soydt/web/src/features/players/AttributeGrid.tsx`), the richer `/api/players/{id}` JSON payload from Task 2.
- Produces: updated `PlayerPage` — no new exports, this is the final consumer in the chain.

- [ ] **Step 1: Extend the local `PlayerDetail` type**

In `soydt/web/src/features/players/PlayerPage.tsx`, replace the `PlayerDetail` type (currently lines 12-32) with:

```tsx
type TechnicalAttributes = {
  corners: number
  crossing: number
  dribbling: number
  finishing: number
  firstTouch: number
  freeKicks: number
  heading: number
  longShots: number
  longThrows: number
  marking: number
  passing: number
  penaltyTaking: number
  tackling: number
  technique: number
}

type MentalAttributes = {
  aggression: number
  anticipation: number
  bravery: number
  composure: number
  concentration: number
  decisions: number
  determination: number
  flair: number
  leadership: number
  offTheBall: number
  positioning: number
  teamwork: number
  vision: number
  workRate: number
}

type PhysicalAttributes = {
  acceleration: number
  agility: number
  balance: number
  jumping: number
  naturalFitness: number
  pace: number
  stamina: number
  strength: number
  matchReadiness: number
}

type GoalkeepingAttributes = {
  aerialReach: number
  commandOfArea: number
  communication: number
  eccentricity: number
  firstTouch: number
  handling: number
  kicking: number
  oneOnOnes: number
  passing: number
  punching: number
  reflexes: number
  rushingOut: number
  throwing: number
}

type PlayerDetail = {
  id: number
  firstName: string
  lastName: string
  age: number
  position: string
  countryCode: string
  countryName: string
  currentAbility: number
  value: number
  currentReputation: number
  height: number
  weight: number
  isInjured: boolean
  isBanned: boolean
  technicalAvg: number
  mentalAvg: number
  physicalAvg: number
  technical: TechnicalAttributes
  mental: MentalAttributes
  physical: PhysicalAttributes
  goalkeeping: GoalkeepingAttributes | null
  teamId: number | null
  teamName: string | null
}
```

- [ ] **Step 2: Add the attribute label tables and import `AttributeGrid`**

In the same file, add this import near the top (after the existing `Layout` import):

```tsx
import AttributeGrid, { type AttributeEntry } from './AttributeGrid'
```

Then, after the type definitions (before `function PlayerPage()`), add:

```tsx
const TECHNICAL_LABELS: [keyof TechnicalAttributes, string][] = [
  ['corners', 'Corners'],
  ['crossing', 'Crossing'],
  ['dribbling', 'Dribbling'],
  ['finishing', 'Finishing'],
  ['firstTouch', 'First Touch'],
  ['freeKicks', 'Free Kicks'],
  ['heading', 'Heading'],
  ['longShots', 'Long Shots'],
  ['longThrows', 'Long Throws'],
  ['marking', 'Marking'],
  ['passing', 'Passing'],
  ['penaltyTaking', 'Penalty Taking'],
  ['tackling', 'Tackling'],
  ['technique', 'Technique'],
]

const MENTAL_LABELS: [keyof MentalAttributes, string][] = [
  ['aggression', 'Aggression'],
  ['anticipation', 'Anticipation'],
  ['bravery', 'Bravery'],
  ['composure', 'Composure'],
  ['concentration', 'Concentration'],
  ['decisions', 'Decisions'],
  ['determination', 'Determination'],
  ['flair', 'Flair'],
  ['leadership', 'Leadership'],
  ['offTheBall', 'Off the Ball'],
  ['positioning', 'Positioning'],
  ['teamwork', 'Teamwork'],
  ['vision', 'Vision'],
  ['workRate', 'Work Rate'],
]

const PHYSICAL_LABELS: [keyof PhysicalAttributes, string][] = [
  ['acceleration', 'Acceleration'],
  ['agility', 'Agility'],
  ['balance', 'Balance'],
  ['jumping', 'Jumping'],
  ['naturalFitness', 'Natural Fitness'],
  ['pace', 'Pace'],
  ['stamina', 'Stamina'],
  ['strength', 'Strength'],
  ['matchReadiness', 'Match Readiness'],
]

const GOALKEEPING_LABELS: [keyof GoalkeepingAttributes, string][] = [
  ['aerialReach', 'Aerial Reach'],
  ['commandOfArea', 'Command of Area'],
  ['communication', 'Communication'],
  ['eccentricity', 'Eccentricity'],
  ['firstTouch', 'First Touch'],
  ['handling', 'Handling'],
  ['kicking', 'Kicking'],
  ['oneOnOnes', 'One on Ones'],
  ['passing', 'Passing'],
  ['punching', 'Punching'],
  ['reflexes', 'Reflexes'],
  ['rushingOut', 'Rushing Out'],
  ['throwing', 'Throwing'],
]

function toEntries<T extends Record<string, number>>(labels: [keyof T, string][], values: T): AttributeEntry[] {
  return labels.map(([key, label]) => ({ key: key as string, label, value: values[key] }))
}
```

- [ ] **Step 3: Replace the placeholder `<img>` with a real-photo-with-fallback**

In the same file, inside the component, replace:

```tsx
            <img
              src="/static/images/player/placeholder-face.svg"
              alt=""
              width={100}
              height={125}
              style={{ borderRadius: '4px', flexShrink: 0 }}
            />
```

with:

```tsx
            <img
              src={`/static/images/players/${player.id}.jpg`}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/static/images/player/placeholder-face.svg'
              }}
              alt=""
              width={100}
              height={125}
              style={{ borderRadius: '4px', flexShrink: 0, objectFit: 'cover' }}
            />
```

- [ ] **Step 4: Add the "Atributos" section**

In the same file, right after the closing `</section>` of the existing Overview `<section className="fm-panel">` block and before the outer `</div>` (the `fm-page` wrapper), add:

```tsx
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Atributos</h3>
          </div>
          <div style={{ padding: '14px' }}>
            <AttributeGrid title="Technical" entries={toEntries(TECHNICAL_LABELS, player.technical)} />
            <AttributeGrid title="Mental" entries={toEntries(MENTAL_LABELS, player.mental)} />
            <AttributeGrid title="Physical" entries={toEntries(PHYSICAL_LABELS, player.physical)} />
            {player.goalkeeping && (
              <AttributeGrid title="Goalkeeping" entries={toEntries(GOALKEEPING_LABELS, player.goalkeeping)} />
            )}
          </div>
        </section>
```

- [ ] **Step 5: Verify the frontend builds and lints clean**

```bash
cd soydt/web && npm run build && npm run lint
```
Expected: both succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/features/players/PlayerPage.tsx
git commit -m "$(cat <<'EOF'
Wire real attribute grid + photo fallback into PlayerPage

Adds a new "Atributos" section rendering technical/mental/physical
(always) and goalkeeping (GK only) attribute grids, and swaps the
hardcoded placeholder photo for a real-photo-first <img> that falls
back to the existing silhouette on load error.
EOF
)"
```

---

### Task 6: End-to-end verification

**Files:** none (verification only).

**Interfaces:** none — this task exercises the full chain built in Tasks 1-5.

- [ ] **Step 1: Build the full stack**

From repo root:
```bash
docker build -f soydt/Dockerfile -t soydt-api .
```
Expected: build succeeds (this compiles the updated engine-ffi crate and the updated .NET solution together).

- [ ] **Step 2: Run it and create a scoped Uruguay game**

```bash
docker run -d -p 8080:8080 --name soydt-verify soydt-api
sleep 3
curl -X POST "http://localhost:8080/api/game/create?countries=UY"
curl -X POST "http://localhost:8080/api/game/process?days=1"
```
Expected: both return 200 with a JSON body.

- [ ] **Step 3: Find a Nacional player id and inspect the richer JSON**

```bash
curl -s "http://localhost:8080/api/teams" | grep -i nacional
```
Note the `teamId` for Nacional, then:
```bash
curl -s "http://localhost:8080/api/teams/<teamId>" | head -c 2000
```
Pick any `playerId` from the squad list, then:
```bash
curl -s "http://localhost:8080/api/players/<playerId>" | python3 -m json.tool 2>/dev/null || curl -s "http://localhost:8080/api/players/<playerId>"
```
Expected: the JSON includes `technical`, `mental`, `physical` objects with 14/14/9 numeric fields each, and `goalkeeping` is either `null` or a 13-field object depending on the player's position.

- [ ] **Step 4: Browser check — attribute grid, colors, and photo**

Start the frontend dev server pointed at the running API (check `soydt/web/vite.config.ts` for the existing dev-proxy target; if it doesn't already point at `localhost:8080`, set it or use an env var per that file's convention) and open a Nacional player's page — e.g. navigate to `/players/14018037` (Bruno Zuculini, one of the 6 with a downloaded photo):
```bash
cd soydt/web && npm run dev
```
In the browser:
- Confirm Zuculini's real photo renders (not the placeholder silhouette).
- Navigate to a Nacional player **not** in the 6-id list (any other squad member) and confirm the placeholder silhouette renders instead (no broken-image icon).
- Confirm the "Atributos" section shows three grids (Technical/Mental/Physical) with icons, labels, and rounded values, each tile colored red/yellow/green consistent with its value (spot-check 2-3 tiles against the raw JSON from Step 3).
- Find a goalkeeper (position `"GK"` in the squad list) and confirm their page additionally shows a "Goalkeeping" grid; confirm an outfield player's page does not.

- [ ] **Step 5: Clean up the verification container**

```bash
docker stop soydt-verify && docker rm soydt-verify
```

- [ ] **Step 6: Update `MIGRATION_CHECKLIST.md`**

In `soydt/MIGRATION_CHECKLIST.md`, update the `players/get.html` line (currently line 54) to note the new section, and add a note near the existing placeholder-photo decision (currently around line 97) recording the scoped exception. Change line 54 from:

```
- [x] `players/get.html` → overview/ficha — verificado end-to-end (Leandro Paredes, etc.)
```

to:

```
- [x] `players/get.html` → overview/ficha — verificado end-to-end (Leandro Paredes, etc.); ampliado con sección "Atributos" (37 técnico/mental/físico + 13 arquero cuando aplica, ícono + color rojo/amarillo/verde por valor)
```

And directly after the existing placeholder-photo paragraph (around line 97), add a new line:

```
- Excepción acotada a lo anterior: 6 jugadores del plantel de Nacional (de 90) tienen `ids.transfermarkt.com` en `open-football-database` y muestran su foto real (descargada una vez a `web/public/static/images/players/{id}.jpg` vía `soydt/scripts/download-nacional-photos.sh`, no hotlinked). El resto de los jugadores de Nacional y todos los demás clubes siguen mostrando el placeholder — no hay lógica condicional por club, simplemente cae a placeholder cuando no hay archivo descargado para ese id.
```

- [ ] **Step 7: Commit the checklist update**

```bash
git add soydt/MIGRATION_CHECKLIST.md
git commit -m "$(cat <<'EOF'
Update MIGRATION_CHECKLIST.md for the player attributes + photos feature
EOF
)"
```
