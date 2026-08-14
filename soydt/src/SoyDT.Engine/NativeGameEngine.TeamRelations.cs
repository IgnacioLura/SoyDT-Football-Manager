using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team relations wrapper — see engine-ffi/src/team_relations.rs. Sibling
/// file to NativeGameEngine.cs, same DangerousAddRef/DangerousGetHandle/
/// finally-DangerousRelease pattern as every other export on that class.
public sealed partial class NativeGameEngine
{
    public TeamRelations GetTeamRelations(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_relations(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamRelations>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
