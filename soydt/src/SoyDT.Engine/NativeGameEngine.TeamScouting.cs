using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team scouting monitoring-list wrapper — see engine-ffi/src/team_scouting.rs.
/// Sibling file to NativeGameEngine.cs, same DangerousAddRef/
/// DangerousGetHandle/finally-DangerousRelease pattern as every other
/// export on that class.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<ScoutMonitoringItem> GetTeamScouting(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_scouting(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<List<ScoutMonitoringItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
