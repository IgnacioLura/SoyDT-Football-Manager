using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team-schedule wrapper — see NativeGameEngine.cs for the shared
/// DangerousAddRef/Release pattern this sibling file follows.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<TeamScheduleItem> GetTeamSchedule(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_schedule(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<List<TeamScheduleItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
