using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SoyDT.Api.Ai;
using SoyDT.Api.Hubs;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 0 skeleton — proves the React → .NET → engine-ffi (.so) → JSON
/// pipe end to end. Maps 1:1 to the original app's `/api/game/*` routes.
/// `process` stays as a synchronous Phase-0 endpoint (handy for curl/dev-loop
/// verification); `ProcessLive` is the Phase 2 replacement for the original
/// polling loop against `/api/game/processing` — it kicks the same
/// day-by-day simulation off in the background and pushes progress over
/// `ProcessHub` instead of the caller blocking on the HTTP response.
[ApiController]
[Route("api/game")]
public sealed class GameController(
    GameSession session,
    IHubContext<ProcessHub> hub,
    ILogger<GameController> logger,
    AiConfig aiConfig,
    IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpPost("create")]
    public ActionResult CreateGame([FromQuery] string? countries = null)
    {
        // `?countries=AR,UY,BR` scopes world generation to those ISO codes
        // instead of the full ~68-country world — much faster for dev/test
        // iteration. Omit for the full world.
        var codes = countries?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        session.CreateNewGame(codes);
        return Ok();
    }

    [HttpPost("process")]
    public ActionResult<ProcessResult> Process([FromQuery] uint days = 1)
    {
        return session.ProcessDays(days);
    }

    /// Starts a day-by-day simulation on a background thread and returns
    /// immediately (202 Accepted) — the caller listens on `ProcessHub`'s
    /// "ProgressUpdate" event for a `ProcessProgress` after each simulated
    /// day (the last one has `Done: true`) instead of polling.
    [HttpPost("process/live")]
    public ActionResult ProcessLive([FromQuery] uint days = 1)
    {
        // Mirrors the original's "already processing → just return" early
        // exit rather than queuing a second run behind the first.
        if (!session.TryStartProcessing())
        {
            return Accepted();
        }

        // `TaskCreationOptions.LongRunning` gets its own dedicated OS thread
        // instead of a thread-pool worker. Without it, this blocking loop
        // (it holds its thread for the whole run via GetAwaiter().GetResult())
        // ties up a pool thread per call; pile up a few real runs (or the
        // occasional double-fire) and the pool's slow hill-climbing ramp-up
        // leaves later requests — this one included — queued for minutes
        // behind it instead of failing fast or running promptly.
        _ = Task.Factory.StartNew(
            () =>
            {
                try
                {
                    logger.LogWarning("process/live starting, days={Days}", days);
                    // `ProcessDaysWithProgress` runs entirely inside a synchronous
                    // lock (see GameSession), so the callback can't `await` —
                    // block on the send instead. Safe here: this runs on its
                    // own dedicated thread with no sync context to deadlock
                    // against, and blocking (rather than fire-and-forget) keeps
                    // progress events in day order.
                    session.ProcessDaysWithProgress(days, progress =>
                    {
                        logger.LogWarning("process/live progress: {Progress}", progress);
                        hub.Clients.All.SendAsync("ProgressUpdate", progress).GetAwaiter().GetResult();
                        TriggerDailyAiEvent(progress);
                    });
                    logger.LogWarning("process/live finished");
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "process/live background task failed");
                }
                finally
                {
                    session.FinishProcessing();
                }
            },
            TaskCreationOptions.LongRunning);
        return Accepted();
    }

    /// Fires the "daily unexpected event" side effect for one day of a
    /// `process/live` run. Blocks the day-processing thread until the LLM
    /// call resolves (or fails) — deliberately, even though this adds the
    /// LLM's latency to every processed day: `process/live`'s progress
    /// updates and the frontend's "done" detection both key off
    /// `GameSession.Publish`, which only happens after this whole loop
    /// returns, so a fire-and-forget call here raced the frontend's
    /// before/after `/api/dt/events` comparison (`ProcessContext.tsx`) —
    /// snapshot/date already looked "done" before the ledger write landed,
    /// so `DtEventModal` silently never saw the new entry. Blocking here
    /// (same "call .GetAwaiter().GetResult() from this dedicated
    /// LongRunning thread, no sync context to deadlock against" pattern
    /// already used for the `hub.Clients.All.SendAsync` call above) makes
    /// the ledger write happen-before Publish, which is what the frontend
    /// actually needs. Silently a no-op if no DT club is picked yet or AI
    /// isn't configured (`AiConfig.Get()` returns the built-in local-Ollama
    /// default unless explicitly cleared, so in practice this only skips
    /// if someone has explicitly turned AI off).
    private void TriggerDailyAiEvent(ProcessProgress progress)
    {
        if (session.MyClubId is not { } clubId) return;
        var settings = aiConfig.Get();
        if (settings is null) return;

        try
        {
            var team = session.GetTeam(clubId);
            if (team.Players.Count == 0) return;
            var picked = team.Players[Random.Shared.Next(team.Players.Count)];

            var seasonSummary = BuildSeasonSummary(session.GetTeamStats(clubId), picked.Id);
            var recentMatchesSummary = BuildRecentMatchesSummary(session.GetPlayerMatches(picked.Id));

            var generator = new DailyAiEventGenerator(httpClientFactory.CreateClient("ai-agent"), settings);
            var result = generator.Generate(picked.Name, picked.Position, team.Name, seasonSummary, recentMatchesSummary)
                .GetAwaiter().GetResult();
            if (result is null) return;

            session.RecordDailyAiEvent(picked.Id, picked.Name, result.Text, result.MoraleDelta, (int)progress.DaysProcessed);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "daily AI event generation failed");
        }
    }

    /// Plain-text season line the prompt drops in verbatim — falls back to
    /// "sin datos" if the player has no row yet (e.g. never featured in a
    /// squad-stats snapshot), same "just say so" approach the rest of the
    /// app takes for legitimately-empty data rather than a fake zero.
    private static string BuildSeasonSummary(IReadOnlyList<TeamPlayerStatsRow> stats, uint playerId)
    {
        var row = stats.FirstOrDefault(r => r.PlayerId == playerId);
        return row is null
            ? "sin datos de temporada todavía"
            : $"{row.Played} partidos jugados, {row.Goals} goles, {row.Assists} asistencias, rating promedio {row.AverageRating}";
    }

    /// Last 3 *completed* fixtures from the team's league schedule (see
    /// `PlayerMatchItem`'s doc comment — team-level, not gated on this
    /// player having actually appeared), newest first, as "vs Rival (V/E/D)
    /// marcador". `IsHome` already tells us which side of `HomeGoals`/
    /// `AwayGoals` is "us" — no separate club id needed.
    private static string BuildRecentMatchesSummary(IReadOnlyList<PlayerMatchItem> matches)
    {
        var played = matches.Where(m => m.HomeGoals.HasValue && m.AwayGoals.HasValue).TakeLast(3).Reverse().ToList();
        if (played.Count == 0) return "todavía no jugó partidos esta temporada";

        return string.Join(", ", played.Select(m =>
        {
            var (us, them) = m.IsHome ? (m.HomeGoals!.Value, m.AwayGoals!.Value) : (m.AwayGoals!.Value, m.HomeGoals!.Value);
            var outcome = us > them ? "V" : us < them ? "D" : "E";
            return $"vs {m.OpponentName} ({outcome}) {us}-{them}";
        }));
    }

    [HttpGet("snapshot")]
    public ActionResult<GameSnapshot> Snapshot()
    {
        return session.GetSnapshot();
    }

    /// Whether a world exists yet and (if so) whether the DT has already
    /// picked a club — the frontend's `/new-game` onboarding flow polls this
    /// once at boot to decide whether to redirect there.
    [HttpGet("status")]
    public ActionResult<GameStatus> Status()
    {
        return new GameStatus(session.HasGame, session.MyClubId);
    }

    /// Records which club is "mine" for the DT experience — called once,
    /// after `create`, from the club-picker step of onboarding (the club
    /// list itself comes from the league table, not from here).
    [HttpPost("my-club")]
    public ActionResult SetMyClub([FromQuery] uint clubId)
    {
        session.SetMyClub(clubId);
        return Ok();
    }

    /// This engine's data model gives a club's main team the same numeric
    /// id as the club itself (confirmed empirically, no separate club→team
    /// lookup exists), so this just echoes `MyClubId` back under the name
    /// the DT-area frontend actually asks for.
    [HttpGet("my-team")]
    public ActionResult<MyTeamResult> MyTeam()
    {
        return new MyTeamResult(session.MyClubId);
    }
}
