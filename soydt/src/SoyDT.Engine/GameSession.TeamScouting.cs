using SoyDT.Domain;

namespace SoyDT.Engine;

/// Sibling file to GameSession.cs — adds the team scouting monitoring-list
/// accessor via the shared `WithGame` helper.
public sealed partial class GameSession
{
    public IReadOnlyList<ScoutMonitoringItem> GetTeamScouting(uint teamId) => WithGame((e, h) => e.GetTeamScouting(h, teamId));
}
