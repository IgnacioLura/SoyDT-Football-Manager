using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the DT lineup exports — see
/// engine-ffi/src/team_lineup.rs. Sibling file to NativeMethods.cs.
internal static partial class NativeMethods
{
    private const string TeamLineupLibName = "engine_ffi";

    [LibraryImport(TeamLineupLibName)]
    internal static partial IntPtr engine_get_team_lineup(IntPtr handle, uint teamId);

    [LibraryImport(TeamLineupLibName, StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr engine_set_team_lineup(IntPtr handle, uint teamId, string argsJson);
}
