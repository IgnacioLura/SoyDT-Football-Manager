namespace SoyDT.Domain;

/// One entry in a player's career event log — mirrors the original app's
/// `open-football/src/web/src/player/events` tab (SIMPLIFIED: flat list of
/// only transfers, awards, and injury-recovery swings, no decision cards,
/// severity styling, or partner links — see MIGRATION_CHECKLIST.md).
/// `Kind` is one of "transfer" | "award" | "injury".
public sealed record PlayerEventItem(string Date, string Kind, string Description);
