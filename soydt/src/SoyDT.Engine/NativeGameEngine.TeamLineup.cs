using System.Text.Json;
using SoyDT.Domain;

namespace SoyDT.Engine;

/// DT lineup wrapper — see engine-ffi/src/team_lineup.rs. Sibling file to
/// NativeGameEngine.cs, same SafeHandle pattern as every other export.
public sealed partial class NativeGameEngine
{
    // `SnakeCaseLower` matches `NativeStringMarshal`'s response-decoding
    // policy, so the outgoing arg shape (`player_ids`) lines up with what
    // `team_lineup.rs`'s `SetLineupArgs` (serde, no rename_all — expects
    // the field name as-written) actually deserializes.
    private static readonly JsonSerializerOptions ArgsJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private sealed record SetLineupArgsWire(IReadOnlyList<uint> PlayerIds);

    public TeamLineup GetTeamLineup(GameHandleSafeHandle game, uint teamId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_team_lineup(game.DangerousGetHandle(), teamId);
            return NativeStringMarshal.ReadEnvelope<TeamLineup>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public void SetTeamLineup(GameHandleSafeHandle game, uint teamId, IReadOnlyList<uint> playerIds)
    {
        var argsJson = JsonSerializer.Serialize(new SetLineupArgsWire(playerIds), ArgsJsonOptions);
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_set_team_lineup(game.DangerousGetHandle(), teamId, argsJson);
            NativeStringMarshal.ReadEnvelopeNullable<object>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
