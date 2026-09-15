#!/usr/bin/env node
/**
 * Runs the web visual-regression projects inside the official Playwright
 * Docker image, so screenshots match CI regardless of the host OS.
 *
 *   npm run test:visual:docker --workspace=apps/web
 *   npm run test:visual:docker --workspace=apps/web -- --update
 *   npm run test:visual:docker --workspace=apps/web -- --update --write-a11y-baseline
 *
 * Linux node_modules live in named Docker volumes so the host install is
 * never overwritten.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const playwrightPkg = JSON.parse(
  readFileSync(path.join(repoRoot, 'node_modules', '@playwright', 'test', 'package.json'), 'utf8')
);
const image = `mcr.microsoft.com/playwright:v${playwrightPkg.version}-noble`;

const update = process.argv.includes('--update');
const writeA11yBaseline = process.argv.includes('--write-a11y-baseline');

const playwrightArgs = ['--project=visual-desktop', '--project=visual-phone'];
if (update) playwrightArgs.push('--update-snapshots');
if (writeA11yBaseline) playwrightArgs.push('--workers=1');

const mounts = [
  `type=bind,source=${repoRoot},target=/work`,
  'type=volume,source=nepally-visual-root-modules,target=/work/node_modules',
  'type=volume,source=nepally-visual-web-modules,target=/work/apps/web/node_modules',
  'type=volume,source=nepally-visual-mobile-modules,target=/work/apps/mobile/node_modules',
  'type=volume,source=nepally-visual-shared-modules,target=/work/packages/shared/node_modules',
  'type=volume,source=nepally-visual-next-build,target=/work/apps/web/.next',
];

const env = {
  CI: '1',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-anon-key',
  ...(writeA11yBaseline ? { A11Y_BASELINE_WRITE: '1' } : {}),
};

const command = `npm ci && cd apps/web && npx playwright test ${playwrightArgs.join(' ')}`;

const dockerArgs = [
  'run',
  '--rm',
  '--ipc=host',
  '--workdir',
  '/work',
  ...mounts.flatMap((mount) => ['--mount', mount]),
  ...Object.entries(env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
  image,
  'bash',
  '-lc',
  command,
];

console.log(`Running visual tests in ${image}${update ? ' (updating snapshots)' : ''}`);
const result = spawnSync('docker', dockerArgs, { stdio: 'inherit' });
if (result.error) {
  console.error(`Could not start Docker: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
