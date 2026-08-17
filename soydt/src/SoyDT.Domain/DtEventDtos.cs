namespace SoyDT.Domain;

/// One resolved DT random event — see
/// docs/superpowers/specs/2026-08-16-dt-random-events-design.md. `Scope` is
/// "Team" or "Player"; `PlayerId`/`PlayerName` are only set when `Scope` is
/// "Player". Purely a .NET-side ledger entry — never touches real engine
/// state (finances/CA/morale).
public sealed record DtEventLogEntryDto(
    string EventId,
    string Name,
    string StoryText,
    bool Success,
    int Matchday,
    string Scope,
    uint? PlayerId,
    string? PlayerName,
    int OvrDelta,
    int MoraleDelta);

/// A currently-active OVR/morale modifier from a resolved event, still
/// counting down. `Scope`/`PlayerId`/`PlayerName` mirror
/// <see cref="DtEventLogEntryDto"/> — "Team" buffs apply to every player,
/// "Player" buffs apply only to the named one.
public sealed record DtActiveBuffDto(
    string Scope,
    uint? PlayerId,
    string? PlayerName,
    int OvrDelta,
    int MoraleDelta,
    int MatchesRemaining);

/// `GET /api/dt/events` response — full history (newest first) plus
/// whatever buffs are still counting down.
public sealed record DtEventsResponseDto(
    IReadOnlyList<DtEventLogEntryDto> Log,
    IReadOnlyList<DtActiveBuffDto> ActiveBuffs);
