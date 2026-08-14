using System.Text.Json;
using SoyDT.Domain;

namespace SoyDT.Engine;

/// The only door into `engine-ffi`'s game-state exports. Registered as a
/// singleton in DI — `SimulatorData` lives once per process on the Rust
/// side (mirrors the original app's single-instance, no-multi-tenant
/// design), so this wrapper does too. Not thread-safe by itself: callers
/// that expose concurrent HTTP/SignalR access must serialize their own
/// calls into this class (a single `SemaphoreSlim` around the active game,
/// once one exists) rather than relying on this class to lock internally.
public sealed partial class NativeGameEngine
{
    /// Contract version this build was written against — see
    /// engine-ffi/CONTRACT.md. Call <see cref="AssertContractVersion"/> once
    /// at startup so a drift between the compiled `.so`/`.dll` and this
    /// wrapper's assumed JSON shapes fails loudly instead of misparsing.
    public const uint ExpectedContractVersion = 1;

    public uint AssertContractVersion()
    {
        var actual = NativeMethods.engine_ffi_contract_version();
        if (actual != ExpectedContractVersion)
        {
            throw new EngineException(
                "contract_mismatch",
                $"SoyDT.Engine expects engine-ffi contract v{ExpectedContractVersion} but the loaded library reports v{actual}");
        }
        return actual;
    }

    public GameHandleSafeHandle CreateGame()
    {
        var handle = NativeMethods.engine_create_game();
        if (handle == IntPtr.Zero)
        {
            throw new EngineException("create_failed", "engine_create_game panicked or otherwise failed to produce a world");
        }
        return new GameHandleSafeHandle(handle);
    }

    /// Scopes world generation to a handful of ISO country codes (e.g.
    /// ["AR","UY","BR"]) instead of the full ~68-country world — much
    /// faster to create and to simulate against for dev/test iteration.
    /// An empty/null list behaves like <see cref="CreateGame"/>.
    public GameHandleSafeHandle CreateScopedGame(IReadOnlyList<string>? countryCodes)
    {
        var json = JsonSerializer.Serialize(countryCodes ?? []);
        var handle = NativeMethods.engine_create_scoped_game(json);
        if (handle == IntPtr.Zero)
        {
            throw new EngineException("create_failed", "engine_create_scoped_game panicked or otherwise failed to produce a world");
        }
        return new GameHandleSafeHandle(handle);
    }

    public ProcessResult ProcessDays(GameHandleSafeHandle game, uint days)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_process_days(game.DangerousGetHandle(), days);
            return NativeStringMarshal.ReadEnvelope<ProcessResult>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public GameSnapshot GetSnapshot(GameHandleSafeHandle game)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_snapshot(game.DangerousGetHandle());
            return NativeStringMarshal.ReadEnvelope<GameSnapshot>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<CountryListItem> GetCountries(GameHandleSafeHandle game)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_countries(game.DangerousGetHandle());
            return NativeStringMarshal.ReadEnvelope<List<CountryListItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<LeagueListItem> GetLeagues(GameHandleSafeHandle game, uint countryId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_leagues(game.DangerousGetHandle(), countryId);
            return NativeStringMarshal.ReadEnvelope<List<LeagueListItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public LeagueTable GetLeagueTable(GameHandleSafeHandle game, uint leagueId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_league_table(game.DangerousGetHandle(), leagueId);
            return NativeStringMarshal.ReadEnvelope<LeagueTable>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public TeamDetail GetTeam(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamDetail>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public PlayerDetail GetPlayer(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<PlayerDetail>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<NationalSquadRow> GetNationalSquad(GameHandleSafeHandle game, uint countryId, bool u21)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_national_squad(game.DangerousGetHandle(), countryId, u21);
            return NativeStringMarshal.ReadEnvelope<List<NationalSquadRow>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<NationalScheduleItem> GetNationalSchedule(GameHandleSafeHandle game, uint countryId, bool u21)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_national_schedule(game.DangerousGetHandle(), countryId, u21);
            return NativeStringMarshal.ReadEnvelope<List<NationalScheduleItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<NationalStaffMember> GetNationalStaff(GameHandleSafeHandle game, uint countryId, bool u21)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_national_staff(game.DangerousGetHandle(), countryId, u21);
            return NativeStringMarshal.ReadEnvelope<List<NationalStaffMember>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<FreeAgent> GetFreeAgents(GameHandleSafeHandle game, uint countryId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_free_agents(game.DangerousGetHandle(), countryId);
            return NativeStringMarshal.ReadEnvelope<List<FreeAgent>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public IReadOnlyList<CompletedTransfer> GetLeagueTransfers(GameHandleSafeHandle game, uint leagueId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_league_transfers(game.DangerousGetHandle(), leagueId);
            return NativeStringMarshal.ReadEnvelope<List<CompletedTransfer>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public SeasonAwards? GetLeagueAwards(GameHandleSafeHandle game, uint leagueId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_league_awards(game.DangerousGetHandle(), leagueId);
            return NativeStringMarshal.ReadEnvelopeNullable<SeasonAwards>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
