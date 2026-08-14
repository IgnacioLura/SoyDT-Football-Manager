using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public PlayerContract? GetPlayerContract(uint playerId) => WithGame((e, h) => e.GetPlayerContract(h, playerId));
}
