using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the team relations export — see
/// engine-ffi/src/team_relations.rs. Kept in its own file (sibling of
/// NativeMethods.cs) to avoid touching the shared partial class file
/// directly while other feature areas are also extending it.
internal static partial class NativeMethods
{
    private const string TeamRelationsLibName = "engine_ffi";

    [LibraryImport(TeamRelationsLibName)]
    internal static partial IntPtr engine_get_team_relations(IntPtr handle, uint teamId);
}
