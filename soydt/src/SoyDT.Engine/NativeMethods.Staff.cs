using System.Runtime.InteropServices;

namespace SoyDT.Engine;

internal static partial class NativeMethods
{
    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_staff(IntPtr handle, uint staffId);

    [LibraryImport(LibName)]
    internal static partial IntPtr engine_get_staff_personal(IntPtr handle, uint staffId);
}
