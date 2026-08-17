# Squad Needs + Transfer Market — design spec

Date: 2026-08-17
Status: approved, ready for implementation plan

## Problem

`open-football/src/core/src/transfers/` (market, negotiation, offer, window,
squad_needs, scouting_region, country_pair_policy, pipeline/) is the AI
transfer-market engine driving every autonomous club's buying/selling
behavior during simulation. None of it is exposed to the player today; the
existing exposed transfer surface (`team_transfers.rs`, `player_transfers.rs`,
`transfers.rs`, `team_transfer_action.rs`) only ever reads/writes *completed*
transfer history, or lets the DT execute an instant manual move with no
negotiation.

This spec covers exposing two small, genuinely useful, **read-only** slices
of that engine — deliberately not the negotiation/offer/AI-matching
machinery itself, which is internal state with no stable "browsable" shape
a human would want to see (same conclusion reached for `simulator`'s
internals in the prior investigation pass: `TransferNegotiation`/
`TransferOffer` are live AI bookkeeping, not a feature surface).

## Scope

### Feature 1: Squad Needs

`core::transfers::squad_needs::FirstTeamSquadNeeds::for_club(&Club) -> Self`
is a pure, stateless snapshot of how short a club's main team is against
fixed per-position-group minimums (`MIN_GROUP_GOALKEEPER` = 2,
`MIN_GROUP_DEFENDER` = 7, `MIN_GROUP_MIDFIELDER` = 7, `MIN_GROUP_FORWARD` =
4). Fields to expose, verbatim:

- `main_team_size: usize`, `total_missing: usize`, `urgent: bool`
- `gk_count`/`gk_missing`, `def_count`/`def_missing`,
  `mid_count`/`mid_missing`, `fwd_count`/`fwd_missing` (all `usize`)

No fields excluded — the whole struct is small and every field is
directly meaningful to a reader.

**UI**: a new `SectionPanel` titled "Squad Needs" added to the existing
`soydt/web/src/features/teams/TeamPage.tsx` (not a new route — this is a
handful of numbers belonging right where the squad is already shown).
Fetched as a second `callApi` call on that page. Four `fm-detail-row` rows
(one per position group, "current / minimum", value in red when
`missing > 0`), plus a total-missing summary row, plus an "URGENT" banner
(styled like Club Board's final-warning banner) when `urgent` is true.

### Feature 2: Transfer Market

`core::transfers::market::TransferMarket` already lives on `Country` as
`country.transfer_market` (confirmed: `team_transfer_action.rs` already
reads `country.transfer_market.transfer_history`). Two already-stored
fields, no new computation needed:

- `transfer_window_open: bool`
- `listings: Vec<TransferListing>` — each has `player_id`, `club_id`,
  `team_id`, `asking_price: CurrencyValue` (take `.amount`), `listed_date`,
  `listing_type: TransferListingType` (`Transfer`/`Loan`/`EndOfContract`),
  `status: TransferListingStatus` (`Available`/`InNegotiation`/
  `Completed`/`Cancelled`)

**Filter**: only `Available` and `InNegotiation` listings are exposed —
`Completed`/`Cancelled` are historical noise for a "who's currently for
sale" view (the existing `engine_get_league_transfers`/
`engine_get_team_transfers` already cover completed deals).

**Player resolution**: for each listing, resolve display fields via the
existing `game.data().player_with_team(player_id) -> Option<(&Player,
&Team)>` helper (already used by `watchlist.rs` for exactly this kind of
cross-club lookup) — player name (`full_name.first_name`/`last_name`),
primary position short name (`positions.primary()...get_short_name()`),
age (`DateUtils::age(birth_date, now)`), and the team's `name`/`slug`
(matching `watchlist.rs`'s exact field-building pattern). A listing whose
player can't be resolved (shouldn't happen in practice, but the walk is
defensive) is skipped, not an error.

**UI**: new page `soydt/web/src/features/countries/TransferMarketPage.tsx`,
route `/countries/:countryId/transfer-market`, added as a 6th tab in the
existing `countryTabs` (`soydt/web/src/features/countries/tabs.tsx`,
currently squad/schedule/staff/leagues/free_agents). A `DataTable` with
columns: player (linked), position, age, team (linked), asking price
(money-formatted), type, status. A header line/badge showing whether the
transfer window is currently open. `emptyMessage="No players currently
listed"`.

## Architecture

Both features follow the established sibling-file convention exactly (see
`team_finances.rs`/`CONTRACT.md` as templates), but Feature 2 corrects an
assumption from the Club Board spec: **country-scoped endpoints are NOT
one-controller-per-domain** — `CountriesController.cs` already bundles
`leagues`/`squad`/`schedule`/`staff`/`free-agents` as separate actions on
one controller class (confirmed by reading it). Feature 2's endpoint is a
new action on that existing controller, not a new controller file. Feature
1 follows the teams convention (one controller per team-domain), same as
Club Board.

1. **`soydt/engine-ffi/src/team_squad_needs.rs`** (new) —
   `engine_get_team_squad_needs(handle, team_id) -> *mut c_char`. Same
   club-lookup walk as `team_finances.rs` (find the club whose
   `club.teams.teams` contains `team_id`), then
   `FirstTeamSquadNeeds::for_club(club)`.
2. **`soydt/engine-ffi/src/country_transfer_market.rs`** (new) —
   `engine_get_country_transfer_market(handle, country_id) -> *mut c_char`.
   Looks up the country directly (`game.data().country(country_id)`, same
   pattern `national_team.rs` uses for its country-scoped exports), reads
   `country.transfer_market.transfer_window_open` and filters/maps
   `country.transfer_market.listings`.
3. **C#**: `NativeMethods.TeamSquadNeeds.cs`/`NativeGameEngine.TeamSquadNeeds.cs`/
   `GameSession.TeamSquadNeeds.cs` + `TeamSquadNeedsDtos.cs` (teams
   convention); `NativeMethods.CountryTransferMarket.cs`/
   `NativeGameEngine.CountryTransferMarket.cs`/
   `GameSession.CountryTransferMarket.cs` + `CountryTransferMarketDtos.cs`
   (same sibling-file shape, just consumed by the countries convention
   below instead of a dedicated controller).
4. **API**: new action `[HttpGet("{teamId}/squad-needs")]` on a new
   `TeamSquadNeedsController.cs` (teams convention — every team domain gets
   its own controller file, confirmed against `TeamFinancesController.cs`).
   New action `[HttpGet("{countryId}/transfer-market")]` added directly
   into the existing `soydt/src/SoyDT.Api/Controllers/CountriesController.cs`
   (countries convention — one controller, many actions).
5. **Web**: `TeamPage.tsx` gets a second panel + second fetch (no new
   route). `TransferMarketPage.tsx` is a new file + new route in
   `App.tsx` + a new tab in `countries/tabs.tsx`.

## UI design (must follow `soydt/DESIGN_SYSTEM.md`)

- Both panels/pages use `SectionPanel` with no `accent` override (default
  primary) — neither is a strong candidate for one of the three claimed
  accent tints (secondary=finances, tertiary=tactics, gold=scouting).
- Squad Needs rows use the same `fm-detail-row`/`fm-detail-label`/
  `fm-detail-value` pattern as Club Board's Ownership/Vision panels, with
  inline `style={{ color: 'crimson' }}` on a missing value > 0 (matches
  Club Board's established, if slightly off-token, precedent for value
  emphasis — not introducing a new pattern here).
- Transfer Market's listing table uses `DataTable` (columns per the Scope
  section above), following `WatchlistPage.tsx`'s pattern for a player-name
  column rendered as a `<Link>`.

## Testing / verification

Same discipline as Club Board: verify via the documented `curl` flow
(`engine/create` → `engine/process` → hit both new endpoints against real
data), then `npm run build` + `oxlint` + `dotnet build` + the Docker Rust
build, matching the prior feature's consolidated verification pass. No
unit-test framework exists for this kind of change in this codebase
(confirmed again for this pass) — do not introduce one.

## Out of scope (not this spec)

- `TransferNegotiation`/`TransferOffer` (live AI negotiation state) — no
  stable browsable shape, internal bookkeeping only.
- `scouting_region.rs`'s `ScoutingRegion` enum — a categorization type used
  internally by the scouting pipeline, not a standalone feature surface.
- `pipeline/`, `country_pair_policy.rs` — deeper AI-matching internals, not
  sampled in detail; no evidence found of a user-facing feature gap there
  during this investigation pass.
- Letting the DT create/cancel a transfer listing for their own players
  (a *write* feature) — this spec is read-only browsing of the existing
  market, matching the "expose reads first" pattern Club Board established.
  A follow-up spec could cover DT-initiated listing as a natural next step.
