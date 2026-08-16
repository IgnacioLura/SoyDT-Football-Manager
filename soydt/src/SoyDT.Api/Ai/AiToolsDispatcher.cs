using System.Text.Json;
using System.Text.Json.Nodes;
using SoyDT.Domain;
using SoyDT.Engine;

namespace SoyDT.Api.Ai;

/// Executes the AI agent's tool calls against the live game session —
/// ported from the original app's `web/src/ai/tools.rs::AiTools`. Unlike
/// the original (which clones an `Arc&lt;SimulatorData&gt;` snapshot so the
/// slow agent loop never blocks the sim), every call here goes through
/// `GameSession`'s lock like any other read — acceptable at this app's
/// scale (a manually-triggered report against a paused-by-default session,
/// not a live-ticking multiplayer world).
public sealed class AiToolsDispatcher(GameSession session)
{
    /// OpenAI function-tool schemas advertised to the model.
    public static IReadOnlyList<ToolSchema> Schemas =>
    [
        new ToolSchema(JsonNode.Parse("""
            {
                "name": "club_get_by_id",
                "description": "Full club record — identity, finances, status, academy, facilities, rivals and the teams (Main/B/youth) it fields — as JSON for the given club id.",
                "parameters": {
                    "type": "object",
                    "properties": { "club_id": { "type": "integer", "description": "numeric club id" } },
                    "required": ["club_id"]
                }
            }
            """)!.AsObject()),
        new ToolSchema(JsonNode.Parse("""
            {
                "name": "club_players",
                "description": "The club's squad split by team. Each player has id, name, age, position, current ability (ca) and potential ability (pa) — no detailed skills.",
                "parameters": {
                    "type": "object",
                    "properties": { "club_id": { "type": "integer", "description": "numeric club id" } },
                    "required": ["club_id"]
                }
            }
            """)!.AsObject()),
        new ToolSchema(JsonNode.Parse("""
            {
                "name": "player_get_by_id",
                "description": "A single player's full record including all technical/mental/physical/goalkeeping skills and attributes, for the given player id.",
                "parameters": {
                    "type": "object",
                    "properties": { "player_id": { "type": "integer", "description": "numeric player id" } },
                    "required": ["player_id"]
                }
            }
            """)!.AsObject()),
    ];

    /// Runs a tool by name with its raw JSON argument string; always
    /// returns a JSON string (an `{"error": ...}` object on any failure) so
    /// the agent loop can feed it straight back to the model.
    public string Dispatch(string name, string arguments)
    {
        JsonNode? args;
        try
        {
            args = JsonNode.Parse(arguments);
        }
        catch (JsonException)
        {
            args = null;
        }

        try
        {
            return name switch
            {
                "club_get_by_id" => UintArg(args, "club_id") is { } clubId
                    ? session.AiGetClub(clubId)
                    : Error("missing or invalid club_id"),
                "club_players" => UintArg(args, "club_id") is { } clubId2
                    ? session.AiGetClubPlayers(clubId2)
                    : Error("missing or invalid club_id"),
                "player_get_by_id" => UintArg(args, "player_id") is { } playerId
                    ? session.AiGetPlayer(playerId)
                    : Error("missing or invalid player_id"),
                _ => Error($"unknown tool '{name}'"),
            };
        }
        catch (EngineException e)
        {
            return Error(e.Message);
        }
    }

    /// Accepts the id as a JSON number or a numeric string — models are
    /// inconsistent about which they emit.
    private static uint? UintArg(JsonNode? args, string key)
    {
        var raw = args?[key];
        if (raw is null) return null;
        if (raw.GetValueKind() == JsonValueKind.Number && raw.AsValue().TryGetValue<uint>(out var n)) return n;
        if (raw.GetValueKind() == JsonValueKind.String && uint.TryParse(raw.GetValue<string>(), out var parsed)) return parsed;
        return null;
    }

    private static string Error(string message) => new JsonObject { ["error"] = message }.ToJsonString();
}
