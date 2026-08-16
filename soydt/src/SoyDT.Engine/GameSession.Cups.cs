using SoyDT.Domain;

namespace SoyDT.Engine;

public sealed partial class GameSession
{
    public IReadOnlyList<CupListItem> GetCups() => WithGame((e, h) => e.GetCups(h));
    public CupBracket GetCupBracket(uint cupId) => WithGame((e, h) => e.GetCupBracket(h, cupId));
    public ContinentalCompetition GetContinentalCompetition(string competition) => WithGame((e, h) => e.GetContinentalCompetition(h, competition));
}
