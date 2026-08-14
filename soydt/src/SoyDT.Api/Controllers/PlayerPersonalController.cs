using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Player "Personal" sub-tab — attributes/personality/morale/reputation.
/// Simplified scope: no SVG radar-chart geometry, no manager-relationship
/// cross-lookup, no favorite clubs (see MIGRATION_CHECKLIST.md). Read-only,
/// backed by `engine_get_player_personal`.
[ApiController]
[Route("api/players")]
public sealed class PlayerPersonalController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/personal")]
    public ActionResult<PlayerPersonal> Personal(uint playerId) => Ok(session.GetPlayerPersonal(playerId));
}
