using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the cups + continental-competition exports — see
/// engine-ffi/src/cups.rs and engine-ffi/src/continental.rs. Kept in its
/// own file (sibling of NativeMethods.cs) to avoid touching the shared
/// partial class file directly while other feature areas are also
/// extending it.
internal static partial class NativeMethods
{
    private const string CupsLibName = "engine_ffi";

    [LibraryImport(CupsLibName)]
    internal static partial IntPtr engine_get_cups(IntPtr handle);

    [LibraryImport(CupsLibName)]
    internal static partial IntPtr engine_get_cup_bracket(IntPtr handle, uint cupId);

    [LibraryImport(CupsLibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_get_continental_competition(IntPtr handle, string competition);
}
