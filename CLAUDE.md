# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

This monorepo holds a migration project plus the two upstream projects it migrates from:

- **`soydt/`** — the active work: a React + .NET port of `open-football`'s web UI, talking to the original Rust simulation engine through a hand-written FFI boundary. This is where almost all work happens.
- **`open-football/`** — vendored upstream source (Rust: `src/core` simulation engine, `src/database` data loading/generation, `src/web` original Askama-templated server). `soydt/engine-ffi` path-depends directly on `open-football/src/{core,database}` — do not move or rename these without updating `soydt/engine-ffi/Cargo.toml`.
- **`open-football-database/`** — the separate repo providing the structured football database (club/player/league data) that `open-football/src/database` loads.
- **`ffi-spike/`** — an early throwaway proof-of-concept for the .NET↔Rust FFI approach, superseded by `soydt/engine-ffi`. Not part of the active build.

Read `soydt/MIGRATION_CHECKLIST.md` before starting new page-porting work — it tracks which of the original app's ~56 templates have been ported, verified, or deliberately simplified/deferred, and documents known bugs (e.g. empty national-team squad/schedule data). Update it as pages move between not-started/built/verified.

## Architecture

Three layers, always touched together when adding a new read endpoint:

1. **`soydt/engine-ffi`** (Rust `cdylib`) — the only code allowed to touch `open-football`'s `SimulatorData` game-state struct directly. Each domain gets its own file (`team_finances.rs`, `player_history.rs`, etc.) exporting one or more `#[unsafe(no_mangle)] extern "C"` functions, registered via `mod` + `pub use` in `src/lib.rs`. Every JSON-returning export follows the `{ok, data}` / `{ok: false, error}` envelope documented in `soydt/engine-ffi/CONTRACT.md` — panics are caught at the boundary, never unwind into .NET. `free_string` is the single deallocator for every returned string. Bump `CONTRACT_VERSION` in `src/contract.rs` on any breaking shape change.
2. **`soydt/src/SoyDT.Engine`** — P/Invoke layer. Each domain has matching sibling files: `NativeMethods.<Domain>.cs` (raw `[LibraryImport]` declarations), `NativeGameEngine.<Domain>.cs` (SafeHandle `DangerousAddRef`/`DangerousGetHandle`/`finally DangerousRelease` wrapper), `GameSession.<Domain>.cs` (thread-safe entry point via the shared `WithGame` helper). `SoyDT.Domain` holds the plain DTO records the JSON deserializes into. This sibling-file-per-domain split is deliberate — it lets multiple people/agents add new endpoints in parallel without merge conflicts in one shared controller/engine file.
3. **`soydt/src/SoyDT.Api/Controllers`** — one controller per resource (`[Route("api/teams")]`, `[HttpGet("{teamId}/finances")]`, etc.), thin pass-through to `GameSession`.
4. **`soydt/web/src/features/<domain>/`** — React page components, one per route, fetching via `shared/api.ts`'s `callApi` helper and rendering inside `shared/Layout.tsx`. `callApi` treats HTTP 204 as `null` rather than throwing on empty `res.json()`.

`GameSession` in `SoyDT.Engine` holds a singleton in-memory game (`engine_create_game`/`engine_create_scoped_game`), advanced via `engine_process_days` and read via per-domain snapshot exports — there is no persistence between API process restarts.

Simplification is expected and normal: this port deliberately cuts scope versus the original template (no force-directed relationship graphs, no season-history charts, no SVG pitch/formation graphics, etc.). Precedent for what's an acceptable simplification for a given page lives in `MIGRATION_CHECKLIST.md`'s per-page notes and in existing sibling pages' doc comments (e.g. `team_finances.rs`).

## Commands

### Fast Rust-only iteration (recompiles just `engine-ffi`, reuses bind-mounted `target/`, ~10s)
```
docker run --rm -v <repo-root>:/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release
```

### Full stack build (Rust `.so` + .NET publish + runtime image, BuildKit cache-mounted)
Build context must be the repo root (engine-ffi path-depends on `../../open-football/src`):
```
docker build -f soydt/Dockerfile -t soydt-api .
docker run -p 8080:8080 soydt-api
```

### Verifying an endpoint end-to-end
```
curl -X POST "http://localhost:8080/api/game/create?countries=AR,UY,BR"   # scoped world, fast
curl -X POST "http://localhost:8080/api/game/process?days=5"
curl "http://localhost:8080/api/<resource>"
```
`countries` is optional on `create` — omit for the full ~68-country world (much slower to generate/process).

### Frontend
```
cd soydt/web
npm run build      # tsc -b && vite build
npm run dev        # vite dev server
npm run lint       # oxlint
```

### .NET
```
cd soydt
dotnet build SoyDT.sln
```

## Conventions

- Cross-domain logic reuse happens by loosening visibility on the shared engine-ffi module (e.g. `player_relations.rs` reuses `team_relations.rs`'s tier classifier and thresholds via `pub(crate)`) rather than duplicating classification logic.
- New engine-ffi/C# files for a domain should mirror an existing analogous domain's file set exactly (see architecture section above) rather than introducing new patterns.
- `soydt/web/src/App.tsx` is the single source of truth for routes — every new page needs an entry there matching its controller's route.
