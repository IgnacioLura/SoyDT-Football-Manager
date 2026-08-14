using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the team-academy accessor via the shared `WithGame` helper rather than
/// editing the shared file.
public sealed partial class GameSession
{
    public TeamAcademy GetTeamAcademy(uint teamId) => WithGame((e, h) => e.GetTeamAcademy(h, teamId));
}
