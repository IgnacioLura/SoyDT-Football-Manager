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
        _ = Task.Run(() =>
        {
            try
            {
                logger.LogWarning("process/live starting, days={Days}", days);
                // `ProcessDaysWithProgress` runs entirely inside a synchronous
                // lock (see GameSession), so the callback can't `await` —
                // block on the send instead. Safe here: this runs on a plain
                // thread-pool thread with no sync context to deadlock
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
        });
        return Accepted();
    }

    [HttpGet("snapshot")]
    public ActionResult<GameSnapshot> Snapshot()
    {
        return session.GetSnapshot();
    }
}
