using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class NativeGameEngine
{
    public PlayerPersonal GetPlayerPersonal(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_personal(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<PlayerPersonal>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
