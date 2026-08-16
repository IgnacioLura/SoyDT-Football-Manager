import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CountriesPage from './features/countries/CountriesPage'
import FreeAgentsPage from './features/countries/FreeAgentsPage'
import NationalSquadPage from './features/countries/NationalSquadPage'
import SchedulePage from './features/countries/SchedulePage'
import StaffPage from './features/countries/StaffPage'
import PipeCheckPage from './features/debug/PipeCheckPage'
import LeaguesPage from './features/leagues/LeaguesPage'
import LeagueAwardsPage from './features/leagues/LeagueAwardsPage'
import LeagueTablePage from './features/leagues/LeagueTablePage'
import LeagueTransfersPage from './features/leagues/LeagueTransfersPage'
import PlayerPage from './features/players/PlayerPage'
import PlayerContractPage from './features/players/PlayerContractPage'
import PlayerHistoryPage from './features/players/PlayerHistoryPage'
import PlayerAwardsPage from './features/players/PlayerAwardsPage'
import PlayerMatchesPage from './features/players/PlayerMatchesPage'
import PlayerPersonalPage from './features/players/PlayerPersonalPage'
import PlayerTransfersPage from './features/players/PlayerTransfersPage'
import TeamPage from './features/teams/TeamPage'
import TeamSchedulePage from './features/teams/TeamSchedulePage'
import TeamTransfersPage from './features/teams/TeamTransfersPage'
import TeamFinancesPage from './features/teams/TeamFinancesPage'
import TeamStaffPage from './features/teams/TeamStaffPage'
import TeamStatsPage from './features/teams/TeamStatsPage'
import TeamRelationsPage from './features/teams/TeamRelationsPage'
import TeamAcademyPage from './features/teams/TeamAcademyPage'
import TeamScoutingPage from './features/teams/TeamScoutingPage'
import TeamTacticsPage from './features/teams/TeamTacticsPage'
import PlayerEventsPage from './features/players/PlayerEventsPage'
import PlayerRelationsPage from './features/players/PlayerRelationsPage'
import StaffMemberPage from './features/staff/StaffPage'
import StaffPersonalPage from './features/staff/StaffPersonalPage'
import LeagueSchedulePage from './features/leagues/LeagueSchedulePage'
import AboutPage from './features/misc/AboutPage'
import MatchDetailPage from './features/match/MatchDetailPage'
import WatchlistPage from './features/misc/WatchlistPage'
import SearchPage from './features/misc/SearchPage'
import CupsPage from './features/cups/CupsPage'
import CupBracketPage from './features/cups/CupBracketPage'
import ContinentalCompetitionPage from './features/cups/ContinentalCompetitionPage'
import NewGamePage from './features/onboarding/NewGamePage'
import DtSquadPage from './features/dt/DtSquadPage'
import DtTransfersPage from './features/dt/DtTransfersPage'
import DtFinancesPage from './features/dt/DtFinancesPage'
import DtTablePage from './features/dt/DtTablePage'
import DtEventsPage from './features/dt/DtEventsPage'
import { ProcessProvider } from './shared/ProcessContext'
import ProcessOverlay from './shared/ProcessOverlay'
import DtEventModal from './shared/DtEventModal'

function App() {
  return (
    <ProcessProvider>
      <ProcessOverlay />
      <DtEventModal />
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<CountriesPage />} />
        <Route path="/countries" element={<CountriesPage />} />
        <Route path="/countries/:countryId" element={<NationalSquadPage />} />
        <Route path="/countries/:countryId/schedule" element={<SchedulePage />} />
        <Route path="/countries/:countryId/staff" element={<StaffPage />} />
        <Route path="/countries/:countryId/leagues" element={<LeaguesPage />} />
        <Route path="/countries/:countryId/free-agents" element={<FreeAgentsPage />} />
        <Route path="/leagues/:leagueId" element={<LeagueTablePage />} />
        <Route path="/leagues/:leagueId/transfers" element={<LeagueTransfersPage />} />
        <Route path="/leagues/:leagueId/awards" element={<LeagueAwardsPage />} />
        <Route path="/leagues/:leagueId/schedule" element={<LeagueSchedulePage />} />
        <Route path="/teams/:teamId" element={<TeamPage />} />
        <Route path="/teams/:teamId/schedule" element={<TeamSchedulePage />} />
        <Route path="/teams/:teamId/transfers" element={<TeamTransfersPage />} />
        <Route path="/teams/:teamId/finances" element={<TeamFinancesPage />} />
        <Route path="/teams/:teamId/staff" element={<TeamStaffPage />} />
        <Route path="/teams/:teamId/stats" element={<TeamStatsPage />} />
        <Route path="/teams/:teamId/relations" element={<TeamRelationsPage />} />
        <Route path="/teams/:teamId/academy" element={<TeamAcademyPage />} />
        <Route path="/teams/:teamId/scouting" element={<TeamScoutingPage />} />
        <Route path="/teams/:teamId/tactics" element={<TeamTacticsPage />} />
        <Route path="/players/:playerId" element={<PlayerPage />} />
        <Route path="/players/:playerId/history" element={<PlayerHistoryPage />} />
        <Route path="/players/:playerId/contract" element={<PlayerContractPage />} />
        <Route path="/players/:playerId/awards" element={<PlayerAwardsPage />} />
        <Route path="/players/:playerId/matches" element={<PlayerMatchesPage />} />
        <Route path="/players/:playerId/personal" element={<PlayerPersonalPage />} />
        <Route path="/players/:playerId/transfers" element={<PlayerTransfersPage />} />
        <Route path="/players/:playerId/events" element={<PlayerEventsPage />} />
        <Route path="/players/:playerId/relations" element={<PlayerRelationsPage />} />
        <Route path="/staff/:staffId" element={<StaffMemberPage />} />
        <Route path="/staff/:staffId/personal" element={<StaffPersonalPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/match/:matchId" element={<MatchDetailPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cups" element={<CupsPage />} />
        <Route path="/cups/:cupId" element={<CupBracketPage />} />
        <Route path="/champions-league" element={<ContinentalCompetitionPage />} />
        <Route path="/europa-league" element={<ContinentalCompetitionPage />} />
        <Route path="/conference-league" element={<ContinentalCompetitionPage />} />
        <Route path="/copa-libertadores" element={<ContinentalCompetitionPage />} />
        {/* Not part of the original app's UI — internal tool for verifying
            the React -> .NET -> engine-ffi pipe, reachable by URL only. */}
        <Route path="/debug" element={<PipeCheckPage />} />
        {/* DT/"Mi Equipo" onboarding — creates the Uruguay-only world and
            lets the user pick their club. */}
        <Route path="/new-game" element={<NewGamePage />} />
        {/* DT/"Mi Equipo" — locked-down area scoped to the user's own club
            (see DtLayout's own comment for why there's no ProcessControl
            here). Each page resolves "my team id" itself via useMyTeamId. */}
        <Route path="/dt" element={<DtSquadPage />} />
        <Route path="/dt/squad" element={<DtSquadPage />} />
        <Route path="/dt/transfers" element={<DtTransfersPage />} />
        <Route path="/dt/finances" element={<DtFinancesPage />} />
        <Route path="/dt/table" element={<DtTablePage />} />
        <Route path="/dt/events" element={<DtEventsPage />} />
        </Routes>
      </BrowserRouter>
    </ProcessProvider>
  )
}

export default App
