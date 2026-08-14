using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-transfers export — see GameSession.cs's `WithGame` helper doc
/// comment for the pattern this file follows.
public sealed partial class GameSession
{
    public IReadOnlyList<PlayerTransferItem> GetPlayerTransfers(uint playerId) =>
        WithGame((e, h) => e.GetPlayerTransfers(h, playerId));
}
