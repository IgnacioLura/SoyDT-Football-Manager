using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the team-finances export — new sibling file to
/// `NativeMethods.cs` (see that file's remarks) rather than an edit to it.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_team_finances(IntPtr handle, uint teamId);
}
