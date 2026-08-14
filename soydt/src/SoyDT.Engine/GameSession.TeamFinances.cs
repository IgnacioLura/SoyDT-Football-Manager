using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the team-finances accessor via the shared `WithGame` helper rather than
/// editing the shared file.
public sealed partial class GameSession
{
    public TeamFinances GetTeamFinances(uint teamId) => WithGame((e, h) => e.GetTeamFinances(h, teamId));
}
