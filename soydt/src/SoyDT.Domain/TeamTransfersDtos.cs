namespace SoyDT.Domain;

/// One completed transfer involving a team, from that team's point of view
/// (the "other side" is folded into a single `OtherTeamName` since the
/// incoming/outgoing split already conveys direction — see
/// `engine_get_team_transfers` in engine-ffi).
public sealed record TeamTransferItem(uint PlayerId, string PlayerName, string OtherTeamName, string OtherTeamSlug, double Fee, bool IsLoan, bool IsFree, string Date);

/// Incoming/outgoing completed transfers for one team. Simplified from the
/// original template's four-panel (permanent/loan x in/out) + season
/// selector layout down to two combined panels with no season filter.
public sealed record TeamTransfers(IReadOnlyList<TeamTransferItem> Incoming, IReadOnlyList<TeamTransferItem> Outgoing);
