import type { ItemCondition, ListingType } from '../../types/marketplace';

/** A create/edit listing form's fields, as the member typed them. */
export interface ListingFormFields {
  listing_type: ListingType;
  title: string;
  description: string;
  category_id: string;
  price: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  website_url: string;
  item_condition: ItemCondition | undefined;
}

/**
 * The form's fields ready for `createListingSchema` and `createListing` /
 * `updateListing`, minus the photos. Every optional key is present, so an
 * edit stores null for a field that is blank or belongs to the other type.
 */
export interface ListingFormInput {
  listing_type: ListingType;
  title: string;
  description: string;
  category_id: string;
  price: string | undefined;
  business_name: string | undefined;
  address: string | undefined;
  phone: string | undefined;
  email: string | undefined;
  website_url: string | undefined;
  item_condition: ItemCondition | undefined;
}

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/** Adds `https://` to a website typed without a scheme, such as `www.mybiz.com`. */
export function withUrlScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || HAS_SCHEME.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

/**
 * Builds the listing input from the form. The type not selected sends nothing
 * for its fields, so switching Business → Individual doesn't keep the business
 * name, and the website gets a scheme before validation.
 */
export function buildListingFormInput(fields: ListingFormFields): ListingFormInput {
  const isBusiness = fields.listing_type === 'business';
  return {
    listing_type: fields.listing_type,
    title: fields.title,
    description: fields.description,
    category_id: fields.category_id,
    price: optional(fields.price),
    business_name: isBusiness ? optional(fields.business_name) : undefined,
    address: isBusiness ? optional(fields.address) : undefined,
    phone: optional(fields.phone),
    email: optional(fields.email),
    website_url: isBusiness ? optional(withUrlScheme(fields.website_url)) : undefined,
    item_condition: isBusiness ? undefined : fields.item_condition,
  };
}

/** Whether two form states hold the same values, e.g. to tell if there are unsaved changes. */
export function isSameListingForm(a: ListingFormFields, b: ListingFormFields): boolean {
  return (Object.keys(a) as (keyof ListingFormFields)[]).every((key) => a[key] === b[key]);
}

interface ValidationIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/** One message per field from a failed schema check; the first issue wins. */
export function listingFieldErrors(issues: readonly ValidationIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0]?.toString() ?? 'form';
    if (!(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
