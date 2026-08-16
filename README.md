# FootballDT

See `CLAUDE.md` for the full architecture and command reference. This file
covers one thing: what's on disk locally that isn't (and shouldn't be)
tracked in git, and how to get it back.

## Local build artifacts — not tracked, safe to delete, regenerate on demand

| Path | What it is | Regenerate with | Notes |
|---|---|---|---|
| `open-football/target/`, `soydt/engine-ffi/target/` | Cargo build cache | `cargo build` (see the Docker fast-iteration command in `CLAUDE.md`) | Grows multi-GB fast — Docker builds bind-mount the repo, so cache/registry data lands here on the host, not just inside the container |
| `soydt/web/node_modules/` | npm dependencies | `npm install` (run from `soydt/web`) | |
| `soydt/src/**/bin/`, `soydt/src/**/obj/` | .NET build output | `dotnet build` / `dotnet publish` (from `soydt`) | |
| Docker images, containers, build cache | Layers from `docker build`, cargo/nuget cache mounts | Rebuilt automatically on the next `docker build` | Can silently grow to tens of GB across repeated builds; reclaim all of it with `docker system prune -a --volumes` (safe — everything here is reconstructible) |

All of the above are already excluded via `.gitignore` (root and
`open-football/.gitignore`) — if local disk usage grows, it's one of these,
not the git repository itself.

## NOT a build artifact — do not gitignore or delete

- `open-football/src/database/src/data/database.sqlite` — the game's
  reference data (clubs, players, leagues, countries, etc). It looks like a
  build output but isn't: it's hand-editable source data (open with
  [DB Browser for SQLite](https://sqlitebrowser.org/) or DBeaver),
  embedded into the Rust binary at compile time. See
  `docs/superpowers/specs/2026-08-16-reference-data-sqlite-design.md` for
  why it replaced the old compiled `database.db` blob.
