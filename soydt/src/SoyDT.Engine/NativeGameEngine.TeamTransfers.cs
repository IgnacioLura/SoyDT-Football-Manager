using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team-scoped transfers wrapper — see engine-ffi/CONTRACT.md.
public sealed partial class NativeGameEngine
{
    public TeamTransfers GetTeamTransfers(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_transfers(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamTransfers>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
