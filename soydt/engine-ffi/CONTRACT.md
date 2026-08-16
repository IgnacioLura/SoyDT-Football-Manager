# engine-ffi JSON contract

`SoyDT.Engine` must assert `engine_ffi_contract_version()` matches the
version it was built against before trusting any JSON shape below. Bump
`CONTRACT_VERSION` in `src/contract.rs` on any non-additive change (field
removed/renamed/retyped) to any of these shapes.

Current version: **1**

## Memory ownership

Every `char*` returned by any export below is owned by `engine-ffi`. Callers
must pass it to `free_string` exactly once and must not read it afterwards.
Never free it with the caller's own allocator.

## Envelope

All JSON-returning exports (everything except `engine_ffi_contract_version`,
`engine_create_game`, `engine_free_game`) return this shape:

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "engine_error" | "panic", "message": "..." } }
```

`data` is present iff `ok` is `true`; `error` is present iff `ok` is `false`.
A Rust panic inside the engine is caught and reported as `code: "panic"`
rather than unwinding across the FFI boundary.

## Exports

### `engine_ffi_contract_version() -> u32`
No envelope — a bare integer. Call once at startup; abort/log loudly on
mismatch rather than proceeding with an assumed-compatible contract.

### `engine_create_game() -> *mut GameHandle` (opaque, nullable)
Loads the embedded database and procedurally generates a fresh world.
**Not** JSON-enveloped — returns null on failure (there's no live handle yet
to attach an error to). Pass the non-null result to every other `engine_*`
game function, and eventually to `engine_free_game` exactly once.

### `engine_create_scoped_game(country_codes_json: *const c_char) -> *mut GameHandle` (opaque, nullable)
Same as `engine_create_game`, but prunes the loaded database down to only the
given ISO country codes before generating — e.g. `'["AR","UY","BR"]'` — much
faster to create and to `engine_process_days` against, useful for dev/test
iteration instead of paying for the full ~68-country world every time. An
empty array (`[]` or `""`) behaves like the unscoped `engine_create_game`.
Not JSON-enveloped, same nullable-on-failure contract as `engine_create_game`.

### `engine_free_game(handle: *mut GameHandle)`
Releases a handle. No return value. Double-free / use-after-free is
undefined behavior — same contract as any C API returning an owned pointer.

### `engine_process_days(handle, days: u32) -> *mut c_char`
Advances the world by `days` simulated days (one `FootballSimulator::simulate`
tick per day). `data`:

```json
{ "date": "2026-08-15", "days_processed": 1, "matches_played": 42 }
```

### `engine_get_snapshot(handle) -> *mut c_char`
Minimal read-only snapshot of current world state. `data`:

```json
{
  "date": "2026-08-14",
  "continents": [
    { "id": 1, "name": "Europe", "country_count": 30 }
  ]
}
```

This is intentionally small (Phase 0 proves the pipe, not full feature
coverage) — it grows per-feature-area fields as React pages come online.
Never a wholesale dump of `SimulatorData` (no serde derive on it, and it's
too large/internal to expose directly — always a hand-projected DTO, same
pattern as the match squad JSON below).

### `engine_get_countries(handle) -> *mut c_char`
Flat list of every country in the current world (or scoped subset). `data`:

```json
[
  { "id": 12, "code": "AR", "slug": "argentina", "name": "Argentina", "continent_id": 3, "continent_name": "South America", "league_count": 2 }
]
```

Sorted by `name`. Backs React's countries index page (Phase 1).

### `engine_get_leagues(handle, country_id) -> *mut c_char`
Leagues belonging to `country_id`. `data`:

```json
[{ "id": 2000060001, "name": "Primera Division Zona A", "slug": "...", "country_id": 1649, "tier": 1, "reputation": 7500, "team_count": 15 }]
```

### `engine_get_league_table(handle, league_id) -> *mut c_char`
Current standings (via `League::annual_table_rows()`, split-season-aware). `data`:

```json
{
  "league_id": 2000060001, "league_name": "Primera Division Zona A", "league_slug": "...",
  "rows": [{ "team_id": 82, "team_name": "Boca Juniors", "team_slug": "boca-juniors", "position": 1, "played": 0, "won": 0, "drawn": 0, "lost": 0, "goals_for": 0, "goals_against": 0, "goal_difference": 0, "points": 0 }]
}
```

### `engine_get_league_schedule(handle, league_id) -> data: LeagueScheduleItem[]`
Full-season fixture list for one league, sorted by date ascending. Only the
league's own domestic schedule — continental/cup fixtures not merged, same
simplification as `engine_get_team_schedule`.

```json
{"date":"14.08.2026","time":"18:00","home_team_id":82,"home_team_name":"Boca Juniors","away_team_id":42,"away_team_name":"River Plate","match_id":"2026-08-14_82_42","home_goals":null,"away_goals":null}
```

### `engine_get_team(handle, team_id) -> *mut c_char`
Team identity + league + squad (lightweight player cards). `data`:

```json
{
  "id": 82, "name": "Boca Juniors", "slug": "boca-juniors", "club_id": 82,
  "league_id": 2000060001, "league_name": "Primera Division Zona A", "reputation": 7500,
  "players": [{ "id": 123, "name": "...", "position": "GK", "age": 27, "current_ability": 140 }]
}
```

### `engine_get_national_squad(handle, country_id, u21: bool) -> *mut c_char`
Squad for a country's national team (`u21=false` senior, `u21=true`
Under-21 — two distinct teams on `Country`, not a filtered view). Combines
real (club-owned) and synthetic (depth-filler) picks via
`NationalTeam::squad_picks()`. `data`:

```json
[{
  "player_id": 123, "position": "GK", "first_name": "...", "last_name": "...", "age": 27,
  "club_id": 82, "club_name": "Boca Juniors", "current_ability": 140, "condition_pct": 92,
  "international_apps": 0, "international_goals": 0, "reason": "KeyPlayer"
}]
```

Deliberately omits `potential_ability` — that's a hidden biological-ceiling
attribute in `core` (never shown to clubs/scouts); `current_ability` fills
both the "ability" and "potential" star columns the original template shows,
rather than leaking the hidden field. `reason` is currently the Rust enum
variant name (`CallUpReason::as_i18n_key()`'s catalog doesn't exist in this
crate) — map to real i18n text once a catalog exists (Phase 3).

### `engine_get_player(handle, player_id) -> *mut c_char`
Full player detail (searches every club/team's squad — O(clubs × players),
a single detail-page lookup, not for use in a loop). `data`:

`goalkeeping` is `null` for outfield players — only populated when the player's primary position is `Goalkeeper`.

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

### `engine_simulate_spike_match(home_name, away_name) -> *mut c_char`
Smoke test: two hardcoded 4-4-2 squads, default attributes. `data`:

```json
{ "home_team": "Nacional", "away_team": "Penarol", "home_goals": 1, "away_goals": 0, "match_time_ms": 5700000 }
```

### `engine_simulate_from_json(home_json, away_json) -> *mut c_char`
Takes real squad data. Each of `home_json`/`away_json` is a JSON array of:

```json
{
  "id": 1001,
  "position": "GK",
  "skills": { /* core::PlayerSkills fields */ },
  "attributes": {
    "is_banned": false, "is_injured": false,
    "condition": 10000, "fitness": 10000, "jadedness": 0,
    "weight": 78, "height": 183, "value": 5000000,
    "current_reputation": 4000, "home_reputation": 4000, "world_reputation": 2000,
    "current_ability": 130
  },
  "person": { /* core::PersonAttributes fields */ }
}
```

`data` on success:

```json
{ "home_goals": 2, "away_goals": 1, "match_time_ms": 5700000 }
```

### `engine_simulate_match_full(home_json, away_json) -> *mut c_char`
### `engine_simulate_match_full_with_positions(home_json, away_json) -> *mut c_char`
Same squad JSON input as above. `data`:

```json
{
  "home_goals": 2,
  "away_goals": 1,
  "home_possession_percentage": 54.3,
  "goals": [
    { "player_id": 1005, "is_home": true, "minute": 23, "is_auto_goal": false }
  ],
  "injuries": [
    { "player_id": 1003, "is_home": true, "minute": 61 }
  ],
  "cards": [
    { "player_id": 2004, "is_home": false, "card_type": "Yellow" }
  ],
  "substitutions": [
    { "player_out_id": 1003, "player_in_id": 1012, "is_home": true, "minute": 61 }
  ],
  "position_data": {
    "ball": [[0, 52.5, 34.0], [500, 51.2, 33.8], "..."],
    "players": { "1001": [[0, 5.0, 34.0], "..."] }
  }
}
```

`position_data` is present only from the `_with_positions` variant, sampled
every 500ms (not the engine's native ~30ms — see `src/match.rs` for why).
`_full` (without positions) omits the field entirely (`skip_serializing_if`).

### `engine_get_team_schedule(handle, team_id) -> data: TeamScheduleItem[]`
League fixture list for one team, sorted by date ascending. Only domestic
league fixtures — continental/cup fixtures not merged.

```json
{"date":"14.08.2026","time":"18:00","opponent_team_id":42,"opponent_name":"River Plate","is_home":true,"competition_name":"Primera División","match_id":"2026-08-14_7_42","home_goals":2,"away_goals":1}
```

### `engine_get_team_transfers(handle, team_id) -> *mut c_char`
Incoming and outgoing completed transfers for one team, resolved via the
team's `club_id` (incoming matches `to_club_id`, outgoing matches
`from_team_id` — same asymmetry as `engine_get_league_transfers`). `data`:

```json
{
  "incoming": [{ "player_id": 123, "player_name": "...", "other_team_name": "River Plate", "fee": 5000000.0, "is_loan": false, "is_free": false, "date": "14.08.2026" }],
  "outgoing": [{ "player_id": 456, "player_name": "...", "other_team_name": "Boca Juniors", "fee": 0.0, "is_loan": true, "is_free": false, "date": "01.07.2026" }]
}
```

### `engine_get_player_history(handle, player_id) -> *mut c_char`
Flat, historical-only season list for one player (SIMPLIFIED — League-kind
`season_ledger` rows only, oldest first; drops the competition-breakdown
accordion, the live/current-season merge, domestic-cup/friendly rows, and
per-season transfer fee):

```json
[
  { "season": "2023/24", "team_name": "Boca Juniors", "played": 28, "goals": 9, "assists": 5, "average_rating": 6.85 }
]
```

### `engine_get_player_contract(handle, player_id) -> *mut c_char`
Returns `Option<ContractJson>` as `data` (null if the player has no active
contract). Simplified scope — loan detail, bonuses, and clauses omitted:

```json
{ "club_name": "Boca Juniors", "shirt_number": 5, "contract_type": "FullTime", "squad_status": "KeyPlayer", "salary_weekly": 96153.85, "salary_annual": 5000000.0, "started": "01.01.2024", "expiration": "30.06.2027", "is_transfer_listed": false }
```

### `engine_get_team_relations(handle, team_id) -> *mut c_char`
HEAVILY SIMPLIFIED reinterpretation — the original renders an interactive
force-directed social graph (SVG + physics) of every player-to-player
relationship in the squad (`open-football/src/web/src/teams/relations/`).
This is **not** a 1:1 port: no graph/physics layout, and only same-team
pairs are considered (cross-team relationships, which the underlying
`core::club::relations::Relations` data does support, are dropped). For
each player, the strongest 1-3 same-team relationships (by `abs(level)`)
are kept, deduplicated into unordered pairs, and classified into one of 4
tiers using the same thresholds as the original's `RelationsGraph::classify`
(`level` is the average of both players' `PlayerRelation::level`, -100..100,
when both sides have an entry): `>= 55` bond, `>= 20` friendly, `<= -20`
tension, `<= -55` rivalry (or either side's `is_open_rivalry()` flag set),
else dropped as neutral. `data`:

```json
{
  "bond_count": 2,
  "friendly_count": 5,
  "tension_count": 1,
  "rivalry_count": 0,
  "pairs": [
    { "player_a_id": 123, "player_a_name": "...", "player_b_id": 456, "player_b_name": "...", "tier": "bond", "level": 62.5 }
  ]
}
```

## Round-trip test fixtures

CI should keep a fixed JSON fixture per export (a known squad pair, a known
`days` value) and assert the response shape parses into the matching C#
DTO on every build, so a drift between this file, `src/match.rs`/`src/game.rs`,
and `SoyDT.Engine`'s C# records is caught immediately rather than at runtime.
