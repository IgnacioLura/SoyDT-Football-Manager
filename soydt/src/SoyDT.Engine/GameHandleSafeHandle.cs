using Microsoft.Win32.SafeHandles;

namespace SoyDT.Engine;

/// Owns one `engine-ffi` `GameHandle*`. `SafeHandle` guarantees
/// `engine_free_game` runs exactly once even if a caller forgets to dispose
/// (finalizer) or an exception unwinds mid-use — the leak/double-free
/// discipline `engine-ffi/CONTRACT.md` calls out as the caller's
/// responsibility.
public sealed class GameHandleSafeHandle : SafeHandleZeroOrMinusOneIsInvalid
{
    public GameHandleSafeHandle() : base(ownsHandle: true) { }

    internal GameHandleSafeHandle(IntPtr handle) : base(ownsHandle: true)
    {
        SetHandle(handle);
    }

    protected override bool ReleaseHandle()
    {
        NativeMethods.engine_free_game(handle);
        return true;
    }
}
