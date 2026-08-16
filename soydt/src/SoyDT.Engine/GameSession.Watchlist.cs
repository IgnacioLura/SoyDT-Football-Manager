using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public IReadOnlyList<WatchlistPlayer> GetWatchlist() => WithGame((e, h) => e.GetWatchlist(h));

    public void WatchlistAdd(uint playerId) => WithGame<object?>((e, h) =>
    {
        e.WatchlistAdd(h, playerId);
        return null;
    });

    public void WatchlistRemove(uint playerId) => WithGame<object?>((e, h) =>
    {
        e.WatchlistRemove(h, playerId);
        return null;
    });

    public SearchResults Search(string query) => WithGame((e, h) => e.Search(h, query));
}
