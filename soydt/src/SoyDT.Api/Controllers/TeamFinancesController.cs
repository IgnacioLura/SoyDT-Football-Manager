using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Simplified team finances snapshot (mirrors the original app's finance
/// tab, minus the 12-month history table, sponsorship contract list, and
/// chart series — see `engine-ffi/src/team_finances.rs`'s doc comment).
/// Read-only, backed by `engine_get_team_finances`.
[ApiController]
[Route("api/teams")]
public sealed class TeamFinancesController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/finances")]
    public ActionResult<TeamFinances> Finances(uint teamId)
    {
        return Ok(session.GetTeamFinances(teamId));
    }
}
