namespace SoyDT.Domain;

/// Thrown by `SoyDT.Engine` when `engine-ffi` returns `{"ok":false,...}` —
/// see engine-ffi/CONTRACT.md's envelope shape. `Code` is `"panic"` for a
/// caught Rust panic, `"engine_error"` for an ordinary engine-side failure.
public sealed class EngineException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
