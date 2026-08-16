using Microsoft.AspNetCore.Mvc;
using SoyDT.Api.Ai;
using SoyDT.Domain;

namespace SoyDT.Api.Controllers;

/// Long-poll progress endpoint shared by every AI report — mirrors the
/// original app's `/api/ai/progress` route. Speaks only in job ids; each
/// report controller owns its own prompt/task construction.
[ApiController]
[Route("api/ai")]
public sealed class AiProgressController(AiJobs jobs) : ControllerBase
{
    [HttpGet("progress")]
    public async Task<ActionResult<JobSnapshot>> Progress([FromQuery] ulong jobId, [FromQuery] int cursor = 0)
    {
        var snapshot = await jobs.Wait(jobId, cursor);
        return snapshot is null ? NotFound() : snapshot;
    }
}
