using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the DT manual-transfer export — see
/// engine-ffi/src/team_transfer_action.rs. Sibling file to NativeMethods.cs.
internal static partial class NativeMethods
{
    private const string TeamTransferActionLibName = "engine_ffi";

    [LibraryImport(TeamTransferActionLibName)]
    internal static partial IntPtr engine_transfer_player(IntPtr handle, uint playerId, uint fromTeamId, uint toTeamId, double fee);
}
