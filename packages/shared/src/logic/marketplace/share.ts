import { WEB_BASE_URL } from '../../constants/appConfig';

/** The listing's page on the web, for sharing until the app has deep links. */
export function listingWebUrl(listingId: string): string {
  return `${WEB_BASE_URL}/marketplace/listing/${encodeURIComponent(listingId)}`;
}
