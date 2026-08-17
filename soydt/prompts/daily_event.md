# Prompt: evento inesperado diario (Ollama)

MVP — genera un evento aleatorio breve por jugador y un delta de moral (-2..2).

## Variables

- `{nombre}` — nombre del jugador
- `{posicion}` — posición del jugador
- `{equipo}` — nombre del equipo
- `{temporada}` — línea de stats de temporada del jugador (PJ/goles/asistencias/rating promedio), desde `GetTeamStats`
- `{ultimos_partidos}` — últimos 3 partidos jugados por el equipo (rival, V/E/D, marcador), desde `GetPlayerMatches`

## Prompt

```
Sos un periodista deportivo escribiendo una breve nota de color sobre un jugador, para un simulador de fútbol. Basate en el contexto reciente de abajo para que la nota sea creíble y específica — no genérica ni desconectada de los datos.

Jugador: {nombre} ({posicion}) — {equipo}
Temporada: {temporada}
Últimos partidos del equipo: {ultimos_partidos}

Escribí UN evento inesperado en 2 o 3 oraciones completas y bien escritas (entre 35 y 55 palabras en total), con gramática correcta y algo de color periodístico — no una frase suelta ni un fragmento. Que sea coherente con el contexto (racha positiva, mal momento, lesión, rumor de fichaje, gesto con un compañero o el cuerpo técnico, anécdota fuera de la cancha, etc). Puede ser positivo, negativo o neutro. Asigná un "delta" de moral entre -2 y 2 según el tono.

Ejemplos de tono y extensión esperados (no copies el contenido, son solo referencia de estilo):
- "Tras dos derrotas seguidas, {nombre} se quedó después del entrenamiento para trabajar solo en definición. El cuerpo técnico destacó su actitud frente al resto del plantel, y el vestuario lo recibió con aplausos."
- "Un rumor de la prensa española vincula a {nombre} con un club de la Liga, algo que ya generó comentarios entre sus compañeros. Todavía no hay nada oficial, pero la novela recién empieza."

Respondé SOLO con JSON válido, sin texto adicional ni markdown, con este formato exacto:
{"text": "<evento en español, 2-3 oraciones>", "delta": <entero entre -2 y 2>}
```

## Formato de salida esperado

```json
{"text": "...", "delta": -1}
```

## Wired

Implementado en `SoyDT.Api/Ai/DailyAiEventGenerator.cs` (copia este mismo prompt como constante — mantener ambos en sync). Disparado desde `GameController.ProcessLive`'s per-day progress callback: 1 jugador random del club DT (`GameSession.MyClubId`) por día procesado, vía el mismo endpoint OpenAI-compatible que los reportes de IA (`AiConfig`/`AiClient`, default `host.docker.internal:11434/v1`, `llama3.2:3b`). `GameController.BuildSeasonSummary`/`BuildRecentMatchesSummary` arman el contexto (`session.GetTeamStats`, `session.GetPlayerMatches`) que se inyecta en `{temporada}`/`{ultimos_partidos}`. Resultado (`text`+`delta` clampeado a -2..2) se loguea en el ledger existente de `GameSession.DtEvents.cs` vía `RecordDailyAiEvent` — mismo `GET /api/dt/events`, `eventId="daily_ai"`. Ya incluye: clamp de `delta`, 1 reintento si el JSON no parsea. Solo enganchado en `process/live`, no en `process` (sync, sin loop día-a-día).

**Bloqueante a propósito** (`TriggerDailyAiEvent` corre síncrono, `.GetAwaiter().GetResult()`, dentro de `_writeGate`): la primera versión era fire-and-forget para no agregar latencia al procesamiento de días, pero eso hacía carrera con el frontend — `ProcessContext.tsx` compara `/api/dt/events` antes/después apenas el snapshot cambia de fecha, y el snapshot se publica antes de que la llamada al LLM (unos segundos) termine, así que el evento quedaba en el ledger pero `DtEventModal` nunca lo mostraba. Se prefirió agregar la latencia del LLM a cada día procesado antes que perder la notificación.

## Pendiente (fuera de MVP)

- No wired en el endpoint `process` (batch sync) — solo `process/live`.
- No hay consumidor del `delta` de moral más allá del log (no afecta OVR/lineup como los eventos de matchday).
- Variables extra (moral actual, forma reciente) si se necesita más contexto en el prompt.
- Si `days` > 1, cada día espera su propia llamada al LLM en serie — un `process/live?days=5` con Ollama lento puede tardar bastante más que antes.
