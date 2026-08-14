using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// Raw P/Invoke surface for `engine_get_team_tactics` — kept in its own
/// file (new sibling to NativeMethods.cs) so this feature area doesn't
/// collide with the other parallel migration work touching that file.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team_tactics(IntPtr handle, uint teamId);
}
