using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Backs the DT transfers page's manual buy/sell action — distinct from
/// the existing read-only `TeamTransfersController` (transfer history).
/// See engine-ffi/src/team_transfer_action.rs.
[ApiController]
[Route("api/transfers")]
public sealed class TeamTransferActionController(GameSession session) : ControllerBase
{
    [HttpPost]
    public ActionResult<TransferActionResult> Transfer([FromBody] TransferActionRequest body)
    {
        return session.TransferPlayer(body.PlayerId, body.FromTeamId, body.ToTeamId, body.Fee);
    }
}
