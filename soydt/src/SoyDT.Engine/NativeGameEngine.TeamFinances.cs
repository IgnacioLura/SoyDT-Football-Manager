using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the team-finances wrapper without editing the shared file.
public sealed partial class NativeGameEngine
{
    public TeamFinances GetTeamFinances(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_finances(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamFinances>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
