using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
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
public sealed class GameController(GameSession session, IHubContext<ProcessHub> hub, ILogger<GameController> logger) : ControllerBase
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
