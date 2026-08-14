using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class NativeGameEngine
{
    public IReadOnlyList<PlayerHistoryRow> GetPlayerHistory(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_history(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<List<PlayerHistoryRow>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
