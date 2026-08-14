namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_team_stats`'s `data` array — one row
/// per squad player's season statistics. Backs the React "Team Stats" page.
/// `AverageRating` is a display-ready plain-mean string (see
/// `PlayerStatistics::display_average_rating` in engine-ffi/open-football —
/// deliberately not a sortable numeric judgement value; rows arrive from
/// the engine pre-sorted by `Played` descending).
public sealed record TeamPlayerStatsRow(
    uint PlayerId,
    string Name,
    string Position,
    ushort Played,
    ushort PlayedSubs,
    ushort Goals,
    ushort Assists,
    byte YellowCards,
    byte RedCards,
    float ShotsOnTarget,
    byte Passes,
    float Tackling,
    string AverageRating);
