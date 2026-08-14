using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public IReadOnlyList<PlayerHistoryRow> GetPlayerHistory(uint playerId) => WithGame((e, h) => e.GetPlayerHistory(h, playerId));
}
