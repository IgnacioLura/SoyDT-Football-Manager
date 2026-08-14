using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: team relations page (SIMPLIFIED — mirrors the original app's
/// `/{lang}/teams/{slug}/relations` route conceptually, but as a flat pair
/// list + 4 summary counts instead of the original's interactive
/// force-directed social graph. See engine-ffi/CONTRACT.md for details.
/// Read-only, backed by `engine_get_team_relations`.
[ApiController]
[Route("api/teams")]
public sealed class TeamRelationsController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/relations")]
    public ActionResult<TeamRelations> Relations(uint teamId)
    {
        return Ok(session.GetTeamRelations(teamId));
    }
}
