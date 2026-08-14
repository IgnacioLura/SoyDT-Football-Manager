using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public MatchDetail SimulateTeamMatch(uint homeTeamId, uint awayTeamId) =>
        WithGame((e, h) => e.SimulateTeamMatch(h, homeTeamId, awayTeamId));
}
