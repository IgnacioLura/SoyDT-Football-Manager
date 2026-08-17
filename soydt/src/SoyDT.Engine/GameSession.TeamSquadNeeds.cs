using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the team-squad-needs accessor via the shared `WithGame` helper rather
/// than editing the shared file.
public sealed partial class GameSession
{
    public TeamSquadNeeds GetTeamSquadNeeds(uint teamId) => WithGame((e, h) => e.GetTeamSquadNeeds(h, teamId));
}
