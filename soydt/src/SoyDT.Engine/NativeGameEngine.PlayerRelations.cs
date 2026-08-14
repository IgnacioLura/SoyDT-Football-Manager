using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player relations wrapper — see engine-ffi/src/player_relations.rs. Sibling
/// file to NativeGameEngine.cs, same DangerousAddRef/DangerousGetHandle/
/// finally-DangerousRelease pattern as every other export on that class.
public sealed partial class NativeGameEngine
{
    public PlayerRelations GetPlayerRelations(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_relations(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<PlayerRelations>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
