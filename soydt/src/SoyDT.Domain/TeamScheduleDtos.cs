namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_team_schedule`'s `data` array — see
/// engine-ffi/CONTRACT.md. `HomeGoals`/`AwayGoals` are present only once the
/// fixture has been played.
public sealed record TeamScheduleItem(
    string Date,
    string Time,
    uint OpponentTeamId,
    string OpponentName,
    string OpponentSlug,
    bool IsHome,
    string CompetitionName,
    string MatchId,
    byte? HomeGoals,
    byte? AwayGoals);
