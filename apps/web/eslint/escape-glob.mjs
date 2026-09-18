/**
 * Escapes characters minimatch would treat as glob syntax so a literal file
 * path (e.g. Next.js `pages/users/[id].page.tsx`) can be used in ESLint `ignores`.
 */
export function escapeGlobLiteral(filePath) {
  return filePath.replace(/[[\]]/g, (character) => `\\${character}`);
}
