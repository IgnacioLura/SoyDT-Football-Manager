using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: player career awards summary (SIMPLIFIED — flat lifetime
/// counters only, no per-league grouping/blocks and no 12-month bar
/// chart). Read-only, backed by `engine_get_player_awards`.
[ApiController]
[Route("api/players")]
public sealed class PlayerAwardsController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/awards")]
    public ActionResult<PlayerAwardsSummary> Awards(uint playerId)
    {
        return Ok(session.GetPlayerAwards(playerId));
    }
}
