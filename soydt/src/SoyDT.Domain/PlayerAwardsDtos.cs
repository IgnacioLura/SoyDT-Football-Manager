namespace SoyDT.Domain;

/// Mirrors `engine_get_player_awards`'s `data` payload (see
/// engine-ffi/CONTRACT.md). SIMPLIFIED career awards summary — flat
/// lifetime counters only; no per-league grouping/blocks and no 12-month
/// bar chart (both present in the original app's Awards tab, dropped here
/// per the Phase 1 scope).
public sealed record PlayerAwardsSummary(
    ushort PlayerOfTheWeek,
    ushort YoungPlayerOfTheWeek,
    ushort TeamOfTheWeek,
    ushort YoungTeamOfTheWeek,
    ushort PlayerOfTheMonth,
    ushort YoungPlayerOfTheMonth,
    ushort TeamOfTheMonth,
    ushort YoungTeamOfTheMonth,
    ushort TeamOfTheSeason,
    ushort TeamOfTheYear,
    ushort PlayerOfTheSeason,
    ushort YoungPlayerOfTheSeason,
    ushort LeagueTopScorer,
    ushort LeagueTopAssists,
    ushort LeagueGoldenGlove,
    ushort ContinentalPlayerOfYear,
    ushort WorldPlayerOfYear,
    ushort DomesticCupWinner,
    uint Total);
