/**
 * Files that still render raw <button>/<input>/<select>/<textarea>.
 * Each web UI overhaul area PR removes its files; delete the list when empty.
 * Regenerate: node apps/web/eslint/write-raw-element-allowlist.mjs
 */
export const RAW_ELEMENT_ALLOWLIST = [
  "src/pages/login.page.tsx",
  "src/pages/marketplace/listing/promote/[id].page.tsx",
  "src/pages/marketplace/my-listings.page.tsx",
  "src/pages/messages/[id].page.tsx",
  "src/pages/onboarding/zip.page.tsx",
  "src/pages/profile/notifications.page.tsx",
  "src/pages/signup.page.tsx",
  "src/pages/verify-email.page.tsx"
];
