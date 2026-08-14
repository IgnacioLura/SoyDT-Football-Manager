using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Team transfers page (mirrors the original app's `/{lang}/teams/{slug}/transfers`
/// route, simplified: combined incoming/outgoing panels, no season filter —
/// see MIGRATION_CHECKLIST.md). Read-only, backed by `engine_get_team_transfers`.
[ApiController]
[Route("api/teams")]
public sealed class TeamTransfersController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/transfers")]
    public ActionResult<TeamTransfers> Transfers(uint teamId)
    {
        return Ok(session.GetTeamTransfers(teamId));
    }
}
