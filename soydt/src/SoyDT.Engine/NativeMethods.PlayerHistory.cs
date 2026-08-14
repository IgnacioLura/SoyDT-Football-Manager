using System.Runtime.InteropServices;

namespace SoyDT.Engine;

internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_player_history(IntPtr handle, uint playerId);
}
