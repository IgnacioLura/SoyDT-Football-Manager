using SoyDT.Domain;

namespace SoyDT.Engine;

/// Team-scoped transfers accessor — see engine-ffi/CONTRACT.md.
public sealed partial class GameSession
{
    public TeamTransfers GetTeamTransfers(uint teamId) => WithGame((e, h) => e.GetTeamTransfers(h, teamId));
}
