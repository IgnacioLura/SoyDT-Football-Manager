using SoyDT.Domain;

namespace SoyDT.Engine;

/// DT manual-transfer wrapper — see engine-ffi/src/team_transfer_action.rs.
/// Sibling file to NativeGameEngine.cs, same SafeHandle pattern as every
/// other export.
public sealed partial class NativeGameEngine
{
    public TransferActionResult TransferPlayer(GameHandleSafeHandle game, uint playerId, uint fromTeamId, uint toTeamId, double fee)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_transfer_player(game.DangerousGetHandle(), playerId, fromTeamId, toTeamId, fee);
            return NativeStringMarshal.ReadEnvelope<TransferActionResult>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
