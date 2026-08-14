using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team tactical plan — new sibling file to NativeGameEngine.cs (same
/// DangerousAddRef/Release marshalling pattern as the other `Get*` methods
/// there), backs the React "Team Tactics" page.
public sealed partial class NativeGameEngine
{
    public TeamTactics GetTeamTactics(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_tactics(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamTactics>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
