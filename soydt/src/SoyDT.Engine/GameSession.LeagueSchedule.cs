using SoyDT.Domain;

namespace SoyDT.Engine;

/// League-schedule wrapper — see GameSession.cs for the shared `WithGame`
/// helper this sibling file uses.
public sealed partial class GameSession
{
    public IReadOnlyList<LeagueScheduleItem> GetLeagueSchedule(uint leagueId) =>
        WithGame((e, h) => e.GetLeagueSchedule(h, leagueId));
}
