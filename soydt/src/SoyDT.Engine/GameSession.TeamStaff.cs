using SoyDT.Domain;

namespace SoyDT.Engine;

/// Sibling file to GameSession.cs — adds the club team staff roster
/// accessor via the shared `WithGame` helper.
public sealed partial class GameSession
{
    public IReadOnlyList<TeamStaffMember> GetTeamStaff(uint teamId) => WithGame((e, h) => e.GetTeamStaff(h, teamId));
}
