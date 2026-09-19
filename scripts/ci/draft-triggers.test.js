const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Draft PRs must cost no Actions minutes: docs/decisions/2026-09-19-ci-actions-minute-budget.md.
const DRAFT_AWARE_WORKFLOWS = ['ci.yml', 'docs.yml', 'preview-vercel.yml'];
const PR_TYPES = ['opened', 'synchronize', 'reopened', 'ready_for_review', 'converted_to_draft'];
const DRAFT_GUARD = 'if: ${{ !github.event.pull_request.draft }}';

function readWorkflow(file) {
  return fs
    .readFileSync(path.join(__dirname, '../../.github/workflows', file), 'utf8')
    .split(/\r?\n/);
}

for (const file of DRAFT_AWARE_WORKFLOWS) {
  test(`${file} starts on ready_for_review and cancels in-flight runs on converted_to_draft`, () => {
    const typesLine = readWorkflow(file).find((line) => line.trim().startsWith('types:'));
    assert.ok(typesLine, `${file} has no pull_request types`);
    const types = typesLine
      .trim()
      .replace(/^types:\s*\[|\]$/g, '')
      .split(/,\s*/);
    assert.deepEqual(types, PR_TYPES);
  });

  test(`${file} skips every job while the PR is a draft`, () => {
    const lines = readWorkflow(file);
    const jobsStart = lines.indexOf('jobs:');
    const jobs = lines.slice(jobsStart + 1).filter((line) => /^ {2}[A-Za-z0-9_-]+:$/.test(line));
    const guards = lines.slice(jobsStart + 1).filter((line) => line === `    ${DRAFT_GUARD}`);
    assert.ok(jobs.length > 0, `${file} has no jobs`);
    assert.equal(guards.length, jobs.length, `every job in ${file} needs "${DRAFT_GUARD}"`);
  });
}
