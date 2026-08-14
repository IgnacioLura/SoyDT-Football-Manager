using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-personal wrapper — see GameSession.cs for the shared `WithGame`
/// helper this sibling file uses.
public sealed partial class GameSession
{
    public PlayerPersonal GetPlayerPersonal(uint playerId) => WithGame((e, h) => e.GetPlayerPersonal(h, playerId));
}
