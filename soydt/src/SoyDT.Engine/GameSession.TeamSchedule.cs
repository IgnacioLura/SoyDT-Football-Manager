using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team-schedule wrapper — see GameSession.cs for the shared `WithGame`
/// helper this sibling file uses.
public sealed partial class GameSession
{
    public IReadOnlyList<TeamScheduleItem> GetTeamSchedule(uint teamId) =>
        WithGame((e, h) => e.GetTeamSchedule(h, teamId));
}
