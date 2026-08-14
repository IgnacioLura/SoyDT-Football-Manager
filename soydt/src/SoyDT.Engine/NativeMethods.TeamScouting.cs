using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the team scouting export — see
/// engine-ffi/src/team_scouting.rs. Kept in its own file (sibling of
/// NativeMethods.cs) to avoid touching the shared partial class file
/// directly while other feature areas are also extending it.
internal static partial class NativeMethods
{
    private const string TeamScoutingLibName = "engine_ffi";

    [LibraryImport(TeamScoutingLibName)]
    internal static partial IntPtr engine_get_team_scouting(IntPtr handle, uint teamId);
}
