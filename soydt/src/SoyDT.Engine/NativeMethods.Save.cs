using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the save/load exports — see engine-ffi/src/save.rs.
/// Sibling file to NativeMethods.cs.
internal static partial class NativeMethods
{
    private const string SaveLibName = "engine_ffi";

    [LibraryImport(SaveLibName)]
    internal static partial IntPtr engine_save_game(IntPtr handle);

    [LibraryImport(SaveLibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_load_game(string bytesBase64);
}
