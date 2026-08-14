namespace SoyDT.Domain;

/// Mirrors `engine_get_team_finances`'s `data` payload (see
/// engine-ffi/CONTRACT.md). A simplified current-snapshot view of a club's
/// finances — no monthly history, no sponsorship contracts, no chart
/// series; just the running balance, the two optional board-set budgets,
/// and this period's income/expense category totals.
public sealed record TeamFinances(
    long Balance,
    double? TransferBudget,
    double? WageBudget,
    long IncomeTotal,
    long ExpenseTotal,
    long IncomeTv,
    long IncomeMatchday,
    long IncomeSponsorship,
    long IncomeMerchandising,
    long IncomePrizeMoney,
    long ExpensePlayerWages,
    long ExpenseStaffWages,
    long ExpenseFacilities);
