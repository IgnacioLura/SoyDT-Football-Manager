using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// DT random events log + active buffs — see
/// docs/superpowers/specs/2026-08-16-dt-random-events-design.md. Read-only:
/// events fire as a side effect of `POST /api/game/process` /
/// `POST /api/game/process/live`, there's no endpoint to trigger one
/// directly.
[ApiController]
[Route("api/dt/events")]
public sealed class DtEventsController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<DtEventsResponseDto> Get()
    {
        return session.GetDtEvents();
    }
}
