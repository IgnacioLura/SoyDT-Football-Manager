namespace SoyDT.Domain;

/// Team relations page (SIMPLIFIED — see engine-ffi/CONTRACT.md). The
/// original app renders an interactive force-directed social graph of every
/// player-to-player relationship in the squad; this is a flat, same-team-only
/// pair list with a 4-tier classification instead.
public sealed record RelationPair(uint PlayerAId, string PlayerAName, uint PlayerBId, string PlayerBName, string Tier, float Level);

public sealed record TeamRelations(int BondCount, int FriendlyCount, int TensionCount, int RivalryCount, IReadOnlyList<RelationPair> Pairs);
