using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs `match/get.html`. Unlike the original app's `/api/match/{id}/*`
/// routes (which look up a previously-recorded fixture by id), this
/// re-simulates the two teams on demand — see MIGRATION_CHECKLIST.md's
/// Fase 2 architecture note. There's no `match_id` to look up yet, so the
/// route is keyed by the two team ids directly.
[ApiController]
[Route("api/match")]
public sealed class MatchController(GameSession session) : ControllerBase
{
    [HttpGet("{homeTeamId}/{awayTeamId}")]
    public ActionResult<MatchDetail> Simulate(uint homeTeamId, uint awayTeamId)
    {
        return session.SimulateTeamMatch(homeTeamId, awayTeamId);
    }
}
