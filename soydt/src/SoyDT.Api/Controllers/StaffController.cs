using Microsoft.AspNetCore.Mvc;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Controllers;

/// Staff member profile — overview + "Personal" sub-tab (mirrors the
/// original app's `/{lang}/staff/{slug}` and `/{lang}/staff/{slug}/personal`
/// routes). Distinct from `CountriesController`'s `{countryId}/staff` list
/// (national-team staff roster) — this is a single club staff member by id.
/// Read-only, backed by `engine_get_staff` / `engine_get_staff_personal`.
[ApiController]
[Route("api/staff")]
public sealed class StaffController(GameSession session) : ControllerBase
{
    [HttpGet("{staffId}")]
    public ActionResult<StaffDetail> Get(uint staffId) => Ok(session.GetStaff(staffId));

    [HttpGet("{staffId}/personal")]
    public ActionResult<StaffPersonal> Personal(uint staffId) => Ok(session.GetStaffPersonal(staffId));
}
