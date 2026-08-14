using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Player contract sub-tab (mirrors the original app's player contract
/// view). Simplified scope: core contract terms only — loan sub-detail,
/// bonuses, and clauses are omitted (see MIGRATION_CHECKLIST.md). Read-only,
/// backed by `engine_get_player_contract`. Returns `null` (204) when the
/// player has no active contract.
[ApiController]
[Route("api/players")]
public sealed class PlayerContractController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/contract")]
    public ActionResult<PlayerContract?> Contract(uint playerId)
    {
        return Ok(session.GetPlayerContract(playerId));
    }
}
