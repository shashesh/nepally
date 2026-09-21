function formatDollars(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

/**
 * `price` is a free-text column. A number reads as dollars — "80" is "$80",
 * "80.5" is "$80.50" — and anything else ("Negotiable") is shown as typed.
 */
export function formatListingPrice(price: string | number | null | undefined): string | null {
  if (price === null || price === undefined) return null;

  if (typeof price === 'number') {
    return Number.isFinite(price) ? formatDollars(price) : null;
  }

  const trimmed = price.trim();
  if (trimmed === '') return null;

  const stripped = trimmed.replace(/[$,]/g, '');
  const numeric = Number(stripped);

  return stripped !== '' && Number.isFinite(numeric) ? formatDollars(numeric) : trimmed;
}
