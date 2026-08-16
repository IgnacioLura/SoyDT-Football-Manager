using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Mirrors the original app's `/api/watchlist/*` routes
/// (`web/src/watchlist/mod.rs`) — a plain player-id list living on
/// `SimulatorData.watchlist`, mutated directly rather than through a
/// separate persistence layer (same as the original).
[ApiController]
[Route("api/watchlist")]
public sealed class WatchlistController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<WatchlistPlayer>> Get() => session.GetWatchlist().ToList();

    [HttpPost("{playerId}")]
    public ActionResult Add(uint playerId)
    {
        session.WatchlistAdd(playerId);
        return Ok();
    }

    [HttpDelete("{playerId}")]
    public ActionResult Remove(uint playerId)
    {
        session.WatchlistRemove(playerId);
        return Ok();
    }
}
