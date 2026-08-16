using SoyDT.Domain;

namespace SoyDT.Engine;

/// Cups + continental-competition wrapper — see engine-ffi/src/cups.rs and
/// engine-ffi/src/continental.rs. Sibling file to NativeGameEngine.cs, same
/// SafeHandle pattern as every other export on that class.
public sealed partial class NativeGameEngine
{
    public IReadOnlyList<CupListItem> GetCups(GameHandleSafeHandle game)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_cups(game.DangerousGetHandle());
            return NativeStringMarshal.ReadEnvelope<IReadOnlyList<CupListItem>>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public CupBracket GetCupBracket(GameHandleSafeHandle game, uint cupId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_cup_bracket(game.DangerousGetHandle(), cupId);
            return NativeStringMarshal.ReadEnvelope<CupBracket>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }

    public ContinentalCompetition GetContinentalCompetition(GameHandleSafeHandle game, string competition)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_continental_competition(game.DangerousGetHandle(), competition);
            return NativeStringMarshal.ReadEnvelope<ContinentalCompetition>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
