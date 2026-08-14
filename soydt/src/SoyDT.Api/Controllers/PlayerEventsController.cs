using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Player career event log (SIMPLIFIED: flat chronological list of
/// transfers, awards, and injury-recovery swings only — no decision cards,
/// severity styling, or partner links — see MIGRATION_CHECKLIST.md).
/// Read-only, backed by `engine_get_player_events`. New controller so as
/// not to touch PlayersController.cs, which another worker may be editing
/// in parallel.
[ApiController]
[Route("api/players")]
public sealed class PlayerEventsController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/events")]
    public ActionResult<IReadOnlyList<PlayerEventItem>> Events(uint playerId)
    {
        return Ok(session.GetPlayerEvents(playerId));
    }
}
