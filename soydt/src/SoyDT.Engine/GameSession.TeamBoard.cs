using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the team-board accessor via the shared `WithGame` helper rather than
/// editing the shared file.
public sealed partial class GameSession
{
    public TeamBoard GetTeamBoard(uint teamId) => WithGame((e, h) => e.GetTeamBoard(h, teamId));
}
