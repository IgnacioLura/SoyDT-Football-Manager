using Microsoft.AspNetCore.Diagnostics;
using SoyDT.Domain;
using SoyDT.Engine;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<NativeGameEngine>();
builder.Services.AddSingleton<GameSession>();

var app = builder.Build();

// Fail fast if the loaded engine-ffi library's contract version doesn't
// match what SoyDT.Engine was written against (engine-ffi/CONTRACT.md) —
// a silent mismatch would misparse JSON instead of erroring clearly.
app.Services.GetRequiredService<NativeGameEngine>().AssertContractVersion();

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

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
