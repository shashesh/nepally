/**
 * The message a buyer's chat with a seller starts with, naming the listing so
 * the seller knows which one it's about. The buyer can edit it before sending.
 */
export function listingInquiryDraft(title: string): string {
  return `Hi, is “${title.trim()}” still available?`;
}
