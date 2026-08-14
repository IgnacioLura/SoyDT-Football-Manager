using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Team scouting monitoring list (mirrors the original app's scouting
/// page, simplified: collapsed from six sub-tabs — overview / monitoring /
/// reports / assignments / meetings / database — down to the single
/// "who are our scouts watching right now" table — see
/// `engine-ffi/src/team_scouting.rs`'s doc comment and
/// MIGRATION_CHECKLIST.md). Read-only, backed by `engine_get_team_scouting`.
[ApiController]
[Route("api/teams")]
public sealed class TeamScoutingController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/scouting")]
    public ActionResult<IReadOnlyList<ScoutMonitoringItem>> Scouting(uint teamId)
    {
        return Ok(session.GetTeamScouting(teamId));
    }
}
