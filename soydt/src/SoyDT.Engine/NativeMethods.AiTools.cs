using System.Runtime.InteropServices;

namespace SoyDT.Engine;

/// P/Invoke surface for the AI-agent data-access exports — see
/// engine-ffi/src/ai_tools.rs. Kept in its own file (sibling of
/// NativeMethods.cs) to avoid touching the shared partial class file
/// directly while other feature areas are also extending it.
internal static partial class NativeMethods
{
    private const string AiToolsLibName = "engine_ffi";

    [LibraryImport(AiToolsLibName)]
    internal static partial IntPtr engine_ai_get_club(IntPtr handle, uint clubId);

    [LibraryImport(AiToolsLibName)]
    internal static partial IntPtr engine_ai_get_club_players(IntPtr handle, uint clubId);

    [LibraryImport(AiToolsLibName)]
    internal static partial IntPtr engine_ai_get_player(IntPtr handle, uint playerId);
}
