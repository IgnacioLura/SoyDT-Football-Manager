using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public IReadOnlyList<WatchlistPlayer> GetWatchlist() => WithGame((e, h) => e.GetWatchlist(h));

    public void WatchlistAdd(uint playerId) => MutateGame((e, h) => e.WatchlistAdd(h, playerId));

    public void WatchlistRemove(uint playerId) => MutateGame((e, h) => e.WatchlistRemove(h, playerId));

    public SearchResults Search(string query) => WithGame((e, h) => e.Search(h, query));
}
