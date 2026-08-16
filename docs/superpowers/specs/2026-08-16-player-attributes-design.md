# Player attributes, icons, color palette, and Nacional player photos

## Purpose

`PlayerPage.tsx` currently shows only three averaged numbers (technical/mental/physical). The simulation engine already computes 37 individual attributes per outfield player (14 technical, 14 mental, 9 physical) plus 13 goalkeeping attributes for keepers — none of this is exposed past the averages. This feature exposes the full breakdown with a per-attribute icon and a red/yellow/green color read on the value, and — for Club Nacional's squad specifically, as a first-iteration showcase — real player photos.

Rolled out in two parts that ship together but are independently useful:
- **Attributes + icons + color palette** — applies to every player, every team.
- **Real photos** — Nacional's squad only, this iteration. Every other player keeps the existing placeholder silhouette.

## Non-goals

- No change to how attribute *values* are simulated/generated — this only exposes existing engine state.
- No photo pipeline for clubs beyond Nacional in this iteration.
- Personality attributes (`PersonAttributes`: adaptability, ambition, controversy, loyalty, pressure, professionalism, sportsmanship, temperament, consistency) and the 27 `PlayerTrait` "preferred moves" stay hidden, matching the original game's convention of not surfacing them directly to the user.
- No live/hotlinked images from Transfermarkt — photos are downloaded once into the repo, same pattern as the team crests already added under `static/images/teams/`.

## Architecture

Three independent layers, one of which (photos) needs no backend work at all.

### 1. `soydt/engine-ffi/src/player.rs` — richer `PlayerDetailJson`

`engine_get_player` keeps its existing signature (`player_id: u32 -> *mut c_char`, same `{ok, data}` envelope). Its `PlayerDetailJson` struct gains four new fields, all sourced from `p.skills` (already computed by the engine at `open-football/src/core/src/club/player/ability/skills.rs`, currently only averaged):

```rust
technical: TechnicalJson,   // 14 fields, all f32, 1.0–20.0 scale
mental: MentalJson,         // 14 fields, all f32, 1.0–20.0 scale
physical: PhysicalJson,     // 9 fields, all f32, 1.0–20.0 scale
goalkeeping: Option<GoalkeepingJson>, // 13 fields, only Some(..) when the player's primary position is GK
```

Field names on each nested struct mirror the Rust source exactly (`corners`, `crossing`, `dribbling`, … for Technical; `aggression`, `anticipation`, `bravery`, … for Mental; `acceleration`, `agility`, `balance`, … for Physical; `aerial_reach`, `command_of_area`, … for Goalkeeping) so the mapping from engine struct to JSON to UI stays a straight passthrough with no renaming layer to keep in sync.

The existing `technical_avg`/`mental_avg`/`physical_avg` fields are **kept as-is** — PlayerPage's current overview cards don't change, the new attribute grid is additive.

Bump `CONTRACT_VERSION` in `soydt/engine-ffi/src/contract.rs` per the project's breaking-shape-change convention (this is additive, not breaking, but the convention bumps on any shape change to the exported JSON — confirm against existing bump history for prior additive changes before implementation).

### 2. `.NET` — `PlayerDetail` DTO mirrors the new shape

`soydt/src/SoyDT.Domain/GameDtos.cs`'s `PlayerDetail` record gains matching nested records (`TechnicalAttributes`, `MentalAttributes`, `PhysicalAttributes`, `GoalkeepingAttributes?`). Because `engine_get_player`'s P/Invoke binding already lives directly in `NativeMethods.cs`/`NativeGameEngine.cs` (not a dedicated sibling-file set — this was already the case before this feature), no P/Invoke signature changes are needed; only the C# record shape grows to deserialize the richer JSON. The controller (`PlayerAiReportController` or wherever `GET /api/players/{id}` lives — confirm exact controller name during implementation) is a thin passthrough and needs no changes.

### 3. Photos — build-time asset step, no engine/backend involvement

Every player record in `open-football-database/data/uy/uruguayan-first-division/nacional/players/*.json` carries `"ids": {"transfermarkt.com": "<id>"}` alongside its own `"id": <engine player id>` (confirmed by inspecting `14018037-zuculini-bruno.json`). A one-off script (same shape as the crest-download step already done for team logos):

1. Walks that directory, extracting `(engine_id, transfermarkt_id)` pairs for Nacional's ~25-30 players.
2. Fetches each player's photo from Transfermarkt using the `transfermarkt_id`.
3. Saves as `soydt/web/public/static/images/players/{engine_id}.jpg`.

**Assumption to verify before/during implementation:** the `id` field in the source JSON passes through unchanged into the runtime `Player.id` that `engine_get_player` returns (i.e., no re-numbering happens in the compiler/SQLite pipeline). `engine-ffi/src/player.rs` already does `id: p.id` directly from the JSON-sourced struct, which supports this, but confirm with one spot-check (e.g. request Nacional's squad, verify a returned `id` matches a filename in the source JSON directory) before trusting the mapping at scale.

The frontend does not need to know which players have a real photo. `PlayerPage.tsx` always requests `/static/images/players/{id}.jpg` and falls back to the existing `placeholder-face.svg` on load error. Players outside Nacional simply 404 and fall back — no club-scoping logic needed anywhere in the app.

### 4. Icons + color palette — frontend-only, no network at runtime

- `soydt/web/src/shared/attributeIcons.tsx`: one small inline-SVG line icon per attribute (37 total — 14 technical + 14 mental + 9 physical; goalkeeping's 13 reuse/extend the same set where concepts overlap, e.g. `handling`/`reflexes`/`kicking` need their own new icons, `communication`/`positioning`-adjacent ones may reuse an existing icon). Hand-authored to match the existing line-art style already in `soydt/web/public/icons.svg` (stroke-based, single accent color, ~20x20 viewbox) rather than pulling in an icon font or external library — keeps the app dependency-free the way it already is.
- `soydt/web/src/shared/attributeColor.ts`: pure function on the engine's real 1.0–20.0 scale:
  - `value <= 8` → red (weak)
  - `9 <= value <= 13` → yellow (average)
  - `value >= 14` → green (strong)
- New CSS classes in `soydt/web/public/static/css/style.css` for the three states (reuse existing color tokens if `style.css` already defines a red/yellow/green triad anywhere; otherwise add new ones consistent with the existing palette).

## Components

- **`AttributeGrid`** (new, `soydt/web/src/features/players/AttributeGrid.tsx`): props are a category label and a `Record<string, number>`. Renders one tile per attribute: icon (from `attributeIcons`) + human-readable label + rounded value + color class (from `attributeColor`). Used up to 4 times per page load (technical, mental, physical, and goalkeeping when present).
- **`PlayerPage.tsx`** changes:
  - New "Atributos" section below the existing overview cards, rendering `AttributeGrid` per category; the goalkeeping grid renders only when the API response includes a `goalkeeping` object.
  - The hardcoded `<img src=".../placeholder-face.svg">` becomes `<img src={`/static/images/players/${player.id}.jpg`} onError={swap src to placeholder-face.svg}>`.

## Data flow

`GameSession.GetPlayer(id)` (unchanged call site) → `engine_get_player` (richer JSON, same envelope) → `PlayerDetail` DTO (bigger shape) → existing controller passthrough → `callApi` in `shared/api.ts` (unchanged) → `PlayerPage.tsx` renders `AttributeGrid` × (3 or 4) + photo `<img>` with fallback.

## Error handling

- FFI: no new failure modes — same `run_guarded` envelope; a richer but still-total JSON payload.
- Frontend: missing/404 photo → `onError` swaps to `placeholder-face.svg` (already exists in the codebase, currently used unconditionally). Missing `goalkeeping` block → that `AttributeGrid` section is simply not rendered.
- Photo download script: tolerate individual fetch failures (rate limiting, a missing Transfermarkt page) by logging and skipping rather than aborting the whole batch — same tolerance the crest-download step effectively needed.

## Testing

- Rust: extend engine-ffi's existing player tests to assert the new nested fields are present with the expected shape (and that `goalkeeping` is `None` for a known non-GK player, `Some` for a known GK).
- Frontend: no component test runner is currently set up for these page components (`npm run build` / `npm run lint` are the existing checks) — verification is a real `npm run dev` session against a running API, opening a Nacional player's `PlayerPage`, and confirming: real photo loads for a Nacional player with a downloaded image, placeholder shows for players without one, the attribute grid renders all categories with correct color bands for a couple of spot-checked values, and a known goalkeeper shows the goalkeeping section while an outfield player doesn't.
