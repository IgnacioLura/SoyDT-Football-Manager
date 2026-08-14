# Migration checklist — open-football → React + SoyDT (.NET)

Status legend: `[x]` done + verified end-to-end (Docker), `[~]` code written, not yet verified, `[ ]` not started.

Ver plan completo en la conversación (Fase 0-4). Este archivo se actualiza a medida que avanza el trabajo — no es el plan en sí, es el tracker de ejecución.

**Loop de verificación rápido**: `docker run --rm -v <repo>:/src -w //src/soydt/engine-ffi rust:1-bookworm cargo build --release` reusa el `target/` bind-mounteado del host → ~10s en vez de recompilar todo. El `docker build` completo (imagen final) ahora usa BuildKit cache mounts para cargo registry/target y nuget packages, así que builds sucesivos también deberían acelerarse una vez el cache esté caliente.

## Fase 0 — Pipe FFI + skeleton API

- [x] engine-ffi: panic safety, envelope versionado, free_string
- [x] engine_create_game / engine_process_days / engine_get_snapshot
- [x] engine_create_scoped_game (recorte a países específicos, ej AR/UY/BR)
- [x] SoyDT.Api + SoyDT.Engine (P/Invoke, SafeHandle, GameSession singleton)
- [x] Dockerfile multi-stage (Rust .so + .NET publish + runtime)
- [x] Verificado end-to-end en contenedor

## Fase 1 — Páginas read-only (56 templates originales, portando de a una)

### CSS/assets (una vez, cubre todas las páginas)
- [x] Copiar bootstrap.min.css / style.css / images.css / flags.css / fonts a `soydt/web/public/static`
- [x] Layout.tsx (fm-sidebar / fm-header) — aproximación estática, falta nav real por feature area
- [ ] Verificación visual real en navegador (sin herramienta de screenshot en este entorno — pendiente que el usuario confirme)

### Countries
- [x] `countries/get/index.html` → índice continentes/países (`/countries`) — verificado end-to-end
- [~] `countries/get.html` → squad nacional (`/countries/{id}`, +u21) — pipe completo responde 200, pero squad viene vacío (`[]`) incluso tras procesar 7 días; causa no confirmada (¿call-ups requieren ventana FIFA específica, o bug de filtrado en `engine_get_national_squad`?). No tachar como verificado hasta confirmar.
- [~] `countries/schedule.html` — pipe responde 200 pero vacío `[]`, mismo patrón que squad nacional (probable causa raíz común: fixtures/call-ups no poblados sin trigger específico)
- [x] `countries/staff.html` — verificado con datos reales (Valentín Ojeda DT, etc.)
- [x] `countries/list/index.html` → lista de ligas del país (`/countries/{id}/leagues`) — verificado end-to-end
- [x] `countries/free_agents.html` — verificado con datos reales (Santiago Cáseres, etc.)

### Leagues
- [x] `leagues/get/index.html` (solo tabla de posiciones, tab "overview") — verificado end-to-end
- [ ] `leagues/get/index.html` fixtures list (misma página, falta portar)
- [ ] `leagues/newspaper.html` — **diferido**: el original usa un sistema de "prose"/story generation (`PressDesk`/`IssueView`, ver `teams/newspaper/_sheet.html`) que es un subsistema de texto generado aparte, no un simple listado de datos. Requiere su propio esfuerzo de port, no vale la pena mezclarlo con el resto de Fase 1.
- [x] `leagues/transfers.html` — verificado con datos reales (fichajes de agentes libres: Romero Silvio, Adriano Luiz, etc.)
- [x] `leagues/awards.html` (simplificado a honores de temporada, sin TOTW/TOTM/pitch graphics — ver nota en engine-ffi) — pipe responde `204 No Content` correctamente (no hay temporada completa aún tras solo unos días); `callApi` arreglado para tratar 204 como `null` en vez de romper en `res.json()`.

### Teams
- [x] `teams/get.html` → overview/squad — verificado end-to-end (Boca Juniors, Cavani, etc.)
- [ ] `teams/tactics.html`
- [x] `teams/transfers.html` — construido por agente en paralelo (incoming/outgoing simplificado, sin selector de temporada ni split préstamo/permanente separado); pipe verificado (200, ambos arrays vacíos — plausible, 0 movimientos de mercado tras 1 día simulado, no confundir con el patrón raro de squad/schedule nacional)
- [~] `teams/relations.html` — construido por agente en paralelo, HEAVILY SIMPLIFIED: sin grafo force-directed/físicas/SVG (fuera de alcance), solo pares mismo-equipo (top 1-3 relaciones por jugador por `abs(level)`), tiered bond/friendly/tension/rivalry con los mismos umbrales que el original (`RelationsGraph::classify`); componente existía pero no estaba cableado en App.tsx — ya cableado (`/teams/{id}/relations`), pendiente verificar end-to-end con datos reales
- [ ] `teams/academy.html`
- [x] `teams/schedule.html` — construido por agente en paralelo (solo calendario de liga, sin continental/copas); verificado con datos reales (Boca Juniors vs Central Córdoba, Gimnasia, etc.)
- [ ] `teams/scouting.html`
- [~] `teams/stats.html` — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/teams/{id}/stats`), pendiente verificar con datos reales
- [~] `teams/finances.html` — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/teams/{id}/finances`), pendiente verificar con datos reales
- [~] `teams/staff.html` (equipo, no país) — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/teams/{id}/staff`), pendiente verificar con datos reales
- [ ] `teams/newspaper.html`

### Players
- [x] `players/get.html` → overview/ficha — verificado end-to-end (Leandro Paredes, etc.)
- [x] `players/contract.html` — construido por agente en paralelo (solo términos core: dorsal, tipo de contrato, squad status, salario semanal/anual, fechas, transfer-listed; sin detalle de préstamo/bonos/cláusulas); verificado con datos reales (Leandro Paredes, Boca Juniors)
- [x] `players/history.html` — construido por agente en paralelo (tabla plana de temporadas tipo Liga solamente, sin accordion de breakdown por competición, sin merge de temporada en curso, sin fee de transferencia); verificado con datos reales (15+ temporadas de Leandro Paredes, 2010/11 en adelante)
- [~] `players/transfers.html` — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/players/{id}/transfers`), pendiente verificar con datos reales
- [ ] `players/relations.html`
- [ ] `players/events.html`
- [~] `players/matches.html` — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/players/{id}/matches`), pendiente verificar con datos reales
- [~] `players/personal.html` — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/players/{id}/personal`), pendiente verificar con datos reales
- [~] `players/awards.html` — construido por agente en paralelo, componente+controller existían sin cablear; ya cableado (`/players/{id}/awards`), pendiente verificar con datos reales
- [ ] `players/newspaper.html`

### Staff
- [ ] `staff/get.html`
- [ ] `staff/personal.html`

### Cups / Playoffs / Competiciones continentales
- [ ] `cups/get.html`, `cups/history.html`
- [ ] `playoffs/get.html`, `playoffs/history.html`
- [ ] `champions-league`, `europa-league`, `conference-league`, `copa-libertadores`, `national-competitions` (páginas índice)

### Match
- [ ] `match/get.html` — scoreboard + replay PixiJS (esto es Fase 2, requiere SignalR/chunks)

### Utilitarias
- [ ] `about.html`
- [ ] `search.html`
- [ ] `watchlist.html`
- [ ] `workers.html`

## Fase 2 — Match replay + process en vivo
- [ ] SignalR `ProcessHub` (reemplaza polling de `/api/game/processing`)
- [ ] SignalR `AiProgressHub`
- [ ] Wrapper PixiJS `MatchReplayCanvas`
- [ ] Endpoints `/api/match/{id}/metadata` + `/chunk/{n}`

## Fase 3 — Resto + AI reports portado a C#
- [ ] Face SVG generator portado a C# (`SoyDT.Reports`)
- [ ] AI/LLM agent portado a C#
- [ ] Watchlist, workers admin, search reales

## Fase 4 — Cutover
- [ ] Retirar servidor Axum Rust
