using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team tactics — new sibling file to GameSession.cs, uses the shared
/// `WithGame` helper there instead of duplicating the lock/null-check
/// boilerplate.
public sealed partial class GameSession
{
    public TeamTactics GetTeamTactics(uint teamId) => WithGame((e, h) => e.GetTeamTactics(h, teamId));
}
