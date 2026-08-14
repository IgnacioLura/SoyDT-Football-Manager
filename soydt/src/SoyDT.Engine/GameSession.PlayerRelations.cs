using SoyDT.Domain;

namespace SoyDT.Engine;

/// Sibling file to GameSession.cs — adds the player relations accessor via
/// the shared `WithGame` helper.
public sealed partial class GameSession
{
    public PlayerRelations GetPlayerRelations(uint playerId) => WithGame((e, h) => e.GetPlayerRelations(h, playerId));
}
