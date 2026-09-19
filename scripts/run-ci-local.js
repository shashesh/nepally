#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const isDryRun = process.argv.includes('--dry-run');

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-placeholder-anon-key',
};

const steps = [
  { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'Lint guards', command: 'npm', args: ['run', 'lint:guards'] },
  { name: 'Type check', command: 'npm', args: ['run', 'type-check'] },
  // test:coverage:ci is GitHub CI's unit-test job: guard tests, then every workspace's
  // tests with coverage. Mobile runs with --ci --runInBand (serial, single process),
  // which exposes timer/act()-scope leaks that parallel execution hides.
  { name: 'Unit tests + coverage (CI mode)', command: 'npm', args: ['run', 'test:coverage:ci'] },
  {
    name: 'Web E2E tests',
    command: 'npm',
    args: ['run', 'test:e2e', '--workspace=apps/web'],
    env,
  },
];

function runStep(step, index, total) {
  const prefix = `[${index}/${total}]`;
  const cmdText = `${step.command} ${step.args.join(' ')}`;

  console.log(`\n${prefix} ${step.name}`);
  console.log(`$ ${cmdText}`);

  if (isDryRun) {
    return 0;
  }

  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: step.env || process.env,
  });

  if (typeof result.status === 'number') {
    return result.status;
  }

  return 1;
}

console.log('Assuming dependencies and Playwright browsers are already installed locally.');

for (let i = 0; i < steps.length; i += 1) {
  const step = steps[i];
  const exitCode = runStep(step, i + 1, steps.length);

  if (exitCode !== 0) {
    console.error(`\nCI local run failed at step: ${step.name}`);
    process.exit(exitCode);
  }
}

console.log('\nCI local run completed successfully.');
