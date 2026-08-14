using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Player relations page (SIMPLIFIED — mirrors the original app's
/// `/{lang}/players/{slug}/relations` route conceptually, but as a flat list
/// of this player's strongest 1-3 same-team relationships + 4 summary counts
/// instead of the original's interactive force-directed ego web. See
/// engine-ffi/CONTRACT.md for details. Read-only, backed by
/// `engine_get_player_relations`.
[ApiController]
[Route("api/players")]
public sealed class PlayerRelationsController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/relations")]
    public ActionResult<PlayerRelations> Relations(uint playerId)
    {
        return Ok(session.GetPlayerRelations(playerId));
    }
}
