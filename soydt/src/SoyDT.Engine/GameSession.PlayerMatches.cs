using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-matches wrapper — see GameSession.cs for the shared `WithGame`
/// helper this sibling file uses.
public sealed partial class GameSession
{
    public IReadOnlyList<PlayerMatchItem> GetPlayerMatches(uint playerId) =>
        WithGame((e, h) => e.GetPlayerMatches(h, playerId));
}
