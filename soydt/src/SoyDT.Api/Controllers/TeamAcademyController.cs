using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Simplified youth academy snapshot (mirrors the original app's academy
/// tab, minus the pathway readiness bar and risk tags — see
/// `engine-ffi/src/team_academy.rs`'s doc comment). Read-only, backed by
/// `engine_get_team_academy`.
[ApiController]
[Route("api/teams")]
public sealed class TeamAcademyController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/academy")]
    public ActionResult<TeamAcademy> Academy(uint teamId)
    {
        return Ok(session.GetTeamAcademy(teamId));
    }
}
