namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public string AiGetClub(uint clubId) => WithGame((e, h) => e.AiGetClub(h, clubId));
    public string AiGetClubPlayers(uint clubId) => WithGame((e, h) => e.AiGetClubPlayers(h, clubId));
    public string AiGetPlayer(uint playerId) => WithGame((e, h) => e.AiGetPlayer(h, playerId));
}
