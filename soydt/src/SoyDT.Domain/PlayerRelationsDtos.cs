namespace SoyDT.Domain;

/// Player relations page (SIMPLIFIED — see engine-ffi/CONTRACT.md). The
/// original app renders an interactive force-directed "ego web" of one
/// player and their teammates; this is a flat list of that player's
/// strongest 1-3 same-team relationships with a 4-tier classification
/// instead, mirroring `TeamRelationsDtos.cs` but scoped to one player.
public sealed record PlayerRelation(uint OtherPlayerId, string OtherPlayerName, string Tier, float Level);

public sealed record PlayerRelations(
    uint PlayerId,
    string PlayerName,
    int BondCount,
    int FriendlyCount,
    int TensionCount,
    int RivalryCount,
    IReadOnlyList<PlayerRelation> Relations);
