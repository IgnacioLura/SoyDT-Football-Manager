namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_watchlist`'s `data` array.
public sealed record WatchlistPlayer(
    uint Id,
    string Name,
    string Position,
    string CountryCode,
    string CountryName,
    byte Age,
    byte CurrentAbility,
    byte PotentialAbility,
    byte ConditionPct,
    string TeamName,
    string LeagueName,
    ushort Played,
    ushort PlayedSubs,
    bool Injured,
    bool Unhappy,
    bool TransferListed,
    bool Retired);

public sealed record SearchCountry(string Name, string Slug, string Code);

public sealed record SearchClub(string Name, string TeamSlug);

public sealed record SearchPlayer(uint Id, string Name, string CountryCode, string TeamName, byte Age, bool IsFreeAgent);

/// Mirrors `engine_search`'s `data` payload.
public sealed record SearchResults(
    IReadOnlyList<SearchCountry> Countries,
    IReadOnlyList<SearchClub> Clubs,
    IReadOnlyList<SearchPlayer> Players);
