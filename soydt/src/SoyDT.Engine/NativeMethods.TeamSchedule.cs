using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the team-schedule export — see NativeMethods.cs for
/// the shared conventions this sibling file follows.
internal static partial class NativeMethods
{
    [LibraryImport("engine_ffi")]
    internal static partial IntPtr engine_get_team_schedule(IntPtr handle, uint teamId);
}
