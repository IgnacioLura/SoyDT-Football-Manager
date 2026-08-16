using SoyDT.Domain;

namespace SoyDT.Engine;

/// Holds the one live game handle for this process — mirrors the original
/// Axum app's single global `Arc&lt;RwLock&lt;Option&lt;Arc&lt;SimulatorData&gt;&gt;&gt;&gt;`
/// (no multi-tenancy, no per-user state). Same concurrency shape as the
/// original too: a write (`ProcessDays`/`ProcessDaysWithProgress`) clones
/// the published world into a private working copy, advances it there, then
/// atomically swaps it in — so a slow/long-running day never blocks reads.
/// `GameHandleSafeHandle`'s own ref-counting (`DangerousAddRef`/`Release`)
/// is what makes this safe: a read that grabbed the handle just before a
/// swap keeps using that exact (now-unpublished) instance until it's done;
/// the old handle's native memory is only freed once every such outstanding
/// read has released it. Registered as a singleton in DI.
public sealed partial class GameSession(NativeGameEngine engine)
{
    // Held only for the instant it takes to read or replace the `_current`
    // reference — never around a native call. That's what lets an
    // in-flight write (cloning + simulating a whole day) run fully
    // concurrently with any number of reads against the still-published
    // handle.
    private readonly Lock _swapLock = new();
    private GameHandleSafeHandle? _current;

    // Serializes writes against EACH OTHER — held for a write's entire
    // duration (unlike `_swapLock`), so reads never wait on it. Without
    // this, two concurrent writes (e.g. a stale in-flight `ProcessDays`
    // loop from a game that's since been replaced, plus a fresh
    // `CreateNewGame`) can each capture the same `_current`, clone it, and
    // publish independently — the loser's publish silently overwrites the
    // winner's, which is exactly how a create-new-game-while-processing
    // race could resurrect the OLD world on top of a freshly created one.
    // Wrapping every write's whole body in this lock makes "one write
    // completes before the next one can even start" strictly true, so that
    // can't happen — a `CreateNewGame` called mid-process simply waits for
    // the in-flight write to finish first.
    private readonly Lock _writeGate = new();
    private int _processingFlag;

    // The DT/"Mi Equipo" experience's one piece of session state: which club
    // the local user picked as theirs, for this GameSession's lifetime. Not
    // multi-tenant (matches the rest of this class — one process, one
    // player) — just enough to let `/api/dt/*`-style endpoints know whose
    // team to scope to, and (per this engine's data model) doubles as "my
    // team id" directly: a club's main team shares its numeric id with the
    // club itself (confirmed empirically — e.g. club 1917 "Cerro"'s main
    // team is also id 1917), so no separate club→team resolution exists or
    // is needed.
    private uint? _myClubId;

    public uint? MyClubId
    {
        get { lock (_writeGate) { return _myClubId; } }
    }

    public void SetMyClub(uint clubId)
    {
        lock (_writeGate) { _myClubId = clubId; }
    }

    /// Mirrors the original app's `process_lock.try_lock_owned()` early-out
    /// ("already processing → return immediately" instead of queuing behind
    /// it). `ProcessDaysWithProgress` can legitimately run for a while
    /// (many simulated days); without this, a second `process/live` click
    /// would just block on `_writeGate` until the first finishes and then
    /// run anyway — technically correct now (no more resurrection race) but
    /// still pointless queued work the operator didn't ask for.
    public bool TryStartProcessing() => Interlocked.CompareExchange(ref _processingFlag, 1, 0) == 0;

    public void FinishProcessing() => Interlocked.Exchange(ref _processingFlag, 0);

    /// Snapshots the currently-published handle. Safe to call from any
    /// number of concurrent threads — each caller gets its own ref-counted
    /// hold via `DangerousAddRef` inside the `NativeGameEngine` method it
    /// then calls, so a concurrent swap can't pull the handle out from
    /// under it.
    private GameHandleSafeHandle CaptureCurrent()
    {
        lock (_swapLock)
        {
            return _current ?? throw new EngineException("no_active_game", "no game has been created yet — call create first");
        }
    }

    /// Publishes `next` as the current handle and returns whatever was
    /// published before it (null the very first time). The caller disposes
    /// the returned handle — deferred outside this lock since `Dispose`
    /// only decrements the initial ref-count, never blocks.
    private GameHandleSafeHandle? Publish(GameHandleSafeHandle next)
    {
        lock (_swapLock)
        {
            var previous = _current;
            _current = next;
            return previous;
        }
    }

    /// Helper for partial-class extensions (new feature-area files) to add
    /// a `GetXyz(...)` method without duplicating the capture/null-check
    /// boilerplate. Example:
    /// <code>
    /// public IReadOnlyList&lt;Foo&gt; GetFoo(uint id) =>
    ///     WithGame((e, h) => e.GetFoo(h, id));
    /// </code>
    /// Runs `body` outside any lock — safe and free to run concurrently
    /// with any other read, and with an in-flight write's clone/simulate
    /// phase (which operates on a different, private handle instance).
    private T WithGame<T>(Func<NativeGameEngine, GameHandleSafeHandle, T> body) =>
        body(engine, CaptureCurrent());

    /// Helper for partial-class extensions that mutate world state directly
    /// (e.g. `GameSession.Watchlist.cs`'s add/remove) rather than advancing
    /// the simulation. Clones the published handle, applies `mutation` to
    /// the clone, then publishes it — same clone-then-swap safety as
    /// <see cref="ProcessDays"/>, so a mutation never races a concurrent
    /// read against the still-published handle it started from (mutating
    /// the published handle in place would alias a `&amp;mut` against
    /// whatever `&amp;` reads are in flight on other threads — undefined
    /// behavior across the FFI boundary, not just a logical bug).
    private void MutateGame(Action<NativeGameEngine, GameHandleSafeHandle> mutation)
    {
        lock (_writeGate)
        {
            var previous = CaptureCurrent();
            var working = engine.CloneGame(previous);
            mutation(engine, working);
            Publish(working)?.Dispose();
        }
    }

    public bool HasGame
    {
        get { lock (_swapLock) { return _current is not null; } }
    }

    /// Creates a fresh world, replacing (and releasing) any existing one.
    /// Pass `countryCodes` (ISO codes, e.g. ["AR","UY","BR"]) to scope
    /// generation to a handful of countries instead of the full world —
    /// much faster for dev/test iteration; null/empty means the full world.
    public void CreateNewGame(IReadOnlyList<string>? countryCodes = null)
    {
        lock (_writeGate)
        {
            var next = countryCodes is { Count: > 0 }
                ? engine.CreateScopedGame(countryCodes)
                : engine.CreateGame();
            _myClubId = null;
            Publish(next)?.Dispose();
        }
    }

    /// Advances the published world by `days` in one shot. Clones the
    /// current handle, simulates on the clone, then publishes it — reads
    /// against the previous handle are unaffected for the whole duration.
    public ProcessResult ProcessDays(uint days)
    {
        lock (_writeGate)
        {
            var previous = CaptureCurrent();
            var working = engine.CloneGame(previous);
            var result = engine.ProcessDays(working, days);
            Publish(working)?.Dispose();
            return result;
        }
    }

    /// Same simulation as <see cref="ProcessDays"/>, but ticks one real day
    /// at a time so `onProgress` gets an honest per-day event (date, running
    /// match count, whether a match day just happened) instead of a guess.
    ///
    /// The expensive part isn't simulating a day — it's `CloneGame`, which
    /// deep-copies the whole accumulated world (measured: doing that once
    /// per day, as an earlier version of this method did, made a 5-day run
    /// cost 5x a single clone for no benefit). So this clones the published
    /// handle exactly **once** up front, ticks `engine.ProcessDays(working,
    /// 1)` in a loop against that same handle, and only publishes the
    /// result at the very end — the per-day `onProgress` callback doesn't
    /// need an intermediate publish to be real, since nothing else reads
    /// `_current` mid-run in this single-player-session app.
    public void ProcessDaysWithProgress(uint days, Action<ProcessProgress> onProgress)
    {
        lock (_writeGate)
        {
            var previous = CaptureCurrent();
            var working = engine.CloneGame(previous);

            ulong matchesPlayed = 0;
            string date = "";
            for (uint day = 1; day <= days; day++)
            {
                var result = engine.ProcessDays(working, 1);
                matchesPlayed += result.MatchesPlayed;
                date = result.Date;
                onProgress(new ProcessProgress(date, day, days, matchesPlayed, day == days));
            }

            Publish(working)?.Dispose();
        }
    }

    public GameSnapshot GetSnapshot() => WithGame((e, h) => e.GetSnapshot(h));

    public IReadOnlyList<CountryListItem> GetCountries() => WithGame((e, h) => e.GetCountries(h));

    public IReadOnlyList<LeagueListItem> GetLeagues(uint countryId) => WithGame((e, h) => e.GetLeagues(h, countryId));

    public LeagueTable GetLeagueTable(uint leagueId) => WithGame((e, h) => e.GetLeagueTable(h, leagueId));

    public TeamDetail GetTeam(uint teamId) => WithGame((e, h) => e.GetTeam(h, teamId));

    public PlayerDetail GetPlayer(uint playerId) => WithGame((e, h) => e.GetPlayer(h, playerId));

    public IReadOnlyList<NationalSquadRow> GetNationalSquad(uint countryId, bool u21) =>
        WithGame((e, h) => e.GetNationalSquad(h, countryId, u21));

    public IReadOnlyList<NationalScheduleItem> GetNationalSchedule(uint countryId, bool u21) =>
        WithGame((e, h) => e.GetNationalSchedule(h, countryId, u21));

    public IReadOnlyList<NationalStaffMember> GetNationalStaff(uint countryId, bool u21) =>
        WithGame((e, h) => e.GetNationalStaff(h, countryId, u21));

    public IReadOnlyList<FreeAgent> GetFreeAgents(uint countryId) => WithGame((e, h) => e.GetFreeAgents(h, countryId));

    public IReadOnlyList<CompletedTransfer> GetLeagueTransfers(uint leagueId) => WithGame((e, h) => e.GetLeagueTransfers(h, leagueId));

    public SeasonAwards? GetLeagueAwards(uint leagueId) => WithGame((e, h) => e.GetLeagueAwards(h, leagueId));
}
