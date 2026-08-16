using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs `champions-league`, `europa-league`, `conference-league`,
/// `copa-libertadores` index pages — one route parameterized by
/// competition slug since all four share the same shape on `core` (see
/// engine-ffi/src/continental.rs). In this app's scoped world (AR/UY/BR),
/// only `copa-libertadores` has real data — the UEFA competitions are
/// structurally present but always empty (no European clubs in scope).
[ApiController]
[Route("api/continental")]
public sealed class ContinentalController(GameSession session) : ControllerBase
{
    private static readonly HashSet<string> ValidCompetitions =
        ["champions_league", "europa_league", "conference_league", "copa_libertadores"];

    [HttpGet("{competition}")]
    public ActionResult<ContinentalCompetition> Get(string competition)
    {
        if (!ValidCompetitions.Contains(competition))
        {
            return BadRequest(new { code = "unknown_competition", message = $"'{competition}' is not a known continental competition" });
        }
        return session.GetContinentalCompetition(competition);
    }
}
