using System.Text.Json;

namespace SoyDT.Engine;

/// AI-agent data-access wrapper — see engine-ffi/src/ai_tools.rs. Returns
/// the raw JSON text of each export's `data` payload rather than a typed
/// DTO: these results are handed straight back to the LLM as a tool-call
/// result string (see SoyDT.Api.Ai.AiToolsDispatcher), never deserialized
/// into a C# object on this side. Sibling file to NativeGameEngine.cs, same
/// DangerousAddRef/DangerousGetHandle/finally-DangerousRelease pattern as
/// every other export on that class.
public sealed partial class NativeGameEngine
{
    public string AiGetClub(GameHandleSafeHandle game, uint clubId) =>
        RunAiToolExport(game, h => NativeMethods.engine_ai_get_club(h, clubId));

    public string AiGetClubPlayers(GameHandleSafeHandle game, uint clubId) =>
        RunAiToolExport(game, h => NativeMethods.engine_ai_get_club_players(h, clubId));

    public string AiGetPlayer(GameHandleSafeHandle game, uint playerId) =>
        RunAiToolExport(game, h => NativeMethods.engine_ai_get_player(h, playerId));

    private static string RunAiToolExport(GameHandleSafeHandle game, Func<IntPtr, IntPtr> call)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = call(game.DangerousGetHandle());
            var element = NativeStringMarshal.ReadEnvelope<JsonElement>(resultPtr);
            return element.GetRawText();
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
