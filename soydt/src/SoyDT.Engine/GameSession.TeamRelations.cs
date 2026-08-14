using SoyDT.Domain;

namespace SoyDT.Engine;

/// Sibling file to GameSession.cs — adds the team relations accessor via
/// the shared `WithGame` helper.
public sealed partial class GameSession
{
    public TeamRelations GetTeamRelations(uint teamId) => WithGame((e, h) => e.GetTeamRelations(h, teamId));
}
