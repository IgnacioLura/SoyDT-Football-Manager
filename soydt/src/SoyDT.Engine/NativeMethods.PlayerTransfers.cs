using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// Raw P/Invoke surface for the player-transfers export — see
/// NativeMethods.cs for the shared conventions this file follows.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_player_transfers(IntPtr handle, uint playerId);
}
