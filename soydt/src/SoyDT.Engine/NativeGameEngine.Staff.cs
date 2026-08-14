using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class NativeGameEngine
{
    public StaffDetail GetStaff(GameHandleSafeHandle game, uint staffId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_staff(game.DangerousGetHandle(), staffId);
            return NativeStringMarshal.ReadEnvelope<StaffDetail>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public StaffPersonal GetStaffPersonal(GameHandleSafeHandle game, uint staffId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_staff_personal(game.DangerousGetHandle(), staffId);
            return NativeStringMarshal.ReadEnvelope<StaffPersonal>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
