using SoyDT.Domain;

namespace SoyDT.Api.Ai;

/// Process-wide, in-memory LLM contract — ported from the original app's
/// `web/src/ai/mod.rs::AiConfig`. Registered as a singleton; no persistence
/// between process restarts, same as the original (it's a dev-time "point
/// this at your local Ollama/llama.cpp server" setting, not user data).
public sealed class AiConfig
{
    private readonly Lock _lock = new();
    private LlmSettings? _settings;

    /// Values pre-filled into the settings dialog before anything's been
    /// saved — a local OpenAI-compatible endpoint, matching the original's
    /// own placeholder default.
    public static LlmSettings Defaults() => new(
        BaseUrl: "http://192.168.1.71:8080/v1",
        Model: "unsloth/Qwen3.6-27B-MTP-GGUF:UD-Q8_K_X",
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
