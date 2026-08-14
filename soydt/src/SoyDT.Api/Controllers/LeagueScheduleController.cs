using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Separate from LeaguesController.cs on purpose (avoids merge conflicts with
/// a sibling worker also touching Leagues routes) — mirrors the original
/// app's `leagues/get/index.html` fixtures panel, exposed here as a
/// standalone full-season schedule at `/{lang}/leagues/{slug}/schedule`.
[ApiController]
[Route("api/leagues")]
public sealed class LeagueScheduleController(GameSession session) : ControllerBase
{
    [HttpGet("{leagueId}/schedule")]
    public ActionResult<IReadOnlyList<LeagueScheduleItem>> Schedule(uint leagueId) =>
        Ok(session.GetLeagueSchedule(leagueId));
}
