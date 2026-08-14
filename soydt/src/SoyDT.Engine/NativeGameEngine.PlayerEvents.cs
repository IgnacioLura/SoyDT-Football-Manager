using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-events export — see NativeGameEngine.cs for the shared
/// DangerousAddRef/Release convention this file follows.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<PlayerEventItem> GetPlayerEvents(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_events(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<List<PlayerEventItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
