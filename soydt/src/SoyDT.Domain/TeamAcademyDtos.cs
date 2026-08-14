namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_team_academy`'s `players` array — one
/// row per resident academy player.
public sealed record AcademyPlayer(
    uint PlayerId,
    string Name,
    string Position,
    string Phase,
    byte Age,
    byte CurrentAbility,
    byte PotentialAbility);

/// Mirrors `engine_get_team_academy`'s `data` payload. A simplified youth
/// academy snapshot — no pathway readiness bar/threshold, no at-risk/jaded/
/// injury-prone tags; see `engine-ffi/src/team_academy.rs`'s doc comment.
public sealed record TeamAcademy(
    byte Level,
    byte Tier,
    byte PathwayReputation,
    string DevelopmentIdentity,
    ushort GraduatesProduced,
    ushort FoundationCount,
    ushort DevelopmentCount,
    ushort ProfessionalCount,
    IReadOnlyList<AcademyPlayer> Players);
