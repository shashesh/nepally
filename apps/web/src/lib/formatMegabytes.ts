/**
 * Rounds a byte count to whole megabytes for user-facing size copy, e.g.
 * `formatMegabytes(15 * 1024 * 1024) === '15MB'`. Shared by ImageUploader and
 * ProfilePhotoControl so their size-limit copy stays in sync.
 */
export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
