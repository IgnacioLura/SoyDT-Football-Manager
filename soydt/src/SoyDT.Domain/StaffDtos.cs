namespace SoyDT.Domain;

/// Coaching attribute block (0-20 scale) — mirrors `engine-ffi`'s `CoachingJson`.
public sealed record StaffCoaching(
    byte Attacking,
    byte Defending,
    byte Fitness,
    byte Mental,
    byte Tactical,
    byte Technical,
    byte WorkingWithYoungsters);

/// Mental attribute block (0-20 scale) — mirrors `StaffMentalJson`.
public sealed record StaffMental(
    byte Adaptability,
    byte Determination,
    byte Discipline,
    byte ManManagement,
    byte Motivating);

/// Knowledge attribute block (0-20 scale) — mirrors `StaffKnowledgeJson`.
public sealed record StaffKnowledge(
    byte JudgingPlayerAbility,
    byte JudgingPlayerPotential,
    byte TacticalKnowledge);

/// Goalkeeping-coaching attribute block (0-20 scale) — mirrors `GoalkeepingCoachingJson`.
public sealed record StaffGoalkeeping(byte Distribution, byte Handling, byte ShotStopping);

/// Medical attribute block (0-20 scale) — mirrors `MedicalJson`.
public sealed record StaffMedicalAttrs(byte Physiotherapy, byte SportsScience);

/// Staff member overview — mirrors the original app's `/{lang}/staff/{slug}`
/// route (overview tab). Simplified scope: no scouting-region/familiarity
/// fields, no data-analysis attribute block (see `engine-ffi/src/staff.rs`).
/// Backed by `engine_get_staff`.
public sealed record StaffDetail(
    uint Id,
    string FirstName,
    string LastName,
    byte Age,
    string BirthDate,
    uint CountryId,
    string CountryCode,
    string CountryName,
    string Role,
    uint TeamId,
    string TeamName,
    uint? Salary,
    string? ContractExpiry,
    StaffCoaching Coaching,
    StaffMental Mental,
    StaffKnowledge Knowledge,
    StaffGoalkeeping Goalkeeping,
    StaffMedicalAttrs Medical);

/// Staff "Personal" sub-tab — coaching style/license, personality, job
/// satisfaction/fatigue, current contract and recent-performance metrics.
/// Simplified scope: no SVG radar-chart geometry, no recent-events feed, no
/// scout-workload/monitoring table (see `engine-ffi/src/staff_personal.rs`).
/// Backed by `engine_get_staff_personal`.
public sealed record StaffPersonal(
    string CoachingStyle,
    string License,
    byte Determination,
    byte ManManagement,
    byte Motivating,
    byte Discipline,
    string Behaviour,
    byte JobSatisfactionPct,
    byte FatiguePct,
    string? Role,
    uint? Salary,
    string? ContractExpiry,
    byte TrainingEffectivenessPct,
    byte PlayerDevelopmentPct,
    byte InjuryPreventionPct,
    byte TacticalImplementationPct,
    float Adaptability,
    float Ambition,
    float Controversy,
    float Loyalty,
    float Pressure,
    float Professionalism,
    float Sportsmanship,
    float Temperament);
