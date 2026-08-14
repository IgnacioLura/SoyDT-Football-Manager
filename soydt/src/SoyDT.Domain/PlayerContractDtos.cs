namespace SoyDT.Domain;

/// Core contract terms for one player — simplified scope: loan sub-detail,
/// bonuses, and clauses are intentionally omitted (see MIGRATION_CHECKLIST.md).
public sealed record PlayerContract(
    string ClubName,
    byte? ShirtNumber,
    string ContractType,
    string SquadStatus,
    double SalaryWeekly,
    double SalaryAnnual,
    string? Started,
    string Expiration,
    bool IsTransferListed);
