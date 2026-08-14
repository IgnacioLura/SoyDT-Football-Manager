using SoyDT.Domain;

namespace SoyDT.Engine;

/// On-demand match simulation wrapper — see engine-ffi/src/match_detail.rs.
/// Sibling file to NativeGameEngine.cs, same DangerousAddRef/
/// DangerousGetHandle/finally-DangerousRelease pattern as every other
/// export on that class.
public sealed partial class NativeGameEngine
{
    public MatchDetail SimulateTeamMatch(GameHandleSafeHandle game, uint homeTeamId, uint awayTeamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_simulate_team_match(game.DangerousGetHandle(), homeTeamId, awayTeamId);
            return NativeStringMarshal.ReadEnvelope<MatchDetail>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
