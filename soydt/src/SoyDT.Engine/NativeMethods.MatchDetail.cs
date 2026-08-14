using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the on-demand match simulation export — see
/// engine-ffi/src/match_detail.rs. Kept in its own file (sibling of
/// NativeMethods.cs) to avoid touching the shared partial class file
/// directly while other feature areas are also extending it.
internal static partial class NativeMethods
{
    private const string MatchDetailLibName = "engine_ffi";

    [LibraryImport(MatchDetailLibName)]
    internal static partial IntPtr engine_simulate_team_match(IntPtr handle, uint homeTeamId, uint awayTeamId);
}
