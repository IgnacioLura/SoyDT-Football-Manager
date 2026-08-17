using SoyDT.Domain;

namespace SoyDT.Engine;

/// Save/load wrapper — see engine-ffi/src/save.rs. Sibling file to
/// NativeGameEngine.cs, same SafeHandle pattern as every other export.
public sealed partial class NativeGameEngine
{
    // `data_base64` matches `save.rs`'s `SaveResult { data_base64: String }`
    // once run through `NativeStringMarshal`'s snake_case-lower decoding
    // policy.
    private sealed record SaveResultWire(string DataBase64);

    /// Serializes `game`'s current world to a base64 string the caller can
    /// persist anywhere (SQLite, file, ...) and later hand back to
    /// <see cref="LoadGame"/>.
    public string SaveGame(GameHandleSafeHandle game)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_save_game(game.DangerousGetHandle());
            return NativeStringMarshal.ReadEnvelope<SaveResultWire>(resultPtr).DataBase64;
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    /// Inverse of <see cref="SaveGame"/> — rebuilds a fresh, independent
    /// world handle from a previously saved base64 blob. Not JSON-enveloped
    /// on the native side (see `save.rs`): a null pointer means the blob was
    /// corrupt, truncated, or saved under an incompatible contract version.
    public GameHandleSafeHandle LoadGame(string dataBase64)
    {
        var handle = NativeMethods.engine_load_game(dataBase64);
        if (handle == IntPtr.Zero)
        {
            throw new EngineException("load_failed", "engine_load_game failed to decode/deserialize the saved game (corrupt blob or incompatible contract version)");
        }
        return new GameHandleSafeHandle(handle);
    }
}
