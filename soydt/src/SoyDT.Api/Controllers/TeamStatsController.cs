using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Team season player-statistics table (mirrors the original app's team
/// stats tab). Read-only, backed by `engine_get_team_stats`. Kept as its
/// own controller (new file) rather than added to `TeamsController` to
/// avoid colliding with other in-flight work on that file.
[ApiController]
[Route("api/teams")]
public sealed class TeamStatsController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/stats")]
    public ActionResult<IReadOnlyList<TeamPlayerStatsRow>> Stats(uint teamId)
    {
        return Ok(session.GetTeamStats(teamId));
    }
}
