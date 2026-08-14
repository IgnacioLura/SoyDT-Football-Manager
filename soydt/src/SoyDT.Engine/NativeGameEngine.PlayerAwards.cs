using SoyDT.Domain;

namespace SoyDT.Engine;

/// Sibling partial to `NativeGameEngine.cs` — kept in its own file to avoid
/// touching the file other workers are editing.
public sealed partial class NativeGameEngine
{
    public PlayerAwardsSummary GetPlayerAwards(GameHandleSafeHandle game, uint playerId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_player_awards(game.DangerousGetHandle(), playerId);
            return NativeStringMarshal.ReadEnvelope<PlayerAwardsSummary>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
