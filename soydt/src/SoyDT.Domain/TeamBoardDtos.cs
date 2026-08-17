namespace SoyDT.Domain;

/// Mirrors `engine_get_team_board`'s `data` payload (see
/// engine-ffi/CONTRACT.md). A simplified steady-state snapshot of a club's
/// board-of-directors status — no internal component-score breakdown, no
/// manager hiring-market/shortlist fields, no live transfer-proposal
/// fields, no facility-review state. See
/// docs/superpowers/specs/2026-08-17-club-board-design.md for scope
/// rationale.
public sealed record BoardPromise(
    string PromiseType,
    string DueDate,
    bool Overdue);

public sealed record SeasonTargets(
    int TransferBudget,
    int WageBudget,
    byte MaxSquadSize,
    byte MinSquadSize,
    byte ExpectedPosition,
    byte MinAcceptablePosition);

public sealed record TeamBoard(
    int ConfidenceLevel,
    string Mood,
    bool ManagerOnFinalWarning,
    byte PoorMoodMonths,
    string ChairmanAmbition,
    string ChairmanPatience,
    byte ChairmanManagerLoyalty,
    string OwnershipType,
    byte OwnershipWealth,
    byte OwnershipInterference,
    byte OwnershipRiskTolerance,
    byte OwnershipExitPressure,
    byte SupporterPressure,
    byte MediaPressure,
    byte DressingRoomPressure,
    byte FinancialPressure,
    byte RegulatoryPressure,
    byte TrustResults,
    byte TrustFinances,
    byte TrustSquadBuilding,
    byte TrustCommunication,
    byte StyleAlignment,
    SeasonTargets? SeasonTargets,
    string VisionPlayingStyle,
    string VisionYouthFocus,
    string VisionSigningPreference,
    string VisionFinancialStance,
    string? VisionLongTermGoal,
    byte VisionLongTermHorizonSeasons,
    IReadOnlyList<BoardPromise> Promises,
    string TakeoverStatus,
    byte TakeoverMonthsInStatus);
