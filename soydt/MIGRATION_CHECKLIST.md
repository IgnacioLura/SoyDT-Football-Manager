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
- [x] `countries/get.html` → squad nacional (`/countries/{id}`, +u21) — **no era bug**: `SimulatorData::process_world_national_team_callups` (open-football `src/core/src/simulator/data.rs`) solo llama a `call_up_squad` en fechas específicas de ventana FIFA (`BREAK_WINDOWS` en `country/national/types.rs`: sep 4-12, oct 9-17, nov 13-21, mar 20-28, más ventana de torneo en junio). Con pocos días procesados nunca se cruza una ventana → squad/schedule quedan vacíos legítimamente. Verificado con datos reales procesando hasta 2026-09-20 (cruza la ventana de septiembre): squad de Argentina con Ezequiel Centurión (River Plate) etc.
- [x] `countries/schedule.html` — mismo hallazgo que arriba; verificado con datos reales (Argentina 2-1 Uruguay, Copa América, 06.09.2026) tras procesar hasta la ventana FIFA de septiembre
- [x] `countries/staff.html` — verificado con datos reales (Valentín Ojeda DT, etc.)
- [x] `countries/list/index.html` → lista de ligas del país (`/countries/{id}/leagues`) — verificado end-to-end
- [x] `countries/free_agents.html` — verificado con datos reales (Santiago Cáseres, etc.)

### Leagues
- [x] `leagues/get/index.html` (solo tabla de posiciones, tab "overview") — verificado end-to-end
- [x] `leagues/get/index.html` fixtures list — construido por agente en paralelo como página/ruta separada (`/leagues/{id}/schedule`, tab agregado a `leagues/tabs.tsx`), no como tab embebido en la misma página como el original; solo calendario doméstico de la liga (sin continental/cup); verificado con datos reales (Estudiantes vs Central Córdoba SdE, etc., liga 2000060001)
- [ ] `leagues/newspaper.html` — **diferido**: el original usa un sistema de "prose"/story generation (`PressDesk`/`IssueView`, ver `teams/newspaper/_sheet.html`) que es un subsistema de texto generado aparte, no un simple listado de datos. Requiere su propio esfuerzo de port, no vale la pena mezclarlo con el resto de Fase 1.
- [x] `leagues/transfers.html` — verificado con datos reales (fichajes de agentes libres: Romero Silvio, Adriano Luiz, etc.)
- [x] `leagues/awards.html` (simplificado a honores de temporada, sin TOTW/TOTM/pitch graphics — ver nota en engine-ffi) — pipe responde `204 No Content` correctamente (no hay temporada completa aún tras solo unos días); `callApi` arreglado para tratar 204 como `null` en vez de romper en `res.json()`.

### Teams
- [x] `teams/get.html` → overview/squad — verificado end-to-end (Boca Juniors, Cavani, etc.)
- [x] `teams/tactics.html` — construido por agente en paralelo (formación, estilo táctico, XI titular con posición/CA, sin gráfico de cancha SVG); verificado con datos reales (Boca Juniors, formación 4-1-4-1, Agustín Marchesín arquero, etc.)
- [x] `teams/transfers.html` — construido por agente en paralelo (incoming/outgoing simplificado, sin selector de temporada ni split préstamo/permanente separado); pipe verificado (200, ambos arrays vacíos — plausible, 0 movimientos de mercado tras 1 día simulado, no confundir con el patrón raro de squad/schedule nacional)
- [x] `teams/relations.html` — construido por agente en paralelo, HEAVILY SIMPLIFIED: sin grafo force-directed/físicas/SVG (fuera de alcance), solo pares mismo-equipo (top 1-3 relaciones por jugador por `abs(level)`), tiered bond/friendly/tension/rivalry con los mismos umbrales que el original (`RelationsGraph::classify`); verificado con datos reales (Boca Juniors, pares "friendly" Iker Zufiaurre↔Ángel Romero, etc.)
- [x] `teams/academy.html` — construido por agente en paralelo (nivel/tier/identidad de desarrollo + lista de jugadores de cantera con fase foundation/development/professional, CA/PA crudos sin barras de estrellas ni tags de riesgo — datos de riesgo son `pub(super)` en `core` y no accesibles desde engine-ffi); verificado con datos reales (Boca Juniors, Andrés Fernández arquero foundation, etc.)
- [x] `teams/schedule.html` — construido por agente en paralelo (solo calendario de liga, sin continental/copas); verificado con datos reales (Boca Juniors vs Central Córdoba, Gimnasia, etc.)
- [x] `teams/scouting.html` — construido por agente en paralelo, HEAVILY SIMPLIFIED: colapsa los 6 sub-tabs del original (resumen, monitoreo activo, reportes detallados, asignaciones, reuniones de fichajes con votos, base de datos de jugadores conocidos) en una sola tabla "a quién están observando nuestros scouts ahora" (jugador, scout, CA/PA estimado, confianza, valor); verificado con datos reales (Tomás Federico observado por el scout Iván Muñoz, etc.)
- [x] `teams/stats.html` — construido por agente en paralelo; verificado con datos reales (Agustín Marchesín, stats de partidos jugados/pases/rating)
- [x] `teams/finances.html` — construido por agente en paralelo; verificado con datos reales (Boca Juniors, balance ~60M, ingresos por TV/sponsorship/etc.)
- [x] `teams/staff.html` (equipo, no país) — construido por agente en paralelo; verificado con datos reales (Juan Carlos Aguirre, Coach, Boca Juniors)
- [ ] `teams/newspaper.html`

### Players
- [x] `players/get.html` → overview/ficha — verificado end-to-end (Leandro Paredes, etc.)
- [x] `players/contract.html` — construido por agente en paralelo (solo términos core: dorsal, tipo de contrato, squad status, salario semanal/anual, fechas, transfer-listed; sin detalle de préstamo/bonos/cláusulas); verificado con datos reales (Leandro Paredes, Boca Juniors)
- [x] `players/history.html` — construido por agente en paralelo (tabla plana de temporadas tipo Liga solamente, sin accordion de breakdown por competición, sin merge de temporada en curso, sin fee de transferencia); verificado con datos reales (15+ temporadas de Leandro Paredes, 2010/11 en adelante)
- [x] `players/transfers.html` — construido por agente en paralelo; verificado (200, array vacío — plausible, sin movimientos de mercado tras 10 días simulados)
- [x] `players/relations.html` — construido por agente en paralelo como wrapper delgado de `teams/relations.html` (mismo clasificador `team_relations.rs::classify` reutilizado vía `pub(crate)`, top 3 relaciones por `abs(level)` filtradas a un solo jugador); verificado con datos reales (Leandro Paredes, 0 relaciones — plausible, no está en ninguno de los pares "friendly" detectados en el equipo)
- [x] `players/events.html` — construido por agente en paralelo (línea de tiempo de eventos de carrera simplificada); verificado (200, array vacío — plausible, ventana corta de 10 días simulados)
- [x] `players/matches.html` — construido por agente en paralelo; verificado con datos reales (Leandro Paredes, calendario de partidos vs Central Córdoba SdE, etc.)
- [x] `players/personal.html` — construido por agente en paralelo; verificado con datos reales (Leandro Paredes, pie preferido, reputación, moral, etc.)
- [x] `players/awards.html` — construido por agente en paralelo; verificado con datos reales (Leandro Paredes, contadores de premios en 0 — plausible, sin temporada completa aún)
- [ ] `players/newspaper.html`

### Staff
- [x] `staff/get.html` — perfil de un staff individual (coach/DT), nueva entidad distinta de `countries/staff.html` (lista de staff de selección) y `teams/staff.html` (lista de staff de club); reutiliza el mismo struct `core::club::staff::model::staff::Staff` que `team_staff.rs`; verificado con datos reales (Juan Carlos Aguirre, atributos de coaching/mental/knowledge/goalkeeping/medical)
- [x] `staff/personal.html` — verificado con datos reales (estilo de coaching Democratic, licencia ContinentalA, satisfacción laboral, fatiga, rasgos de personalidad)

### Cups / Playoffs / Competiciones continentales
- [ ] `cups/get.html`, `cups/history.html` — **investigado, no construido**: confirmado que son conceptos reales y simulados del engine (`core::league::domestic_cup::DomesticCup`, ej. "Copa Argentina"/"Copa do Brasil"), pero no expuestos todavía vía engine-ffi. Plan dejado por el agente: `engine-ffi/src/cups.rs` con `engine_get_cups`/`engine_get_cup_bracket`, mismo patrón que `team_schedule.rs`.
- [ ] `playoffs/get.html`, `playoffs/history.html` — mismo hallazgo que cups; depende de si alguna liga AR/UY/BR tiene `league_group.playoff` configurado (no confirmado)
- [ ] `champions-league`, `europa-league`, `conference-league`, `copa-libertadores`, `national-competitions` (páginas índice) — Copa Libertadores confirmada real en el engine (`core::continent::competitions::copa_libertadores::CopaLibertadores`, mismo shape que Champions League); champions/europa/conference league estarían estructuralmente presentes pero vacías en el scope actual (solo Sudamérica). `national_competitions/get.html` es un dominio distinto (torneos de selecciones tipo Mundial, `core::continent::national::NationalTeamCompetition`) — le corresponde al mismo bug/dominio de `countries/get.html` squad nacional, no a este bloque.

### Match
- [ ] `match/get.html` — scoreboard + replay PixiJS (esto es Fase 2, requiere SignalR/chunks)

### Utilitarias
- [x] `about.html` — construido por agente en paralelo, página estática sin llamadas a backend (`/about`)
- [ ] `search.html` — no construido: el original pega a `/api/search?q=...` (países+clubes+jugadores simultáneo), no existe endpoint ni capacidad de búsqueda por nombre en engine-ffi; explícitamente Fase 3 ("search reales") según este mismo checklist
- [ ] `watchlist.html` — no construido: requiere estado mutable persistido (`/api/watchlist/remove/:id`) que no existe en la API; explícitamente Fase 3
- [ ] `workers.html` — no construido: panel admin de workers de simulación distribuida, infraestructura del engine Rust, no aplica al alcance read-only de Fase 1; explícitamente Fase 3

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
