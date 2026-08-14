namespace SoyDT.Domain;

/// One active scouting-monitoring row for a club — mirrors the original
/// app's scouting "monitoring" table, collapsed from that page's six tabs
/// (overview/monitoring/reports/assignments/meetings/database) down to
/// this single "who are our scouts watching right now" list. See
/// `engine-ffi/src/team_scouting.rs` for the export this is deserialized
/// from and for the simplifications made.
public sealed record ScoutMonitoringItem(
    uint PlayerId,
    string PlayerName,
    string Position,
    byte Age,
    string CurrentClubName,
    uint ScoutId,
    string ScoutName,
    string Status,
    string StartedOn,
    string LastObserved,
    ushort TimesWatched,
    byte AssessedAbility,
    byte AssessedPotential,
    byte ConfidencePct,
    double EstimatedValue);
