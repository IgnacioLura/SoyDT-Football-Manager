using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.ResponseCompression;
using SoyDT.Api.Ai;
using SoyDT.Api.Hubs;
using SoyDT.Domain;
using SoyDT.Engine;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddSingleton<NativeGameEngine>();
builder.Services.AddSingleton<GameSession>();
// Path lives on a Docker volume in production (see soydt/Dockerfile's
// `VOLUME ["/data"]`) so the save survives a redeploy; defaults to a local
// file for `dotnet run`/dev-loop use outside a container.
builder.Services.AddSingleton(_ => new SaveGameStore(
    Environment.GetEnvironmentVariable("SOYDT_DB_PATH") ?? "/data/soydt.db"));
builder.Services.AddSingleton<AiConfig>();
builder.Services.AddSingleton<AiJobs>();
// Named client for the AI agent's LLM calls — a long timeout since local
// OpenAI-compatible servers (Ollama/llama.cpp) can take a while per turn.
// The original ported value was 120s (`reqwest::Client`'s own timeout);
// bumped further here because a local, partially-CPU-offloaded model can
// legitimately take longer than that on a single tool-calling round once
// the conversation has grown a few turns in.
builder.Services.AddHttpClient("ai-agent", c => c.Timeout = TimeSpan.FromSeconds(300));
// The match-detail endpoint's downsampled position data is still a large,
// highly repetitive JSON payload (~10MB+ per fixture) — the original app
// gzips its own match recordings on disk for the same reason. Response
// compression is opt-in per-response in ASP.NET Core (skipped by default
// over HTTPS to avoid BREACH-style risk), so it's enabled explicitly here;
// this API has no cookie/token-reflecting endpoints for that attack to
// target.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

var app = builder.Build();

// Fail fast if the loaded engine-ffi library's contract version doesn't
// match what SoyDT.Engine was written against (engine-ffi/CONTRACT.md) —
// a silent mismatch would misparse JSON instead of erroring clearly.
app.Services.GetRequiredService<NativeGameEngine>().AssertContractVersion();

// Autoload: restore whatever was last saved (if anything) before the API
// starts serving. A missing or unreadable save (fresh volume, or a blob
// written under an older CONTRACT_VERSION) just leaves the session empty —
// same "no game yet" state a first run has — rather than failing startup.
var gameSession = app.Services.GetRequiredService<GameSession>();
var saveGameStore = app.Services.GetRequiredService<SaveGameStore>();
try
{
    var saved = saveGameStore.TryLoad();
    if (saved is not null)
    {
        gameSession.LoadFromSnapshot(saved);
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Failed to load saved game; starting with no active game");
}

// Autosave: every mutation (day processed, lineup/transfer/my-club change)
// persists the whole session immediately after it publishes — single-user
// scope, so no debounce/queueing is needed.
gameSession.Mutated += () =>
{
    try
    {
        saveGameStore.Save(gameSession.Save());
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Autosave failed");
    }
};

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// engine-ffi failures (see EngineException) surface as ProblemDetails
// rather than a generic 500 — the `Code` maps 1:1 to engine-ffi/CONTRACT.md's
// error codes ("panic", "engine_error", "no_active_game", ...).
app.UseExceptionHandler(new ExceptionHandlerOptions
{
    ExceptionHandler = async context =>
    {
        var feature = context.Features.Get<IExceptionHandlerFeature>();
        if (feature?.Error is EngineException ex)
        {
            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            await context.Response.WriteAsJsonAsync(new { code = ex.Code, message = ex.Message });
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { code = "unhandled", message = "internal server error" });
        }
    },
});

app.UseResponseCompression();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
// Mounted under /api so the Vite dev server's existing `/api` proxy rule
// (see soydt/web/vite.config.ts) covers it without a second proxy entry.
app.MapHub<ProcessHub>("/api/hubs/process");

app.Run();
