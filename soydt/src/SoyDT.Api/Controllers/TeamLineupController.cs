using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs the DT squad/lineup page — mirrors `TeamTacticsController`'s
/// route shape but this one is read/write: `PUT` sets which 11 players
/// are pinned as the team's starting XI (see engine-ffi/src/team_lineup.rs).
[ApiController]
[Route("api/teams")]
public sealed class TeamLineupController(GameSession session) : ControllerBase
{
    [HttpGet("{teamId}/lineup")]
    public ActionResult<TeamLineup> Get(uint teamId)
    {
        return Ok(session.GetTeamLineup(teamId));
    }

    [HttpPut("{teamId}/lineup")]
    public ActionResult Set(uint teamId, [FromBody] SetLineupRequest body)
    {
        session.SetTeamLineup(teamId, body.PlayerIds);
        return Ok();
    }
}
