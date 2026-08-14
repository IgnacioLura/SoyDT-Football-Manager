# Migración open-football → React SPA + .NET middleware (SoyDT)

## Contexto

`open-football` (Rust, ZOXEXIVO) hoy corre Axum+Askama server-rendered, single-instance, sin auth. `ffi-spike/` ya probó que un .NET app puede llamar al motor de simulación Rust (`core::match::engine::FootballEngine`) vía FFI nativo (cdylib), evitando reescribir la lógica de simulación. Objetivo: clon pixel-perfect del front en React + backend .NET nuevo (proyecto `SoyDT`, no existe aún) como middleware entre React y el engine Rust, con más control sobre la app que el que da server-rendered Rust directo.

Decisiones ya tomadas con el usuario (no relitigar):
1. SoyDT es proyecto nuevo, no hay repo previo.
2. UI: clon pixel-perfect, reusar Bootstrap5 + `style.css`/`images.css`/`flags.css` (14,004 líneas) tal cual, mismas clases `fm-*` y estructura DOM.
3. Real-time: reemplazar polling actual (process day-advance, ai-progress) por SignalR/push. Match replay mantiene chunked-fetch + interpolación client-side (no es el problema de polling).
4. Motor de simulación: FFI nativo (no reescribir engine en C#).
5. State ownership: **Rust sigue siendo dueño** de `SimulatorData` (transfers, calendario, lesiones, moral, tablas). `engine-ffi` crece para envolver también `game_create`/`process`/snapshot, no solo el partido. .NET orquesta vía FFI, no reimplementa el day-tick loop.
6. Deploy target: **Linux/Docker**. Empaquetado nativo = `.so`, necesita CI/cross-compile.
7. Face SVG generator (2338 líneas Rust) y AI/LLM reports (`ai/agent.rs`, `ai/client.rs`): **portar a C#/.NET**, no proxy a Rust.

## Grounding (verificado por exploración)

- `open-football/src/web`: Axum 0.8.9 + Askama 0.16 (NO actix), rust-embed, sin auth/sesión, estado global `Arc<RwLock<SimulatorData>>` en `open-football/src/core/src/simulator/data.rs`.
- `game_create_action` (`open-football/src/web/src/game/create.rs`) hoy es un stub (200 OK sin body) — confirmar con el motor Rust si el bootstrap de partida está realmente implementado en `core`/`database` antes de asumir que es un FFI export trivial.
- `ffi-spike/src/lib.rs`: 4 `extern "C" fn` (simulate_spike_match, simulate_from_json, simulate_match_full[_with_positions]), depende solo de `core` (no `database`). Errores hoy son strings ad hoc, sin `catch_unwind` (panic cruzando FFI = UB), sin versionado de contrato.
- 56 templates Askama repartidos en teams/players/staff/countries/leagues/cups/playoffs/continental-comps/match/utility pages. Rutas API listadas en exploración previa (game, match chunks, player actions, watchlist, workers, search, ai/*).
- `open-football-database`: JSON per-country + compiler Rust — no reimplementar en C#, consumir vía `engine-ffi` o como build step offline.

## Estructura de carpetas

```
FootballDT/
├── open-football/            (vendored, intacto — fuente de core/database)
├── open-football-database/   (vendored, intacto)
├── ffi-spike/                (spike, se mantiene como referencia, superseded por engine-ffi)
└── soydt/                    (todo lo nuevo)
    ├── engine-ffi/            Rust cdylib productivo, evolución de ffi-spike
    ├── SoyDT.sln
    ├── src/
    │   ├── SoyDT.Api/         ASP.NET Core Web API + SignalR hubs
    │   ├── SoyDT.Engine/      P/Invoke + wrappers nativos (NativeGameEngine, NativeMatchEngine)
    │   ├── SoyDT.Domain/      DTOs de API, independientes del wire format Rust
    │   ├── SoyDT.Reports/     face SVG generator + AI/LLM report logic portados a C#
    │   └── SoyDT.Data/        solo si hace falta wrapping extra sobre datos de país (normalmente pass-through vía engine-ffi)
    ├── tests/
    └── web/                   React app (Vite + TS)
        ├── src/{app,features,shared,styles}
        └── public/{fonts,images,i18n}
```

## engine-ffi (evolución de ffi-spike)

1. **Panic safety**: envolver cada `extern "C" fn` en `catch_unwind`, convertir panics capturados al mismo envelope de error.
2. **Contrato de error único versionado**: `{"ok": bool, "data": ..., "error": {"code","message"}}` + `engine_ffi_contract_version()` export, para que `SoyDT.Engine` valide compatibilidad al arrancar.
3. **Memoria**: un solo `free_string` export, wrapper `IDisposable`/`SafeHandle` en C# en cada call site.
4. **Scope ampliado**: exports para `game_create`, `game_process(days)`, `game_get_snapshot_json(query)`, `game_cancel` — mantiene `Arc<RwLock<SimulatorData>>` (o `OnceLock<RwLock<...>>`) dentro del cdylib, .NET nunca toca campos de estado directamente, siempre pide snapshots JSON.
5. **Packaging Linux**: build target `.so`, CI (o build local en Linux/WSL) produce `libengine_ffi.so`, copiado a `SoyDT.Api` vía `runtimes/linux-x64/native/` o MSBuild target post-build. Dockerfile multi-stage: build Rust cdylib + build .NET + runtime image final con ambos artefactos.
6. Contrato JSON de `JsonPlayerAttributes`/`MatchResultJson`/nuevos DTOs de snapshot documentado en `engine-ffi/CONTRACT.md`, con test de round-trip fijo en CI.

## Backend .NET (SoyDT.Api)

- Controllers 1:1 con inventario actual de rutas `/api/*`: Game, Match, Players, Clubs, Watchlist, Workers, Search, Ai, Face.
- `SoyDT.Engine`: wrappers P/Invoke registrados como singleton en DI (refleja el estado global único).
- SignalR: `ProcessHub` (reemplaza poll de `/api/game/processing`, push de progreso/completion), `AiProgressHub` (reemplaza long-poll de `/api/ai/progress`).
- Face SVG y AI reports: portar `face/generator.rs` (2338 líneas) y `ai/agent.rs`/`ai/client.rs` a C# dentro de `SoyDT.Reports` — sin dependencia de Rust para estas dos rutas.
- `open-football-database`: no reimplementar el compiler en C#; correrlo como build step offline (genera artefacto que `engine-ffi` carga al startup) o exponer un export de carga de datos en `engine-ffi` que delega al crate `database` Rust existente.

## Frontend React

- Vite + React + TS, `react-router` con layout `/:lang/*` mirror de la estructura actual.
- i18n: copiar catálogos JSON de `assets/i18n/{en,es,pt,de,fr,ru,tr,ja,zh}.json` a `web/public/i18n/`, cargar con `react-i18next` (verificar shape del JSON antes de comprometerse a la lib).
- Árbol de componentes: una carpeta por feature area actual (teams, players, staff, countries, leagues, cups, playoffs, champions-league, europa-league, conference-league, copa-libertadores, national-competitions, match, about, search, watchlist, workers), subpáginas 1:1 con rutas Askama actuales.
- CSS: import global de `style.css`/`images.css`/`flags.css` copiados casi as-is a `web/src/styles/`, mismas clases `fm-*` y estructura DOM en JSX — evita reescribir 14k líneas. Cache-busting delegado a hashing de Vite.
- PixiJS: componente `MatchReplayCanvas` con `ref`+`useEffect` para lifecycle de `Application`; portar lógica de interpolación del `<script>` inline a módulo TS tipado en `features/match/replay/`.
- Face SVG: ahora servido por `SoyDT.Api` (`GET /api/players/{id}/face.svg`) backed por el generador C# portado — no depende de Rust.
- Estado: sin auth. Context o Zustand/Jotai para idioma actual, fecha simulada (`/api/date`), estado de process/ai-progress alimentado por conexiones SignalR.

## Fases de migración

- **Fase 0 — Hardening FFI + skeleton API.** `engine-ffi` v1 con panic safety, contrato versionado, exports de game_create/process/snapshot, packaging Linux/.so + Dockerfile. `SoyDT.Api` con 1-2 endpoints probando el pipe completo (React placeholder → .NET → .so → JSON). Confirmar si `game_create_action` stub actual implica que el bootstrap de partida necesita trabajo en `core`/`database` primero.
- **Fase 1 — Páginas read-only núcleo.** Countries/leagues/teams/players list+detail en React contra la API nueva, con CSS migrado. Server Axum viejo sigue corriendo en paralelo como referencia para pixel-diff. Paralelizable: porting de CSS/assets, wiring de i18n, endpoints read-model — sin dependencia dura entre sí una vez probado el pipe de Fase 0.
- **Fase 2 — Match replay + process live.** `ProcessHub` SignalR, wrapper PixiJS, endpoints metadata+chunk. Depende de que Fase 0 haya terminado los exports de match/game-state en engine-ffi (la expansión de FFI más grande).
- **Fase 3 — Resto de feature areas + AI reports.** Staff, transfers, scouting, finances, newspaper, watchlist, workers admin, search, AI player/team reports (`AiProgressHub`, lógica portada a C#).
- **Fase 4 — Cutover.** Retirar servidor Axum Rust una vez todas las páginas tengan equivalente React y paridad pixel/comportamiento firmada. `open-football/src/web` se puede archivar/eliminar; `core`/`database` quedan solo como dependencias de `engine-ffi`.

## Riesgos abiertos a monitorear (no bloquean el arranque, pero vigilar)

- Fidelidad de `style.css` (14k líneas): posibles combinaciones de clases generadas condicionalmente por Askama que React no reproduzca igual — requiere diff sistemático template-por-template, no solo visual spot-check.
- `game_create_action` stub: confirmar antes de Fase 0 si bootstrap de partida nueva está realmente implementado en el motor Rust.
- Port de face-generator y AI/agent a C#: dos módulos grandes (2338 líneas + orquestación LLM) — mayor superficie de trabajo que la alternativa de proxy, pero elegida explícitamente por el usuario para mantener todo en un runtime.

## Verificación

- Fase 0: `dotnet run` sobre `SoyDT.Api` sirviendo 1-2 endpoints reales, confirmar respuesta JSON correcta llamando desde curl/Postman y desde un React placeholder fetch.
- Cada fase: comparar visualmente página por página contra el server Axum viejo corriendo en paralelo (mismo puerto distinto, o side-by-side).
- Contract tests de `engine-ffi` corriendo en CI contra fixtures JSON fijos antes de cada fase que dependa de nuevos exports.
- Docker: build multi-stage completo (`docker build`) validando que `.so` + .NET runtime arrancan juntos en imagen final antes de Fase 4.
