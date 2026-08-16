namespace SoyDT.Domain;

/// OpenAI-compatible LLM contract — mirrors the original app's
/// `web/src/ai/mod.rs::LlmSettings`. Held in memory only for the process
/// lifetime (see `SoyDT.Api.Ai.AiConfig`), same as the original.
public sealed record LlmSettings(string BaseUrl, string Model, string ApiKey);

/// Body of the AI settings dialog's save request.
public sealed record SaveAiRequest(string BaseUrl, string Model, string? ApiKey);

/// Current AI config surfaced to the settings dialog.
public sealed record AiConfigDto(bool Configured, string BaseUrl, string Model, string ApiKey);

public sealed record SaveAiResult(string Status, string Detail);

/// One tool the agent called, surfaced live to the dialog.
public sealed record ToolTrace(string Name, string Arguments);

/// Snapshot handed back to a long-poll request.
public sealed record JobSnapshot(string Status, int Cursor, IReadOnlyList<ToolTrace> NewToolCalls, string Text, string Detail);

/// Reply to a report-start request: a job id to long-poll, or an error.
public sealed record ReportStart(ulong? JobId, string? Error);
