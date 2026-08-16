using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs `cups/get.html` + `cups/history.html` — domestic knockout cups
/// (`Country::domestic_cup`, e.g. "Copa Argentina").
[ApiController]
[Route("api/cups")]
public sealed class CupsController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<CupListItem>> List() => session.GetCups().ToList();

    [HttpGet("{cupId}")]
    public ActionResult<CupBracket> Get(uint cupId) => session.GetCupBracket(cupId);
}
