using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class NativeGameEngine
{
    public PlayerContract? GetPlayerContract(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_contract(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelopeNullable<PlayerContract>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
