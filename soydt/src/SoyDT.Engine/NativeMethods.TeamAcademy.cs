using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// Raw P/Invoke surface for `engine_get_team_academy` — new sibling file to
/// `NativeMethods.cs` (see that file's remarks) rather than an edit to it.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team_academy(IntPtr handle, uint teamId);
}
