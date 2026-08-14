using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Player "matches" sub-tab: the player's current team's domestic league
/// fixtures. Simplification — not gated on the player having actually
/// appeared in each match, and not merged with cup/continental/
/// international fixtures. Read-only, backed by `engine_get_player_matches`.
[ApiController]
[Route("api/players")]
public sealed class PlayerMatchesController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/matches")]
    public ActionResult<IReadOnlyList<PlayerMatchItem>> Matches(uint playerId)
    {
        return Ok(session.GetPlayerMatches(playerId));
    }
}
