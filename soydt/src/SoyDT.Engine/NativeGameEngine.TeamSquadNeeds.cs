using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the team-squad-needs wrapper without editing the shared file.
public sealed partial class NativeGameEngine
{
    public TeamSquadNeeds GetTeamSquadNeeds(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_squad_needs(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamSquadNeeds>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
