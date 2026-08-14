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
- [~] `match/get.html` — scoreboard + timeline + replay PixiJS construidos y verificados por API (ver detalle en Fase 2 abajo); falta verificación visual real en navegador (sin herramienta de screenshot en este entorno)

### Utilitarias
- [x] `about.html` — construido por agente en paralelo, página estática sin llamadas a backend (`/about`)
- [ ] `search.html` — no construido: el original pega a `/api/search?q=...` (países+clubes+jugadores simultáneo), no existe endpoint ni capacidad de búsqueda por nombre en engine-ffi; explícitamente Fase 3 ("search reales") según este mismo checklist
- [ ] `watchlist.html` — no construido: requiere estado mutable persistido (`/api/watchlist/remove/:id`) que no existe en la API; explícitamente Fase 3
- [ ] `workers.html` — no construido: panel admin de workers de simulación distribuida, infraestructura del engine Rust, no aplica al alcance read-only de Fase 1; explícitamente Fase 3

## Fase 2 — Match replay + process en vivo

**Decisión de arquitectura (replay de partidos)**: a diferencia del original (que genera datos de posición completos para CADA partido simulado y los guarda a disco en `match_results/*.json.gz`), acá el replay se genera **bajo demanda**: `engine_simulate_team_match` (`engine-ffi/src/match_detail.rs`) re-simula el enfrentamiento entre los planteles ACTUALES de ambos equipos (`Team::get_rotation_match_squad_at`, mismo builder real que usa el motor para partidos de liga) cuando el usuario abre la página de un partido — no reproduce el resultado histórico exacto del día simulado. Evita el crecimiento sin límite de RAM del `GameSession` singleton in-memory (sin persistencia a disco). Reutiliza la proyección JSON de `engine-ffi/src/match.rs` (`match_result_json_from_raw`, compartida vía `pub(crate)` con el path JSON-squad existente) para que ambos caminos de simulación serialicen igual.

- [x] SignalR `ProcessHub` — reemplaza el polling de `/api/game/processing` del original (un booleano "¿está procesando?" en loop). `GameController.ProcessLive` (`POST /api/game/process/live?days=N`) corre `GameSession.ProcessDaysWithProgress` en background (loop de a 1 día, reutilizando `engine_process_days` sin cambios en Rust) y empuja un evento `ProgressUpdate` por día vía `IHubContext<ProcessHub>` (hub montado en `/api/hubs/process`, bajo el prefijo `/api` para que el proxy de Vite lo cubra sin config adicional — `vite.config.ts` con `ws: true`). El endpoint síncrono `/api/game/process` original queda intacto (útil para curl/dev-loop). Verificado end-to-end con un cliente SignalR real (Node, `@microsoft/signalr`) contra el contenedor Docker: 2 eventos de progreso recibidos en orden correcto, último con `Done: true`, snapshot confirma el día avanzado. Cableado también en `PipeCheckPage` (sección "Phase 2 — ProcessHub") como demo/verificación manual en browser.
- [ ] SignalR `AiProgressHub` — depende del AI/LLM agent (Fase 3), no hay nada que reportar progreso todavía
- [x] `GET /api/match/{homeTeamId}/{awayTeamId}` — nuevo `MatchController`, devuelve goles/tarjetas/cambios/posesión + `positionData` downsampleado (~500ms) + `homePlayerIds`/`awayPlayerIds` (para colorear el replay). Sin `match_id` real que buscar (no hay partidos persistidos), así que la ruta usa los dos team ids directo — el frontend los extrae del `matchId` con formato `{date}_{homeId}_{awayId}` que ya usan los links de `TeamSchedulePage`/`LeagueSchedulePage`. Verificado con datos reales end-to-end en Docker (Boca Juniors 1-1 Newell's, goles/tarjetas/cambios reales). Respuesta ~11-12MB sin comprimir por partido (posiciones downsampleadas de ball+22 jugadores) — se agregó `AddResponseCompression`/`UseResponseCompression` (gzip habilitado también para HTTPS, justificado en comentario de `Program.cs`), confirmado ~3.3x de reducción (11.9MB → 3.6MB) con un request real.
- [x] Wrapper PixiJS `MatchReplayCanvas` (`web/src/features/match/MatchReplayCanvas.tsx`) — cancha simplificada (rectángulo + línea media + círculo central, sin césped/gradas), pelota + 22 puntos de jugador coloreados por equipo (azul/rojo), controles play/pause + slider de tiempo, el partido completo (hasta ~95min simulados) se comprime a 60s de reproducción real. `MatchDetailPage.tsx` arma scoreboard + timeline de eventos (goles/tarjetas/cambios) + el canvas. Ruta `/match/:matchId`. **Pendiente**: verificación visual real en navegador — sin herramienta de screenshot/browser en este entorno (Chrome MCP desconectado), solo se verificó el pipe de datos vía API + `tsc`/`vite build` sin errores.
- [ ] Endpoints `/api/match/{id}/metadata` + `/chunk/{n}` — no se implementó chunking: con el enfoque "bajo demanda" ya downsampleado (11-12MB vs ~77MB del original sin comprimir), una sola respuesta HTTP comprimida alcanza; se revisará si hace falta cuando el mundo completo (no solo AR/UY/BR) genere partidos con más jugadores en cancha simultáneamente o si el tamaño se vuelve un problema real de UX.

## Fase 3 — Resto + AI reports portado a C#
- [ ] Face SVG generator portado a C# (`SoyDT.Reports`)
- [ ] AI/LLM agent portado a C#
- [ ] Watchlist, workers admin, search reales

## Fase 4 — Cutover
- [ ] Retirar servidor Axum Rust
