using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team season stats — new sibling file to GameSession.cs, uses the shared
/// `WithGame` helper there instead of duplicating the lock/null-check
/// boilerplate.
public sealed partial class GameSession
{
    public IReadOnlyList<TeamPlayerStatsRow> GetTeamStats(uint teamId) =>
        WithGame((e, h) => e.GetTeamStats(h, teamId));
}
