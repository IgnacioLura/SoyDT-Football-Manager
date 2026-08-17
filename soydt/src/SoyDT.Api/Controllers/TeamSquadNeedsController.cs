using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Squad-depth shortfall snapshot (see
/// docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md).
/// Read-only, backed by `engine_get_team_squad_needs`.
[ApiController]
[Route("api/teams")]
public sealed class TeamSquadNeedsController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/squad-needs")]
    public ActionResult<TeamSquadNeeds> SquadNeeds(uint teamId)
    {
        return Ok(session.GetTeamSquadNeeds(teamId));
    }
}
