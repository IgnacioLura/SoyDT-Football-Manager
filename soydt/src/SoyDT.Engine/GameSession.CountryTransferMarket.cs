using SoyDT.Domain;

namespace SoyDT.Engine;

/// New sibling file to `GameSession.cs` (see that file's remarks) — adds
/// the country-transfer-market accessor via the shared `WithGame` helper
/// rather than editing the shared file.
public sealed partial class GameSession
{
    public CountryTransferMarket GetCountryTransferMarket(uint countryId) =>
        WithGame((e, h) => e.GetCountryTransferMarket(h, countryId));
}
