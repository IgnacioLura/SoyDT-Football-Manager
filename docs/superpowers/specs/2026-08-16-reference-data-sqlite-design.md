# Reference data → SQLite (design)

## Goal

Reference/world-generation data (continents, countries, national
competitions, domestic cups, leagues, clubs, names, players) currently
ships as a single gzip-compressed JSON blob (`open-football/src/database/src/data/database.db`,
~4.2M), built by the separate `open-football-database/compiler` repo and
embedded into the Rust binary at compile time (`include_bytes!`). To
inspect or edit any of it today requires cloning `open-football-database`,
running its compiler, and rebuilding.

Replace that blob with a SQLite file the user can open, browse, and edit
directly with any off-the-shelf tool (DB Browser for SQLite, DBeaver) —
no repo clone, no compiler, no rebuild.

## Explicitly out of scope

- **Campaign/game-state persistence** (`SimulatorData` save/load,
  users, campaigns) — separate future project, tracked verbally, not
  in this spec. `GameSession` singleton-per-process behavior is
  unchanged by this work.
- **GameSession multi-instance** — deferred by explicit user request,
  unrelated to reference-data storage.
- **EF Core / Postgres** — reference data is consumed exclusively by
  the Rust `database` crate at world-generation time; .NET never reads
  it directly. EF Core has no role here (it fits the future
  campaigns/saves layer, which *is* .NET-owned).
- **`open-football/src/core`, `soydt/engine-ffi` contract** — untouched.
  This change is fully contained inside `open-football/src/database`.

## Current shape (confirmed by reading the loaders)

`database/src/loaders/compiled.rs` gunzips the blob once behind a
`OnceLock` into a `CompiledDatabase` struct — one `Vec<T>` per
top-level entity type:

```
continents, countries, national_competitions, domestic_cups,
leagues, clubs, names, players
```

Every other loader (`country.rs`, `league.rs`, `data_tree.rs`, etc.)
already does its cross-referencing (country-code → id resolution,
domestic-cup-by-slug matching, enabled-league filtering, satellite-club
folding) as a **pure in-memory pass over these `Vec<T>`s**, independent
of where they came from. That means swapping the storage format only
requires rewriting how each `Vec<T>` is produced — every downstream
loader keeps working unmodified.

## Approach: SQLite, one table per top-level entity, JSON payload column

One table per entity type in `CompiledDatabase`. Each row has:
- A handful of scalar columns for whatever the data is naturally keyed
  or filtered by (mirrors what loaders already look up by).
- A `data` column: the full entity serialized as JSON, using the
  *same* `#[derive(Deserialize)]` structs that exist today — no new
  struct definitions.

| Table | Key column(s) | Extra scalar columns | Rationale |
|---|---|---|---|
| `continents` | `id` PK | `name` | trivial, kept for consistency |
| `countries` | `id` PK | `code`, `slug`, `name`, `continent_id` | `country.rs` looks up by code and id |
| `domestic_cups` | `slug` PK | `country_slug` | `country.rs` matches by country slug |
| `national_competitions` | `id` PK | `scope`, `continent_id` | filterable by scope |
| `leagues` | `id` PK | `slug`, `country_code`, `enabled`, `tier` | `data_tree.rs` filters on `enabled` |
| `clubs` | `id` PK | `name`, `country_code` | browsable by name/country |
| `names_by_country` | `country_code` PK | — | one row per country |
| `players` | `id` PK | `club_id`, `country_id`, `current_ability` | 1000s of rows, these are the fields you'd actually filter/scan on |

Rust side: `compiled.rs` is rewritten to open the SQLite file (via
`rusqlite`, bundled feature so no system libsqlite3 dependency), run one
`SELECT id, data FROM <table>` per entity type, and
`serde_json::from_str::<T>(row.data)` each row into the same `Vec<T>`
shape `CompiledDatabase` holds today. Everything after that — every
other loader file — is untouched.

`build.rs` changes its `rerun-if-changed` target from
`src/data/database.db` (gzip blob) to the new SQLite file (same path,
new format/extension, e.g. `src/data/database.sqlite`).

## Migration (one-time)

A small one-off script (Rust binary or a `#[test]`-adjacent tool in
`database` crate, not shipped) that:
1. Decodes today's `database.db` exactly as `compiled.rs` does now
   (gunzip + `serde_json` into `CompiledDatabase`).
2. Opens a fresh SQLite file and inserts one row per entity, per table
   above, with `data` = that entity re-serialized to JSON.

Run once, commit the resulting `.sqlite` file, delete the old
`database.db` gzip blob.

## Effect on `open-football-database`

Its `compiler` stops being a mandatory build step — the SQLite file
*is* the editable source now. The repo stays as-is (raw scraped data +
compiler) for the rare case of regenerating the dataset from scratch;
nothing here deletes or restructures it. (Previously discussed:
kept separate on purpose, not merged into `open-football`.)

## Dependencies added

- `rusqlite` (bundled feature) in `open-football/src/database/Cargo.toml`.

## Risks (carried over from the options discussion)

- Editing nested fields (e.g. a team's `finance.balance` inside a
  club's `data` JSON) is still text-editing JSON in one cell, not a
  grid field — accepted tradeoff vs. full normalization (rejected:
  much larger schema/loader rewrite, higher risk of subtly wrong joins
  silently corrupting world data, more ongoing schema-maintenance cost
  as `core` evolves).
- Scalar columns duplicate data also present in the `data` JSON
  (e.g. a club's `name`) — must stay in sync; acceptable since both
  are written together by the same migration/edit path.
