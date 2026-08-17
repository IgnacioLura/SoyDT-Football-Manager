using SoyDT.Domain;

namespace SoyDT.Engine;

/// DT random events — every completed matchday fires one of a fixed
/// 3-entry catalog (investor, player hot streak, staff experiment), each
/// resolving 50/50 and applying a 2-match OVR/morale buff or debuff.
/// Entirely a .NET-side ledger: never reads or writes real engine
/// finances/CA/morale — see
/// docs/superpowers/specs/2026-08-16-dt-random-events-design.md. State is
/// read under `_writeGate` (see GameSession.cs) since it's a plain mutable
/// CLR list shared across threads, unlike the read paths that only ever
/// touch the immutable published native handle.
public sealed partial class GameSession
{
    private const double DtEventTriggerChance = 1.0;
    private const int DtBuffDurationMatches = 2;

    private sealed record DtEventDefinition(
        string Id,
        string Name,
        string SuccessText,
        string FailureText,
        string Scope,
        int SuccessOvrDelta,
        int SuccessMoraleDelta,
        int FailureOvrDelta,
        int FailureMoraleDelta);

    private sealed class DtActiveBuffState
    {
        public required string Scope;
        public uint? PlayerId;
        public string? PlayerName;
        public int OvrDelta;
        public int MoraleDelta;
        public int MatchesRemaining;
    }

    // {player} is replaced with the resolved player's name at trigger time
    // for "Player"-scope entries; ignored for "Team"-scope entries.
    private static readonly DtEventDefinition[] DtEventCatalog =
    [
        new(
            "investor",
            "Inversor extranjero",
            "Un grupo inversor extranjero pone plata en el club — el plantel llega con la moral por las nubes.",
            "El acuerdo con el grupo inversor se cae en el último momento y deja una cláusula desfavorable — el plantel queda golpeado.",
            "Team",
            SuccessOvrDelta: 3, SuccessMoraleDelta: 10,
            FailureOvrDelta: -3, FailureMoraleDelta: -10),
        new(
            "hot_streak",
            "Racha de un jugador",
            "{player} está que arde en los entrenamientos — rinde a otro nivel.",
            "{player} perdió la chispa esta semana — se lo nota bajoneado.",
            "Player",
            SuccessOvrDelta: 8, SuccessMoraleDelta: 5,
            FailureOvrDelta: -8, FailureMoraleDelta: -5),
        new(
            "staff_experiment",
            "El cuerpo técnico prueba algo nuevo",
            "El cuerpo técnico prueba una rutina nueva y el plantel responde de diez.",
            "La rutina nueva del cuerpo técnico no cayó bien — hay quejas en el vestuario.",
            "Team",
            SuccessOvrDelta: 2, SuccessMoraleDelta: 8,
            FailureOvrDelta: 0, FailureMoraleDelta: -8),
    ];

    private readonly Random _dtEventRng = new();
    private readonly List<DtEventLogEntryDto> _dtEventLog = [];
    private readonly List<DtActiveBuffState> _dtActiveBuffs = [];
    private uint _dtLastCompletedMatchCount;

    // Guards only the DT-events ledger (`_dtEventLog`/`_dtActiveBuffs`/
    // `_dtLastCompletedMatchCount`) — deliberately separate from
    // `_writeGate`, which is held for a whole `ProcessDays`/
    // `ProcessDaysWithProgress` call (potentially minutes). `AdvanceDtEvents`
    // and `ResetDtEvents` are always called from inside `_writeGate` already,
    // so this is a strictly-nested lock (never taken in a different order
    // elsewhere) — no deadlock risk. `GetDtEvents()` only needs this cheap
    // lock, held for microseconds, instead of blocking on `_writeGate` for
    // the duration of an in-flight multi-day process.
    private readonly Lock _dtEventsLock = new();

    /// Called from `CreateNewGame` — a fresh world has no matches played
    /// yet, so any carried-over event state would be stale.
    private void ResetDtEvents()
    {
        lock (_dtEventsLock)
        {
            _dtEventLog.Clear();
            _dtActiveBuffs.Clear();
            _dtLastCompletedMatchCount = 0;
        }
    }

    /// Called after each engine day-advance, with the still-unpublished
    /// `working` handle — reads straight from it (not `WithGame`, which
    /// only ever sees the published `_current`) so
    /// `ProcessDaysWithProgress`'s per-day loop, which publishes once at
    /// the very end, still sees each day's real match completions as they
    /// happen rather than only the final state. `matchesThisCall` is the
    /// world-wide match count from this same `ProcessDays` tick — a cheap
    /// pre-filter to skip the schedule fetch entirely on days with
    /// provably zero matches anywhere; the completed-count comparison
    /// below remains the source of truth for whether THIS team advanced.
    private void AdvanceDtEvents(NativeGameEngine engine, GameHandleSafeHandle working, ulong matchesThisCall)
    {
        if (matchesThisCall == 0) return;
        if (_myClubId is not { } clubId) return;

        var schedule = engine.GetTeamSchedule(working, clubId);
        var completedCount = (uint)schedule.Count(m => m.HomeGoals.HasValue && m.AwayGoals.HasValue);

        lock (_dtEventsLock)
        {
            // Season rollover: the league schedule gets replaced wholesale
            // at season end, so `completedCount` can drop back to 0 (or a
            // small number) even though matches keep being played. Without
            // this reset, the stale (larger) `_dtLastCompletedMatchCount`
            // would permanently block the early-return guard below.
            if (completedCount < _dtLastCompletedMatchCount)
            {
                _dtLastCompletedMatchCount = 0;
            }
            if (completedCount <= _dtLastCompletedMatchCount) return;

            for (var matchday = _dtLastCompletedMatchCount + 1; matchday <= completedCount; matchday++)
            {
                DecayDtBuffs();
                MaybeTriggerDtEvent(engine, working, clubId, (int)matchday);
            }

            _dtLastCompletedMatchCount = completedCount;
        }
    }

    private void DecayDtBuffs()
    {
        foreach (var buff in _dtActiveBuffs)
        {
            buff.MatchesRemaining--;
        }
        _dtActiveBuffs.RemoveAll(b => b.MatchesRemaining <= 0);
    }

    private void MaybeTriggerDtEvent(NativeGameEngine engine, GameHandleSafeHandle working, uint clubId, int matchday)
    {
        if (_dtEventRng.NextDouble() >= DtEventTriggerChance) return;

        var definition = DtEventCatalog[_dtEventRng.Next(DtEventCatalog.Length)];
        var success = _dtEventRng.NextDouble() < 0.5;

        uint? playerId = null;
        string? playerName = null;
        if (definition.Scope == "Player")
        {
            var team = engine.GetTeam(working, clubId);
            if (team.Players.Count == 0) return;
            var picked = team.Players[_dtEventRng.Next(team.Players.Count)];
            playerId = picked.Id;
            playerName = picked.Name;
        }

        var rawText = success ? definition.SuccessText : definition.FailureText;
        var storyText = playerName is not null ? rawText.Replace("{player}", playerName) : rawText;
        var ovrDelta = success ? definition.SuccessOvrDelta : definition.FailureOvrDelta;
        var moraleDelta = success ? definition.SuccessMoraleDelta : definition.FailureMoraleDelta;

        _dtEventLog.Insert(0, new DtEventLogEntryDto(
            definition.Id, definition.Name, storyText, success, matchday, definition.Scope, playerId, playerName, ovrDelta, moraleDelta));

        _dtActiveBuffs.Add(new DtActiveBuffState
        {
            Scope = definition.Scope,
            PlayerId = playerId,
            PlayerName = playerName,
            OvrDelta = ovrDelta,
            MoraleDelta = moraleDelta,
            MatchesRemaining = DtBuffDurationMatches,
        });
    }

    /// Appends a "daily AI event" entry to the same ledger as the matchday
    /// catalog above — see `docs/superpowers/specs/2026-08-16-dt-random-events-design.md`'s
    /// addendum. Unlike the catalog events, this fires once per calendar day
    /// (from `GameController.ProcessLive`'s per-day progress callback —
    /// called synchronously, so the LLM call that produces `storyText`/
    /// `moraleDelta` runs and completes under `_writeGate` before that
    /// day's processing is considered done; see `TriggerDailyAiEvent`'s doc
    /// comment for why blocking here is intentional) rather than per
    /// completed matchday, and never creates a `DtActiveBuff` — v1 has no
    /// consumer for this delta beyond the log itself, same as the
    /// catalog's `MoraleDelta` today. `day` is this run's cumulative
    /// days-processed count, not a real matchday number — the field is
    /// reused loosely since `DtEventLogEntryDto` has no day-count field of
    /// its own.
    public void RecordDailyAiEvent(uint playerId, string playerName, string storyText, int moraleDelta, int day)
    {
        lock (_dtEventsLock)
        {
            _dtEventLog.Insert(0, new DtEventLogEntryDto(
                "daily_ai", "Evento del día", storyText, moraleDelta >= 0, day, "Player", playerId, playerName, OvrDelta: 0, moraleDelta));
        }
    }

    /// Reads under `_dtEventsLock` — `_dtEventLog`/`_dtActiveBuffs` are
    /// plain mutable lists mutated under that same dedicated lock by
    /// `AdvanceDtEvents`/`ResetDtEvents`, so a concurrent GET needs it too
    /// to avoid a torn read. Deliberately NOT `_writeGate`: that lock is
    /// held for a whole `ProcessDays`/`ProcessDaysWithProgress` call, and
    /// this read should never block on that.
    public DtEventsResponseDto GetDtEvents()
    {
        lock (_dtEventsLock)
        {
            return new DtEventsResponseDto(
                _dtEventLog.ToList(),
                _dtActiveBuffs
                    .Select(b => new DtActiveBuffDto(b.Scope, b.PlayerId, b.PlayerName, b.OvrDelta, b.MoraleDelta, b.MatchesRemaining))
                    .ToList());
        }
    }
}
