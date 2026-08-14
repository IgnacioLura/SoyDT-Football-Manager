namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_league_schedule`'s `data` array — see
/// engine-ffi/CONTRACT.md. `HomeGoals`/`AwayGoals` are present only once the
/// fixture has been played.
public sealed record LeagueScheduleItem(
    string Date,
    string Time,
    uint HomeTeamId,
    string HomeTeamName,
    uint AwayTeamId,
    string AwayTeamName,
    string MatchId,
    byte? HomeGoals,
    byte? AwayGoals);
