using SoyDT.Domain;

namespace SoyDT.Engine;

/// Holds the one live game handle for this process — mirrors the original
/// Axum app's single global `Arc<RwLock<SimulatorData>>` (no multi-tenancy,
/// no per-user state; see the migration plan's state-ownership decision:
/// Rust stays the state owner, this class just holds the opaque handle and
/// serializes access to it). Registered as a singleton in DI.
public sealed partial class GameSession(NativeGameEngine engine)
{
    private readonly Lock _lock = new();
    private GameHandleSafeHandle? _current;

    /// Helper for partial-class extensions (new feature-area files) to add
    /// a `GetXyz(...)` method without duplicating the null-check/lock
    /// boilerplate every other method here has. Example:
    /// <code>
    /// public IReadOnlyList&lt;Foo&gt; GetFoo(uint id) =>
    ///     WithGame((e, h) => e.GetFoo(h, id));
    /// </code>
    private T WithGame<T>(Func<NativeGameEngine, GameHandleSafeHandle, T> body)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return body(engine, _current);
        }
    }

    public bool HasGame
    {
        get { lock (_lock) { return _current is not null; } }
    }

    /// Creates a fresh world, replacing (and releasing) any existing one.
    /// Pass `countryCodes` (ISO codes, e.g. ["AR","UY","BR"]) to scope
    /// generation to a handful of countries instead of the full world —
    /// much faster for dev/test iteration; null/empty means the full world.
    public void CreateNewGame(IReadOnlyList<string>? countryCodes = null)
    {
        var next = countryCodes is { Count: > 0 }
            ? engine.CreateScopedGame(countryCodes)
            : engine.CreateGame();
        lock (_lock)
        {
            _current?.Dispose();
            _current = next;
        }
    }

    public ProcessResult ProcessDays(uint days)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.ProcessDays(_current, days);
        }
    }

    /// Same simulation as <see cref="ProcessDays"/>, but ticks one day at a
    /// time so `onProgress` can push a running total after each day instead
    /// of the caller waiting for the whole range to finish. Runs under the
    /// same lock as every other session method — this session only ever
    /// serves one caller at a time, live processing included.
    public void ProcessDaysWithProgress(uint days, Action<ProcessProgress> onProgress)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }

            ulong matchesPlayed = 0;
            string date = "";
            for (uint day = 1; day <= days; day++)
            {
                var result = engine.ProcessDays(_current, 1);
                matchesPlayed += result.MatchesPlayed;
                date = result.Date;
                onProgress(new ProcessProgress(date, day, days, matchesPlayed, day == days));
            }
        }
    }

    public GameSnapshot GetSnapshot()
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetSnapshot(_current);
        }
    }

    public IReadOnlyList<CountryListItem> GetCountries()
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetCountries(_current);
        }
    }

    public IReadOnlyList<LeagueListItem> GetLeagues(uint countryId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetLeagues(_current, countryId);
        }
    }

    public LeagueTable GetLeagueTable(uint leagueId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetLeagueTable(_current, leagueId);
        }
    }

    public TeamDetail GetTeam(uint teamId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetTeam(_current, teamId);
        }
    }

    public PlayerDetail GetPlayer(uint playerId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetPlayer(_current, playerId);
        }
    }

    public IReadOnlyList<NationalSquadRow> GetNationalSquad(uint countryId, bool u21)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetNationalSquad(_current, countryId, u21);
        }
    }

    public IReadOnlyList<NationalScheduleItem> GetNationalSchedule(uint countryId, bool u21)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetNationalSchedule(_current, countryId, u21);
        }
    }

    public IReadOnlyList<NationalStaffMember> GetNationalStaff(uint countryId, bool u21)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetNationalStaff(_current, countryId, u21);
        }
    }

    public IReadOnlyList<FreeAgent> GetFreeAgents(uint countryId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetFreeAgents(_current, countryId);
        }
    }

    public IReadOnlyList<CompletedTransfer> GetLeagueTransfers(uint leagueId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetLeagueTransfers(_current, leagueId);
        }
    }

    public SeasonAwards? GetLeagueAwards(uint leagueId)
    {
        lock (_lock)
        {
            if (_current is null)
            {
                throw new EngineException("no_active_game", "no game has been created yet — call create first");
            }
            return engine.GetLeagueAwards(_current, leagueId);
        }
    }
}
