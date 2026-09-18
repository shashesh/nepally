#!/usr/bin/env node
/**
 * Runs the visual projects without taking screenshots, on any OS. It proves
 * every catalogued page reaches its ready state before baselines are generated
 * in Docker/CI. Invoked from apps/web via `npm run test:visual:smoke`.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['playwright', 'test', '--project=visual-desktop', '--project=visual-phone'], {
  stdio: 'inherit',
  shell: true,
  // E2E_FIXED_NOW keeps equal to VISUAL_NOW_ISO in apps/web/e2e/visual/helpers.ts, which asserts it.
  env: { ...process.env, VISUAL_FORCE: '1', VISUAL_SMOKE: '1', E2E_FIXED_NOW: '2026-09-14T12:00:00Z' },
});

process.exit(result.status ?? 1);
