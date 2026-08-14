using System.Text.Json;
using System.Text.Json.Serialization;
using SoyDT.Domain;

namespace SoyDT.Engine;

/// Reads and always frees a `char*` returned by an `engine-ffi` export,
/// decoding it against the `{ok, data, error}` envelope documented in
/// engine-ffi/CONTRACT.md.
internal static class NativeStringMarshal
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private sealed record ErrorBody(string Code, string Message);

    private sealed record Envelope<T>(bool Ok, T? Data, ErrorBody? Error);

    /// Marshals `ptr` as UTF-8, frees it via `free_string`, and deserializes
    /// the envelope. Throws <see cref="EngineException"/> when `ok` is
    /// false — callers get either a valid `T` or an exception, never a
    /// half-decoded envelope.
    internal static T ReadEnvelope<T>(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero)
        {
            throw new EngineException("null_result", "engine-ffi returned a null string pointer");
        }

        string json;
        try
        {
            json = System.Runtime.InteropServices.Marshal.PtrToStringUTF8(ptr)
                ?? throw new EngineException("null_result", "engine-ffi returned an unreadable string");
        }
        finally
        {
            NativeMethods.free_string(ptr);
        }

        var envelope = JsonSerializer.Deserialize<Envelope<T>>(json, JsonOptions)
            ?? throw new EngineException("deserialize_failed", $"could not parse engine-ffi response: {json}");

        if (!envelope.Ok)
        {
            var error = envelope.Error ?? new ErrorBody("unknown", "engine-ffi reported failure with no error body");
            throw new EngineException(error.Code, error.Message);
        }

        return envelope.Data is not null
            ? envelope.Data
            : throw new EngineException("missing_data", "engine-ffi reported ok=true but included no data");
    }

    /// Same as <see cref="ReadEnvelope{T}"/>, but a `null` `data` on
    /// `ok=true` is a legitimate result (e.g. "no season has completed
    /// yet") rather than an error — returns `default` instead of throwing.
    internal static T? ReadEnvelopeNullable<T>(IntPtr ptr)
    {
        if (ptr == IntPtr.Zero)
        {
            throw new EngineException("null_result", "engine-ffi returned a null string pointer");
        }

        string json;
        try
        {
            json = System.Runtime.InteropServices.Marshal.PtrToStringUTF8(ptr)
                ?? throw new EngineException("null_result", "engine-ffi returned an unreadable string");
        }
        finally
        {
            NativeMethods.free_string(ptr);
        }

        var envelope = JsonSerializer.Deserialize<Envelope<T>>(json, JsonOptions)
            ?? throw new EngineException("deserialize_failed", $"could not parse engine-ffi response: {json}");

        if (!envelope.Ok)
        {
            var error = envelope.Error ?? new ErrorBody("unknown", "engine-ffi reported failure with no error body");
            throw new EngineException(error.Code, error.Message);
        }

        return envelope.Data;
    }
}
