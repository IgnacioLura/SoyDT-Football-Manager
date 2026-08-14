using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// Raw P/Invoke surface for `engine-ffi` (see engine-ffi/CONTRACT.md).
/// "engine_ffi" resolves to `libengine_ffi.so` on Linux / `engine_ffi.dll`
/// on Windows via .NET's platform-specific native library probing — no
/// prefix/extension here. Nothing in this file marshals ownership; callers
/// go through <see cref="NativeGameEngine"/> instead of these directly.
internal static partial class NativeMethods
{
    private const string LibName = "engine_ffi";

    [LibraryImport(LibName)]
    internal static partial uint engine_ffi_contract_version();

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_create_game();

    [LibraryImport(LibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_create_scoped_game(string countryCodesJson);

    [LibraryImport(LibName)]
    internal static partial void engine_free_game(IntPtr handle);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_snapshot(IntPtr handle);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_countries(IntPtr handle);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_leagues(IntPtr handle, uint countryId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_league_table(IntPtr handle, uint leagueId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team(IntPtr handle, uint teamId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_player(IntPtr handle, uint playerId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_national_squad(IntPtr handle, uint countryId, [MarshalAs(UnmanagedType.U1)] bool u21);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_national_schedule(IntPtr handle, uint countryId, [MarshalAs(UnmanagedType.U1)] bool u21);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_national_staff(IntPtr handle, uint countryId, [MarshalAs(UnmanagedType.U1)] bool u21);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_free_agents(IntPtr handle, uint countryId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_league_transfers(IntPtr handle, uint leagueId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_league_awards(IntPtr handle, uint leagueId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_process_days(IntPtr handle, uint days);

    [LibraryImport(LibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_simulate_spike_match(string homeName, string awayName);

    [LibraryImport(LibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_simulate_from_json(string homeJson, string awayJson);

    [LibraryImport(LibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_simulate_match_full(string homeJson, string awayJson);

    [LibraryImport(LibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_simulate_match_full_with_positions(string homeJson, string awayJson);

    [LibraryImport(LibName)]
    internal static partial void free_string(IntPtr s);
}
