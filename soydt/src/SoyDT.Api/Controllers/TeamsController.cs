using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: team detail page (mirrors the original app's `/{lang}/teams/{slug}`
/// route, overview/squad tab only). Read-only, backed by `engine_get_team`.
[ApiController]
[Route("api/teams")]
public sealed class TeamsController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}")]
    public ActionResult<TeamDetail> Get(uint teamId)
    {
        return Ok(session.GetTeam(teamId));
    }
}
