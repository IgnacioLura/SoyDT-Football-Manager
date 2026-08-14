using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Club team staff roster (mirrors the original app's team staff tab).
/// Separate controller (not merged into TeamsController) so this worker's
/// changes don't collide with that file's owner. Read-only, backed by
/// `engine_get_team_staff`.
[ApiController]
[Route("api/teams")]
public sealed class TeamStaffController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/staff")]
    public ActionResult<IReadOnlyList<TeamStaffMember>> Staff(uint teamId)
    {
        return Ok(session.GetTeamStaff(teamId));
    }
}
