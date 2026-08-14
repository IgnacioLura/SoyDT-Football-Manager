using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Simplified team tactics snapshot (mirrors the original app's tactics
/// tab, minus the pitch graphic and last-match/"recently used shapes"
/// history — see `engine-ffi/src/team_tactics.rs`'s doc comment). Read-only,
/// backed by `engine_get_team_tactics`.
[ApiController]
[Route("api/teams")]
public sealed class TeamTacticsController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/tactics")]
    public ActionResult<TeamTactics> Tactics(uint teamId)
    {
        return Ok(session.GetTeamTactics(teamId));
    }
}
