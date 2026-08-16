using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public IReadOnlyList<LineupPlayer> GetTeamLineup(uint teamId) => WithGame((e, h) => e.GetTeamLineup(h, teamId));

    public void SetTeamLineup(uint teamId, IReadOnlyList<uint> playerIds) =>
        MutateGame((e, h) => e.SetTeamLineup(h, teamId, playerIds));
}
