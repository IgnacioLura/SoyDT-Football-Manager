using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: league detail/table page (mirrors the original app's
/// `/{lang}/leagues/{slug}` route). Read-only, backed by
/// `engine_get_league_table`.
[ApiController]
[Route("api/leagues")]
public sealed class LeaguesController(GameSession session) : ControllerBase
{
    [HttpGet("{leagueId}/table")]
    public ActionResult<LeagueTable> Table(uint leagueId)
    {
        return Ok(session.GetLeagueTable(leagueId));
    }

    [HttpGet("{leagueId}/transfers")]
    public ActionResult<IReadOnlyList<CompletedTransfer>> Transfers(uint leagueId)
    {
        return Ok(session.GetLeagueTransfers(leagueId));
    }

    [HttpGet("{leagueId}/awards")]
    public ActionResult<SeasonAwards?> Awards(uint leagueId)
    {
        return Ok(session.GetLeagueAwards(leagueId));
    }
}
