using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 0 skeleton — proves the React → .NET → engine-ffi (.so) → JSON
/// pipe end to end. Maps 1:1 to the original app's `/api/game/*` routes;
/// `process`/`processing` becomes a SignalR `ProcessHub` in Phase 2 instead
/// of the original polling loop (see the migration plan) — this synchronous
/// version is intentionally the simplest thing that proves the pipe works.
[ApiController]
[Route("api/game")]
public sealed class GameController(GameSession session) : ControllerBase
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

    [HttpGet("snapshot")]
    public ActionResult<GameSnapshot> Snapshot()
    {
        return session.GetSnapshot();
    }
}
