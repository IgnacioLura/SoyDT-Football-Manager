using System.Text.Json.Nodes;

namespace SoyDT.Api.Ai;

/// Drives the model-tools loop — ported from the original app's
/// `web/src/ai/agent.rs::AiAgent`. The model decides which tools to call,
/// we execute them against the game session and feed the JSON back, until
/// the model returns a final written report (or the step bound is hit).
/// Progress is reported through an `AiJobHandle` so the dialog can render
/// tool calls in real time; the prompt is supplied by the caller
/// (co-located with its report controller, same as the original's
/// per-page `include_str!` prompts).
public sealed class AiAgent(AiClient client, AiToolsDispatcher tools)
{
    /// Safety bound on the agent loop so a misbehaving model can't spin forever.
    private const int MaxSteps = 30;

    public async Task Run(string system, string task, AiJobHandle handle)
    {
        var messages = new List<JsonObject>
        {
            new() { ["role"] = "system", ["content"] = system },
            new() { ["role"] = "user", ["content"] = task },
        };
        var schemas = AiToolsDispatcher.Schemas;

        for (var step = 0; step < MaxSteps; step++)
        {
            ChatTurn turn;
            try
            {
                turn = await client.Chat(messages, schemas);
            }
            catch (AiClientException e)
            {
                handle.Fail(e.Message);
                return;
            }

            if (turn.ToolCalls.Count == 0)
            {
                handle.Finish(turn.Content ?? "");
                return;
            }

            // Echo the assistant's tool-call message back verbatim before
            // appending each tool result.
            var echoed = new JsonArray(turn.ToolCalls.Select(tc => (JsonNode) new JsonObject
            {
                ["id"] = tc.Id,
                ["type"] = "function",
                ["function"] = new JsonObject { ["name"] = tc.Name, ["arguments"] = tc.Arguments },
            }).ToArray());
            messages.Add(new JsonObject
            {
                ["role"] = "assistant",
                ["content"] = turn.Content,
                ["tool_calls"] = echoed,
            });

            // A single model turn can ask for several independent lookups at
            // once (e.g. two different players) — `AiToolsDispatcher.Dispatch`
            // only reads game state (never mutates it), so running them
            // concurrently is safe and turns N sequential round-trips into
            // one when the model batches them. Order is preserved when
            // building the reply messages (required: each "tool" message
            // must follow its own tool_call_id, but their relative order
            // among each other doesn't matter to the API).
            foreach (var tc in turn.ToolCalls)
            {
                handle.PushTool(tc.Name, tc.Arguments);
            }
            var results = await Task.WhenAll(turn.ToolCalls.Select(tc => Task.Run(() => tools.Dispatch(tc.Name, tc.Arguments))));
            for (var i = 0; i < turn.ToolCalls.Count; i++)
            {
                messages.Add(new JsonObject
                {
                    ["role"] = "tool",
                    ["tool_call_id"] = turn.ToolCalls[i].Id,
                    ["content"] = results[i],
                });
            }
        }

        handle.Fail($"the agent did not finish within {MaxSteps} steps");
    }
}
