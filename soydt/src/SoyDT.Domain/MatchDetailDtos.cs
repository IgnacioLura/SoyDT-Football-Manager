namespace SoyDT.Domain;

/// Mirrors one entry of `engine_simulate_team_match`'s `data.goals` array.
public sealed record MatchGoal(uint PlayerId, bool IsHome, ulong Minute, bool IsAutoGoal);

/// Mirrors one entry of `engine_simulate_team_match`'s `data.injuries` array.
public sealed record MatchInjury(uint PlayerId, bool IsHome, ulong Minute);

/// Mirrors one entry of `engine_simulate_team_match`'s `data.cards` array.
public sealed record MatchCard(uint PlayerId, bool IsHome, string CardType);

/// Mirrors one entry of `engine_simulate_team_match`'s `data.substitutions` array.
public sealed record MatchSubstitution(uint PlayerOutId, uint PlayerInId, bool IsHome, ulong Minute);

/// Downsampled (~500ms interval) ball/player positions — each sample is
/// `[timestampMs, x, y]`. `Players` is keyed by player id as a string (the
/// Rust side builds a JSON object, not an array, since ids aren't dense).
public sealed record MatchPositionData(
    IReadOnlyList<double[]> Ball,
    IReadOnlyDictionary<string, double[][]> Players);

/// Mirrors `engine_simulate_team_match`'s `data` payload — a fresh
/// simulation of the two teams' current squads, not a replay of a
/// specific historical fixture (see MIGRATION_CHECKLIST.md's Fase 2 note).
public sealed record MatchDetail(
    byte HomeGoals,
    byte AwayGoals,
    float HomePossessionPercentage,
    IReadOnlyList<MatchGoal> Goals,
    IReadOnlyList<MatchInjury> Injuries,
    IReadOnlyList<MatchCard> Cards,
    IReadOnlyList<MatchSubstitution> Substitutions,
    IReadOnlyList<uint> HomePlayerIds,
    IReadOnlyList<uint> AwayPlayerIds,
    MatchPositionData? PositionData);
