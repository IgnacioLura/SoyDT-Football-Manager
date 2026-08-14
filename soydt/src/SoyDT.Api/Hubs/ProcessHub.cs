using Microsoft.AspNetCore.SignalR;

namespace SoyDT.Api.Hubs;

/// Replaces the original Axum app's `/api/game/processing` polling loop
/// (a client GETting a boolean "is it processing" flag on a timer) with a
/// push channel: `GameController.ProcessLive` broadcasts a `ProcessProgress`
/// to every connected client after each simulated day. The hub itself has
/// no server-invokable methods — clients only ever listen on the
/// "ProgressUpdate" event; processing is started via the regular HTTP POST.
public sealed class ProcessHub : Hub;
