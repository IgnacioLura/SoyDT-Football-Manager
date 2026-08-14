using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Separate from TeamsController.cs on purpose (avoids merge conflicts with
/// a sibling worker also touching Teams routes) — mirrors the original
/// app's `/{lang}/teams/{slug}/schedule` route.
[ApiController]
[Route("api/teams")]
public sealed class TeamScheduleController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/schedule")]
    public ActionResult<IReadOnlyList<TeamScheduleItem>> Schedule(uint teamId) =>
        Ok(session.GetTeamSchedule(teamId));
}
