using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// Team-scoped transfers P/Invoke — see engine-ffi/CONTRACT.md.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team_transfers(IntPtr handle, uint teamId);
}
