using SoyDT.Domain;

namespace SoyDT.Engine;

/// Season player-statistics table for one team — new sibling file to
/// NativeGameEngine.cs (same DangerousAddRef/Release marshalling pattern
/// as the other `Get*` methods there), backs the React "Team Stats" page.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<TeamPlayerStatsRow> GetTeamStats(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_stats(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<List<TeamPlayerStatsRow>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
