using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using SoyDT.Domain;

namespace SoyDT.Api.Ai;

/// One tool advertised to the model: an OpenAI function-tool schema.
public sealed record ToolSchema(JsonObject Function)
{
    public string Type => "function";
}

/// A tool call the model asked us to run.
public sealed record ToolCall(string Id, string Name, string Arguments);

/// Result of a single chat round: the assistant text (if any) plus any tool
/// calls it wants executed before continuing.
public sealed record ChatTurn(string? Content, IReadOnlyList<ToolCall> ToolCalls);

/// Thin OpenAI-compatible chat-completions client — ported from the original
/// app's `web/src/ai/client.rs::AiClient`. One `Chat()` call is one
/// round-trip; the agent loop lives in `AiAgent`. `http` comes from
/// `IHttpClientFactory` (see `AiAgent`'s construction site) — this class
/// isn't itself DI-managed since a fresh instance is created per report run,
/// each bound to that run's saved `LlmSettings`.
public sealed class AiClient(HttpClient http, LlmSettings settings)
{
    public async Task<ChatTurn> Chat(IReadOnlyList<JsonObject> messages, IReadOnlyList<ToolSchema> tools)
    {
        var body = new JsonObject
        {
            ["model"] = settings.Model,
            ["messages"] = new JsonArray(messages.Select(m => (JsonNode)m.DeepClone()).ToArray()),
            ["temperature"] = 0.6,
        };
        if (tools.Count > 0)
        {
            body["tools"] = new JsonArray(tools.Select(t => (JsonNode) new JsonObject
            {
                ["type"] = t.Type,
                ["function"] = t.Function.DeepClone(),
            }).ToArray());
            body["tool_choice"] = "auto";
        }

        var endpoint = $"{settings.BaseUrl.TrimEnd('/')}/chat/completions";
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint) { Content = JsonContent.Create(body) };
        if (!string.IsNullOrEmpty(settings.ApiKey))
        {
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", settings.ApiKey);
        }

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request);
        }
        catch (Exception e)
        {
            throw new AiClientException($"request failed: {e.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var text = await response.Content.ReadAsStringAsync();
            var snippet = text.Length > 300 ? text[..300] : text;
            throw new AiClientException($"LLM returned {(int)response.StatusCode}: {snippet}");
        }

        JsonDocument parsed;
        try
        {
            parsed = await response.Content.ReadFromJsonAsync<JsonDocument>()
                ?? throw new AiClientException("could not parse LLM response: empty body");
        }
        catch (JsonException e)
        {
            throw new AiClientException($"could not parse LLM response: {e.Message}");
        }

        using (parsed)
        {
            if (!parsed.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
            {
                throw new AiClientException("LLM response had no choices");
            }

            var message = choices[0].GetProperty("message");
            string? content = message.TryGetProperty("content", out var c) && c.ValueKind == JsonValueKind.String
                ? c.GetString()
                : null;

            var toolCalls = new List<ToolCall>();
            if (message.TryGetProperty("tool_calls", out var tcs) && tcs.ValueKind == JsonValueKind.Array)
            {
                foreach (var tc in tcs.EnumerateArray())
                {
                    var id = tc.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                    var fn = tc.GetProperty("function");
                    var name = fn.GetProperty("name").GetString() ?? "";
                    var arguments = fn.TryGetProperty("arguments", out var argEl) ? argEl.GetString() ?? "" : "";
                    toolCalls.Add(new ToolCall(id, name, arguments));
                }
            }

            return new ChatTurn(content, toolCalls);
        }
    }
}

/// Raised for any LLM-request failure — the agent loop turns this into a
/// job "error" status with the message shown to the operator, same as the
/// original's `Result<ChatTurn, String>` error path.
public sealed class AiClientException(string message) : Exception(message);
