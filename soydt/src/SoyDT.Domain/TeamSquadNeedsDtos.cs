namespace SoyDT.Domain;

/// Mirrors `engine_get_team_squad_needs`'s `data` payload (see
/// engine-ffi/CONTRACT.md) — a pure snapshot of how short a club's main
/// team is against fixed per-position-group minimums.
public sealed record TeamSquadNeeds(
    int MainTeamSize,
    int TotalMissing,
    bool Urgent,
    int GkCount,
    int GkMissing,
    int DefCount,
    int DefMissing,
    int MidCount,
    int MidMissing,
    int FwdCount,
    int FwdMissing);
