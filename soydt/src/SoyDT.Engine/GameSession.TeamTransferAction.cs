using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public TransferActionResult TransferPlayer(uint playerId, uint fromTeamId, uint toTeamId, double fee)
    {
        TransferActionResult? result = null;
        MutateGame((e, h) => result = e.TransferPlayer(h, playerId, fromTeamId, toTeamId, fee));
        return result!;
    }
}
