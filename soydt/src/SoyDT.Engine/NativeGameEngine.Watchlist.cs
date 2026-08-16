using SoyDT.Domain;

namespace SoyDT.Engine;

/// Watchlist + search wrapper — see engine-ffi/src/watchlist.rs and
/// engine-ffi/src/search.rs. Sibling file to NativeGameEngine.cs, same
/// SafeHandle pattern as every other export on that class.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<WatchlistPlayer> GetWatchlist(GameHandleSafeHandle game)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_watchlist(game.DangerousGetHandle());
            return NativeStringMarshal.ReadEnvelope<IReadOnlyList<WatchlistPlayer>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public void WatchlistAdd(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_watchlist_add(game.DangerousGetHandle(), playerId);
            NativeStringMarshal.ReadEnvelopeNullable<object>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public void WatchlistRemove(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_watchlist_remove(game.DangerousGetHandle(), playerId);
            NativeStringMarshal.ReadEnvelopeNullable<object>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public SearchResults Search(GameHandleSafeHandle game, string query)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_search(game.DangerousGetHandle(), query);
            return NativeStringMarshal.ReadEnvelope<SearchResults>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
