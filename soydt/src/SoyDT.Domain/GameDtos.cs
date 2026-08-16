namespace SoyDT.Domain;

/// Mirrors `engine-ffi`'s `data` payload for `engine_process_days`
/// (see engine-ffi/CONTRACT.md). Field names/casing must match the JSON
/// exactly — deserialization is case-insensitive but shape must line up.
public sealed record ProcessResult(string Date, uint DaysProcessed, ulong MatchesPlayed);

/// Pushed over `ProcessHub` after each simulated day of a live `/process/live`
/// run — lets the UI show a running total instead of polling a boolean
/// "is it done" flag like the original Axum app's `/api/game/processing`.
public sealed record ProcessProgress(
    string Date,
    uint DaysProcessed,
    uint TotalDays,
    ulong MatchesPlayed,
    bool Done);

public sealed record ContinentSummary(uint Id, string Name, int CountryCount);

/// `GET /api/game/status` — whether a world exists and whether the DT has
/// already picked a club, so the frontend's onboarding flow knows whether
/// to redirect there.
public sealed record GameStatus(bool HasGame, uint? MyClubId);

/// `GET /api/game/my-team` — the DT's own team id, or null before one's
/// been picked. A club's main team shares its numeric id with the club
/// (see `GameSession.MyClubId`'s doc comment), so this is just `MyClubId`
/// under the name the DT-area frontend actually calls it.
public sealed record MyTeamResult(uint? TeamId);

/// Mirrors `engine_get_snapshot`'s `data` payload.
public sealed record GameSnapshot(string Date, IReadOnlyList<ContinentSummary> Continents);

/// Mirrors one entry of `engine_get_countries`'s `data` array.
public sealed record CountryListItem(
    uint Id,
    string Code,
    string Slug,
    string Name,
    uint ContinentId,
    string ContinentName,
    int LeagueCount);

/// Mirrors one entry of `engine_get_leagues`'s `data` array.
public sealed record LeagueListItem(
    uint Id,
    string Name,
    string Slug,
    uint CountryId,
    byte Tier,
    ushort Reputation,
    int TeamCount);

/// Mirrors one row of `engine_get_league_table`'s `data.rows` array.
public sealed record LeagueTableRow(
    uint TeamId,
    string TeamName,
    string TeamSlug,
    int Position,
    byte Played,
    byte Won,
    byte Drawn,
    byte Lost,
    int GoalsFor,
    int GoalsAgainst,
    int GoalDifference,
    ushort Points);

/// Mirrors `engine_get_league_table`'s `data` payload.
public sealed record LeagueTable(
    uint LeagueId,
    string LeagueName,
    string LeagueSlug,
    uint CountryId,
    IReadOnlyList<LeagueTableRow> Rows);

/// Mirrors one entry of `engine_get_team`'s `data.players` array. `Value` is
/// the engine's own market-value figure (`player_attributes.value`, the
/// same field `engine_get_player`'s `PlayerDetail.Value` already exposes) —
/// the DT transfer page uses it as a suggested (editable) fee.
public sealed record PlayerCard(uint Id, string Name, string Position, byte Age, byte CurrentAbility, uint Value);

/// Mirrors `engine_get_team`'s `data` payload.
public sealed record TeamDetail(
    uint Id,
    string Name,
    string Slug,
    uint ClubId,
    uint CountryId,
    uint? LeagueId,
    string? LeagueName,
    ushort Reputation,
    IReadOnlyList<PlayerCard> Players);

/// Mirrors one entry of `engine_get_national_squad`'s `data` array.
public sealed record NationalSquadRow(
    uint PlayerId,
    string Position,
    string FirstName,
    string LastName,
    byte Age,
    uint? ClubId,
    string ClubName,
    byte CurrentAbility,
    byte ConditionPct,
    ushort InternationalApps,
    ushort InternationalGoals,
    string Reason);

/// Mirrors one entry of `engine_get_national_schedule`'s `data` array.
public sealed record NationalScheduleItem(
    string Date,
    uint OpponentCountryId,
    string OpponentName,
    bool IsHome,
    string CompetitionName,
    string MatchId,
    byte? HomeGoals,
    byte? AwayGoals);

/// Mirrors one entry of `engine_get_national_staff`'s `data` array.
public sealed record NationalStaffMember(
    string FirstName,
    string LastName,
    string Role,
    uint CountryId,
    string CountryCode,
    string CountryName,
    int Age);

/// Mirrors one entry of `engine_get_free_agents`'s `data` array.
public sealed record FreeAgent(uint PlayerId, string FirstName, string LastName, string Position, byte Age, byte CurrentAbility);

/// Mirrors one entry of `engine_get_league_transfers`'s `data` array.
public sealed record CompletedTransfer(
    uint PlayerId,
    string PlayerName,
    uint FromTeamId,
    string FromTeamName,
    uint ToTeamId,
    string ToTeamName,
    double Fee,
    bool IsLoan,
    bool IsFree,
    string Date);

/// Mirrors one named-award entry within `engine_get_league_awards`'s payload.
public sealed record NamedAward(uint PlayerId, string PlayerName, string ClubName);

/// Mirrors `engine_get_league_awards`'s `data` payload (null if no season
/// has completed yet).
public sealed record SeasonAwards(
    string SeasonEndDate,
    NamedAward? PlayerOfSeason,
    NamedAward? YoungPlayerOfSeason,
    NamedAward? TopScorer,
    NamedAward? TopAssists,
    NamedAward? GoldenGlove);

public sealed record TechnicalAttributes(
    float Corners,
    float Crossing,
    float Dribbling,
    float Finishing,
    float FirstTouch,
    float FreeKicks,
    float Heading,
    float LongShots,
    float LongThrows,
    float Marking,
    float Passing,
    float PenaltyTaking,
    float Tackling,
    float Technique);

public sealed record MentalAttributes(
    float Aggression,
    float Anticipation,
    float Bravery,
    float Composure,
    float Concentration,
    float Decisions,
    float Determination,
    float Flair,
    float Leadership,
    float OffTheBall,
    float Positioning,
    float Teamwork,
    float Vision,
    float WorkRate);

public sealed record PhysicalAttributes(
    float Acceleration,
    float Agility,
    float Balance,
    float Jumping,
    float NaturalFitness,
    float Pace,
    float Stamina,
    float Strength,
    float MatchReadiness);

public sealed record GoalkeepingAttributes(
    float AerialReach,
    float CommandOfArea,
    float Communication,
    float Eccentricity,
    float FirstTouch,
    float Handling,
    float Kicking,
    float OneOnOnes,
    float Passing,
    float Punching,
    float Reflexes,
    float RushingOut,
    float Throwing);

/// Mirrors `engine_get_player`'s `data` payload.
public sealed record PlayerDetail(
    uint Id,
    string FirstName,
    string LastName,
    byte Age,
    string Position,
    uint CountryId,
    string CountryCode,
    string CountryName,
    byte CurrentAbility,
    uint Value,
    short CurrentReputation,
    byte Height,
    byte Weight,
    bool IsInjured,
    bool IsBanned,
    float TechnicalAvg,
    float MentalAvg,
    float PhysicalAvg,
    TechnicalAttributes Technical,
    MentalAttributes Mental,
    PhysicalAttributes Physical,
    GoalkeepingAttributes? Goalkeeping,
    uint? TeamId,
    string? TeamName);

/// Mirrors one entry of `engine_get_team_lineup`'s `data` array — the DT's
/// squad with each player's current "pinned" (force-selection) state.
public sealed record LineupPlayer(uint PlayerId, string Name, string Position, byte CurrentAbility, byte? ShirtNumber, bool Pinned, bool IsReadyForMatch, bool IsInjured, bool IsBanned);

/// Body for `PUT /api/teams/{teamId}/lineup` — exactly 11 player ids.
public sealed record SetLineupRequest(IReadOnlyList<uint> PlayerIds);

/// Mirrors `engine_transfer_player`'s `data` payload.
public sealed record TransferActionResult(uint PlayerId, uint FromTeamId, uint ToTeamId, double Fee);

/// Body for `POST /api/transfers`.
public sealed record TransferActionRequest(uint PlayerId, uint FromTeamId, uint ToTeamId, double Fee);
