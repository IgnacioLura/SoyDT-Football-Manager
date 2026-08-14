using SoyDT.Domain;

namespace SoyDT.Engine;

/// Staff wrapper — see GameSession.cs for the shared `WithGame` helper this
/// sibling file uses.
public sealed partial class GameSession
{
    public StaffDetail GetStaff(uint staffId) => WithGame((e, h) => e.GetStaff(h, staffId));

    public StaffPersonal GetStaffPersonal(uint staffId) => WithGame((e, h) => e.GetStaffPersonal(h, staffId));
}
