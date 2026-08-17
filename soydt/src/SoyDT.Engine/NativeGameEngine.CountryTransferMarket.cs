using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `NativeGameEngine.cs` (see that file's remarks) —
/// adds the country-transfer-market wrapper without editing the shared
/// file.
public sealed partial class NativeGameEngine
{
    public CountryTransferMarket GetCountryTransferMarket(GameHandleSafeHandle game, uint countryId)
    {
        bool addedRef = false;
        try
        {
            game.DangerousAddRef(ref addedRef);
            var resultPtr = NativeMethods.engine_get_country_transfer_market(game.DangerousGetHandle(), countryId);
            return NativeStringMarshal.ReadEnvelope<CountryTransferMarket>(resultPtr);
        }
        finally
        {
            if (addedRef) game.DangerousRelease();
        }
    }
}
