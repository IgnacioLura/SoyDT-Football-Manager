using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the watchlist + search exports — see
/// engine-ffi/src/watchlist.rs and engine-ffi/src/search.rs. Kept in its
/// own file (sibling of NativeMethods.cs) to avoid touching the shared
/// partial class file directly while other feature areas are also
/// extending it.
internal static partial class NativeMethods
{
    private const string WatchlistLibName = "engine_ffi";

    [LibraryImport(WatchlistLibName)]
    internal static partial IntPtr engine_get_watchlist(IntPtr handle);

    [LibraryImport(WatchlistLibName)]
    internal static partial IntPtr engine_watchlist_add(IntPtr handle, uint playerId);

    [LibraryImport(WatchlistLibName)]
    internal static partial IntPtr engine_watchlist_remove(IntPtr handle, uint playerId);

    [LibraryImport(WatchlistLibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_search(IntPtr handle, string query);
}
