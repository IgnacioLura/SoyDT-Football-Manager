using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Mirrors the original app's `/api/search?q=...` route
/// (`web/src/search/mod.rs`) — cross-entity substring search over
/// countries/clubs/players.
[ApiController]
[Route("api/search")]
public sealed class SearchController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<SearchResults> Get([FromQuery] string q) => session.Search(q ?? "");
}
