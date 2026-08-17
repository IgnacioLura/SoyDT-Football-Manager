using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Phase 1: the countries index page (mirrors the original app's
/// `/{lang}/countries` route). Read-only, backed by `engine_get_countries`.
[ApiController]
[Route("api/countries")]
public sealed class CountriesController(GameSession session) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<CountryListItem>> List()
    {
        return Ok(session.GetCountries());
    }

    [HttpGet("{countryId}/leagues")]
    public ActionResult<IReadOnlyList<LeagueListItem>> Leagues(uint countryId)
    {
        return Ok(session.GetLeagues(countryId));
    }

    [HttpGet("{countryId}/squad")]
    public ActionResult<IReadOnlyList<NationalSquadRow>> Squad(uint countryId, [FromQuery] bool u21 = false)
    {
        return Ok(session.GetNationalSquad(countryId, u21));
    }

    [HttpGet("{countryId}/schedule")]
    public ActionResult<IReadOnlyList<NationalScheduleItem>> Schedule(uint countryId, [FromQuery] bool u21 = false)
    {
        return Ok(session.GetNationalSchedule(countryId, u21));
    }

    [HttpGet("{countryId}/staff")]
    public ActionResult<IReadOnlyList<NationalStaffMember>> Staff(uint countryId, [FromQuery] bool u21 = false)
    {
        return Ok(session.GetNationalStaff(countryId, u21));
    }

    [HttpGet("{countryId}/free-agents")]
    public ActionResult<IReadOnlyList<FreeAgent>> FreeAgents(uint countryId)
    {
        return Ok(session.GetFreeAgents(countryId));
    }

    [HttpGet("{countryId}/transfer-market")]
    public ActionResult<CountryTransferMarket> TransferMarket(uint countryId)
    {
        return Ok(session.GetCountryTransferMarket(countryId));
    }
}
