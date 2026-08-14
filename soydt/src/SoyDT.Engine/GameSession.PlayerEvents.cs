using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-events export — see GameSession.cs's `WithGame` helper doc
/// comment for the pattern this file follows.
public sealed partial class GameSession
{
    public IReadOnlyList<PlayerEventItem> GetPlayerEvents(uint playerId) =>
        WithGame((e, h) => e.GetPlayerEvents(h, playerId));
}
