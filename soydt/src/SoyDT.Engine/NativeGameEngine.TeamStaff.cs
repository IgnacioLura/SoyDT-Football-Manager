using SoyDT.Domain;

namespace SoyDT.Engine;

/// Club team staff roster wrapper — see engine-ffi/src/team_staff.rs.
/// Sibling file to NativeGameEngine.cs, same DangerousAddRef/
/// DangerousGetHandle/finally-DangerousRelease pattern as every other
/// export on that class.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<TeamStaffMember> GetTeamStaff(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_staff(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<List<TeamStaffMember>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
