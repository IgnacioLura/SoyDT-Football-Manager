namespace SoyDT.Domain;

/// One row of a club team's staff roster — mirrors the original app's team
/// staff tab, but as a single flat list rather than the original's
/// 6-bucket role grouping (management/coaching/medical/scouting/
/// boardroom/media). See `engine-ffi/src/team_staff.rs` for the export
/// this is deserialized from.
public sealed record TeamStaffMember(
    uint Id,
    string FirstName,
    string LastName,
    string Role,
    string CountryCode,
    string CountryName,
    byte Age,
    double Wage);
