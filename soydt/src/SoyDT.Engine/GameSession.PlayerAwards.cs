using SoyDT.Domain;

namespace SoyDT.Engine;

/// Sibling partial to `GameSession.cs` — kept in its own file to avoid
/// touching the file other workers are editing.
public sealed partial class GameSession
{
    public PlayerAwardsSummary GetPlayerAwards(uint playerId) =>
        WithGame((e, h) => e.GetPlayerAwards(h, playerId));
}
