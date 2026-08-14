using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Simplified player history page: a flat list of completed-season League
/// rows, backed by `engine_get_player_history`. See
/// SoyDT.Domain/PlayerHistoryDtos.cs and engine-ffi/src/player_history.rs
/// for what was dropped versus the original app's History tab (competition
/// breakdown accordion, live-season merge, transfer fee).
[ApiController]
[Route("api/players")]
public sealed class PlayerHistoryController(GameSession session) : ControllerBase
{
    [HttpGet("{playerId}/history")]
    public ActionResult<IReadOnlyList<PlayerHistoryRow>> History(uint playerId)
    {
        return Ok(session.GetPlayerHistory(playerId));
    }
}
