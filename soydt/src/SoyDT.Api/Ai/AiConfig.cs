using SoyDT.Domain;

namespace SoyDT.Api.Ai;

/// Process-wide, in-memory LLM contract — ported from the original app's
/// `web/src/ai/mod.rs::AiConfig`. Registered as a singleton; no persistence
/// between process restarts, same as the original (it's a dev-time "point
/// this at your local Ollama/llama.cpp server" setting, not user data).
public sealed class AiConfig
{
    private readonly Lock _lock = new();

    // Defaults to this deployment's local Ollama out of the box — no
    // "AI settings" dialog step needed before the AI report/badge work.
    // `host.docker.internal` is how a container reaches the host machine's
    // Ollama (Docker Desktop resolves it on Windows/Mac without any extra
    // compose config); `llama3.1:8b` is the model this dev box has pulled
    // with tool-calling support.
    private LlmSettings? _settings = Defaults();

    public static LlmSettings Defaults() => new(
        BaseUrl: "http://host.docker.internal:11434/v1",
        Model: "llama3.2:3b",
        ApiKey: "");

    public LlmSettings? Get()
    {
        lock (_lock) { return _settings; }
    }

    public bool IsConfigured
    {
        get { lock (_lock) { return _settings is not null; } }
    }

    public void Set(LlmSettings settings)
    {
        lock (_lock) { _settings = settings; }
    }

    public void Clear()
    {
        lock (_lock) { _settings = null; }
    }
}
