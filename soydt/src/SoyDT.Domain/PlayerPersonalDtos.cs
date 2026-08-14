namespace SoyDT.Domain;

/// One language the player speaks, with proficiency (0-100, 100 = native
/// fluency) and whether it's a native tongue.
public sealed record PlayerLanguage(string Name, byte Proficiency, bool IsNative);

/// Player "Personal" tab — attributes/personality/morale/reputation.
/// Simplified scope: no SVG radar-chart geometry (raw trait values only),
/// no manager-relationship cross-lookup, no favorite clubs (see
/// MIGRATION_CHECKLIST.md). Backed by `engine_get_player_personal`.
public sealed record PlayerPersonal(
    string PreferredFoot,
    float Leadership,
    float Determination,
    float WorkRate,
    byte ConditionPct,
    byte FitnessPct,
    short CurrentReputation,
    short HomeReputation,
    short WorldReputation,
    float Adaptability,
    float Ambition,
    float Controversy,
    float Loyalty,
    float Pressure,
    float Professionalism,
    float Sportsmanship,
    float Temperament,
    float Morale,
    IReadOnlyList<PlayerLanguage> Languages);
