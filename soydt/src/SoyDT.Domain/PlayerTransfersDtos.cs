namespace SoyDT.Domain;

/// One completed transfer in a player's own career history — mirrors the
/// original app's player transfer-market page (SIMPLIFIED: history only,
/// no live listing status/negotiations/monitoring — see
/// MIGRATION_CHECKLIST.md). Player/team ids are omitted since this is
/// already scoped to one player and the from/to teams are display-only
/// here (unlike the league-wide `CompletedTransfer` DTO).
public sealed record PlayerTransferItem(string FromTeamName, string ToTeamName, double Fee, bool IsLoan, bool IsFree, string Date);
