using SoyDT.Domain;

namespace SoyDT.Engine;

/// League-schedule wrapper — see NativeGameEngine.cs for the shared
/// DangerousAddRef/Release pattern this sibling file follows.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<LeagueScheduleItem> GetLeagueSchedule(GameHandleSafeHandle game, uint leagueId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_league_schedule(game.DangerousGetHandle(), leagueId);
            return NativeStringMarshal.ReadEnvelope<List<LeagueScheduleItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
