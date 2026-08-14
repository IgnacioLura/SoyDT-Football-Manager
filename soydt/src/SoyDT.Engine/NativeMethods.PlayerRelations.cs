using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the player relations export — see
/// engine-ffi/src/player_relations.rs. Kept in its own file (sibling of
/// NativeMethods.cs) to avoid touching the shared partial class file
/// directly while other feature areas are also extending it.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_player_relations(IntPtr handle, uint playerId);
}
