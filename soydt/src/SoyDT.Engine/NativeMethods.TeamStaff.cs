using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the club team staff export — see
/// engine-ffi/src/team_staff.rs. Kept in its own file (sibling of
/// NativeMethods.cs) to avoid touching the shared partial class file
/// directly while other feature areas are also extending it.
internal static partial class NativeMethods
{
    private const string TeamStaffLibName = "engine_ffi";

    [LibraryImport(TeamStaffLibName)]
    internal static partial IntPtr engine_get_team_staff(IntPtr handle, uint teamId);
}
