namespace SoyDT.Domain;

/// Mirrors `engine_get_country_transfer_market`'s `data` payload (see
/// engine-ffi/CONTRACT.md). Only `Available`/`InNegotiation` listings are
/// included — completed/cancelled listings are historical noise here.
public sealed record TransferListing(
    uint PlayerId,
    string PlayerName,
    string Position,
    byte Age,
    uint TeamId,
    string TeamName,
    string TeamSlug,
    double AskingPrice,
    string ListingType,
    string Status,
    string ListedDate);

public sealed record CountryTransferMarket(
    bool TransferWindowOpen,
    IReadOnlyList<TransferListing> Listings);
