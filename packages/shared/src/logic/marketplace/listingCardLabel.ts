export interface ListingCardLabelParts {
  title: string;
  category?: string | null;
  price?: string | null;
  isVerifiedSeller?: boolean;
  freshness?: string | null;
  sponsored?: boolean;
}

/**
 * What a screen reader reads for a listing card: the facts the card shows, in
 * the order it shows them, e.g. "Rice cooker, $40, verified seller, 2d ago".
 */
export function listingCardLabel(parts: ListingCardLabelParts): string {
  return [
    parts.title,
    parts.category,
    parts.price,
    parts.isVerifiedSeller && 'verified seller',
    parts.freshness,
    parts.sponsored && 'sponsored',
  ]
    .filter(Boolean)
    .join(', ');
}
