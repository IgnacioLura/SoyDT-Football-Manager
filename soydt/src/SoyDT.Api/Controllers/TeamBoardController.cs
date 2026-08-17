using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Simplified board-of-directors status snapshot (see
/// docs/superpowers/specs/2026-08-17-club-board-design.md for scope).
/// Read-only, backed by `engine_get_team_board`.
[ApiController]
[Route("api/teams")]
public sealed class TeamBoardController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/board")]
    public ActionResult<TeamBoard> Board(uint teamId)
    {
        return Ok(session.GetTeamBoard(teamId));
    }
}
