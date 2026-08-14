using SoyDT.Domain;

namespace SoyDT.Engine;

/// Player-matches wrapper — see NativeGameEngine.cs for the shared
/// DangerousAddRef/Release pattern this sibling file follows.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<PlayerMatchItem> GetPlayerMatches(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_matches(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<List<PlayerMatchItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
