using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: player detail page (mirrors the original app's
/// `/{lang}/players/{slug}` route, overview tab only). Read-only, backed
/// by `engine_get_player`.
[ApiController]
[Route("api/players")]
public sealed class PlayersController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}")]
    public ActionResult<PlayerDetail> Get(uint playerId)
    {
        return Ok(session.GetPlayer(playerId));
    }
}
