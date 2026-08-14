using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// Raw P/Invoke surface for `engine_get_player_awards` (see
/// engine-ffi/CONTRACT.md). Sibling partial to `NativeMethods.cs` — kept in
/// its own file to avoid touching the file other workers are editing.
internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_player_awards(IntPtr handle, uint playerId);
}
