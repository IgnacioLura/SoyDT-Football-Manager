using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-transfers export — see NativeGameEngine.cs for the shared
/// DangerousAddRef/Release convention this file follows.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<PlayerTransferItem> GetPlayerTransfers(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_transfers(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<List<PlayerTransferItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
