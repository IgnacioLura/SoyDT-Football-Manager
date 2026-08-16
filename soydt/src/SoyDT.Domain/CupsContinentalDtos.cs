namespace SoyDT.Domain;

/// Mirrors one entry of `engine_get_cups`'s `data` array.
public sealed record CupListItem(uint Id, string Name, string Slug, uint CountryId, string CountryName);

public sealed record CupTie(
    string Date,
    uint HomeTeamId,
    string HomeTeamName,
    uint AwayTeamId,
    string AwayTeamName,
    byte? HomeGoals,
    byte? AwayGoals);

public sealed record CupRound(byte Round, IReadOnlyList<CupTie> Ties);

public sealed record CupHistoryEntry(int SeasonStartYear, string ChampionTeamName, string? RunnerUpTeamName);

/// Mirrors `engine_get_cup_bracket`'s `data` payload.
public sealed record CupBracket(
    uint Id,
    string Name,
    IReadOnlyList<CupRound> Rounds,
    uint? ChampionTeamId,
    string? ChampionTeamName,
    IReadOnlyList<CupHistoryEntry> PastChampions);

public sealed record ContinentalGroupRow(
    uint TeamId,
    string TeamName,
    byte Played,
    byte Won,
    byte Drawn,
    byte Lost,
    byte Gf,
    byte Ga,
    byte Points);

public sealed record ContinentalGroup(string Name, IReadOnlyList<ContinentalGroupRow> Rows);

public sealed record ContinentalKnockoutTie(
    uint HomeTeamId,
    string HomeTeamName,
    uint AwayTeamId,
    string AwayTeamName,
    byte? Leg1HomeGoals,
    byte? Leg1AwayGoals,
    byte? Leg2HomeGoals,
    byte? Leg2AwayGoals,
    uint? WinnerTeamId,
    string? WinnerTeamName);

/// Mirrors `engine_get_continental_competition`'s `data` payload.
public sealed record ContinentalCompetition(
    string Competition,
    string Stage,
    IReadOnlyList<ContinentalGroup> Groups,
    IReadOnlyList<ContinentalKnockoutTie> KnockoutTies);
