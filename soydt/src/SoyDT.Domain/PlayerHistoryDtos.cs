namespace SoyDT.Domain;

/// One completed-season row on the (simplified) Player History page.
/// Backed by `engine_get_player_history` — see engine-ffi/CONTRACT.md.
///
/// SIMPLIFIED vs the original app's History tab: this is a flat list of
/// League-kind season_ledger rows only. Dropped: the per-competition
/// breakdown accordion, the live/in-progress-season merge, domestic-cup
/// rows, friendly rows, and per-season transfer fee.
public sealed record PlayerHistoryRow(
    string Season,
    string TeamName,
    ushort Played,
    ushort Goals,
    ushort Assists,
    float AverageRating);
