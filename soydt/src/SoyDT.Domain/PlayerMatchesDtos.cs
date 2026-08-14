namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_player_matches`'s `data` array — see
/// engine-ffi/CONTRACT.md. Simplification: this is the player's current
/// team's domestic **league** schedule, not gated on the player having
/// actually appeared in each match, and not merged with cup/continental/
/// international fixtures. `HomeGoals`/`AwayGoals` are present only once
/// the fixture has been played.
public sealed record PlayerMatchItem(
    string Date,
    string OpponentName,
    bool IsHome,
    string CompetitionName,
    byte? HomeGoals,
    byte? AwayGoals);
