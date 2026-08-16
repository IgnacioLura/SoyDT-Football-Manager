using Microsoft.AspNetCore.Mvc;
using SoyDT.Api.Ai;
using SoyDT.Domain;

namespace SoyDT.Api.Controllers;

/// Backs the AI settings dialog — mirrors the original app's
/// `/api/ai/config` GET/POST/DELETE routes (`web/src/ai/mod.rs`).
[ApiController]
[Route("api/ai/config")]
public sealed class AiConfigController(AiConfig config) : ControllerBase
{
    [HttpGet]
    public ActionResult<AiConfigDto> Get()
    {
        var saved = config.Get();
        var settings = saved ?? AiConfig.Defaults();
        return new AiConfigDto(saved is not null, settings.BaseUrl, settings.Model, settings.ApiKey);
    }

    [HttpPost]
    public ActionResult<SaveAiResult> Save([FromBody] SaveAiRequest body)
    {
        var baseUrl = body.BaseUrl.Trim();
        var model = body.Model.Trim();
        if (baseUrl.Length == 0 || model.Length == 0)
        {
            return new SaveAiResult("error", "base_url and model are required");
        }
        config.Set(new LlmSettings(baseUrl, model, (body.ApiKey ?? "").Trim()));
        return new SaveAiResult("ok", "");
    }

    [HttpDelete]
    public ActionResult<SaveAiResult> Clear()
    {
        config.Clear();
        return new SaveAiResult("ok", "");
    }
}
