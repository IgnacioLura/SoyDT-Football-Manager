using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Player transfers sub-page (SIMPLIFIED: career transfer history only —
/// no live listing status/negotiations/monitoring — see
/// MIGRATION_CHECKLIST.md). Read-only, backed by
/// `engine_get_player_transfers`. New controller so as not to touch
/// PlayersController.cs, which another worker is editing in parallel.
[ApiController]
[Route("api/players")]
public sealed class PlayerTransfersController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/transfers")]
    public ActionResult<IReadOnlyList<PlayerTransferItem>> Transfers(uint playerId)
    {
        return Ok(session.GetPlayerTransfers(playerId));
    }
}
