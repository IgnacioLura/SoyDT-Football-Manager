using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the team-board wrapper without editing the shared file.
public sealed partial class NativeGameEngine
{
    public TeamBoard GetTeamBoard(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_board(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamBoard>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
