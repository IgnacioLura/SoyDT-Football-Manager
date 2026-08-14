namespace SoyDT.Domain;

/// Mirrors `engine_get_team_tactics`'s `data` payload. A simplified view of
/// the team's current tactical plan — formation shape/style plus a
/// freshly-picked best-XI for its 11 slots; no pitch graphic and no
/// last-match-shape/"recently used shapes" history (see
/// `engine-ffi/src/team_tactics.rs`'s doc comment).
public sealed record TeamTactics(
    string FormationName,
    string FormationDescription,
    string TacticalStyle,
    float FormationStrength,
    float PressingIntensity,
    float DefensiveLineHeight,
    float Compactness,
    bool IsAttacking,
    bool IsDefensive,
    IReadOnlyList<TacticsPlayer> Players);

public sealed record TacticsPlayer(
    uint PlayerId,
    string Name,
    string Position,
    byte CurrentAbility);
