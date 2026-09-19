const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  DOCS_ONLY_PATHS,
  COMPARE_FILE_LIMIT,
  isDocsOnlyPath,
  evaluateDeployable,
  run,
} = require('./prod-deploy-guard');

const WORKFLOWS = path.join(__dirname, '../../.github/workflows');
const HEAD = 'head000';
const TESTED = 'tested0';

/** Returns every `- '<glob>'` item listed under `key:` in a workflow file, one array per occurrence. */
function readPathLists(workflowFile, key) {
  const lines = fs.readFileSync(path.join(WORKFLOWS, workflowFile), 'utf8').split(/\r?\n/);
  const lists = [];
  lines.forEach((line, index) => {
    if (line.trim() !== `${key}:`) return;
    const indent = line.search(/\S/);
    const items = [];
    for (const next of lines.slice(index + 1)) {
      if (next.trim() === '' || next.trim().startsWith('#')) continue;
      if (next.search(/\S/) <= indent) break;
      const item = next.trim().match(/^- '([^']+)'$/);
      if (item) items.push(item[1]);
    }
    lists.push(items);
  });
  return lists;
}

test('treats markdown anywhere and everything under docs/ as docs-only', () => {
  for (const file of [
    'README.md',
    'CLAUDE.md',
    'apps/web/README.md',
    '.github/pull_request_template.md',
    'docs/INDEX.md',
    'docs/wireframes/feed.png',
  ]) {
    assert.equal(isDocsOnlyPath(file), true, file);
  }
});

test('treats code, config and workflow files as code', () => {
  for (const file of [
    'apps/web/src/pages/index.page.tsx',
    'package.json',
    'package-lock.json',
    '.github/workflows/ci.yml',
    'scripts/docs/cli.js',
    'supabase/migrations/037_x.sql',
    'apps/docs/index.ts',
    'README.md.bak',
  ]) {
    assert.equal(isDocsOnlyPath(file), false, file);
  }
});

test('ci.yml skips exactly the docs-only paths, on pull requests and on master pushes', () => {
  assert.deepEqual(readPathLists('ci.yml', 'paths-ignore'), [DOCS_ONLY_PATHS, DOCS_ONLY_PATHS]);
});

test('docs.yml still runs for every change ci.yml skips', () => {
  const docsTriggers = readPathLists('docs.yml', 'paths');
  assert.equal(docsTriggers.length, 2);
  for (const triggerPaths of docsTriggers) {
    for (const docsOnly of DOCS_ONLY_PATHS) {
      assert.ok(triggerPaths.includes(docsOnly), `docs.yml does not trigger on ${docsOnly}`);
    }
  }
});

test('allows the deploy when CI passed on the master head itself', () => {
  const verdict = evaluateDeployable({ headSha: HEAD, testedSha: HEAD, comparison: null });
  assert.equal(verdict.ok, true);
});

test('allows the deploy when every commit after the last green CI run changes docs only', () => {
  const comparison = {
    status: 'ahead',
    files: [{ filename: 'docs/guides/deployment.md' }, { filename: 'README.md' }],
  };
  const verdict = evaluateDeployable({ headSha: HEAD, testedSha: TESTED, comparison });
  assert.equal(verdict.ok, true);
  assert.match(verdict.reason, /docs only/);
});

test('blocks the deploy when no CI run on master has passed', () => {
  const verdict = evaluateDeployable({ headSha: HEAD, testedSha: undefined, comparison: null });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /No successful CI run/);
});

test('blocks the deploy when code changed after the last green CI run', () => {
  const comparison = {
    status: 'ahead',
    files: [{ filename: 'README.md' }, { filename: 'apps/web/src/lib/feed.ts' }],
  };
  const verdict = evaluateDeployable({ headSha: HEAD, testedSha: TESTED, comparison });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /apps\/web\/src\/lib\/feed\.ts/);
  assert.doesNotMatch(verdict.reason, /README\.md/);
});

test('blocks the deploy when a code file was renamed into docs/', () => {
  const comparison = {
    status: 'ahead',
    files: [
      {
        filename: 'docs/old-helper.ts',
        previous_filename: 'apps/web/src/lib/helper.ts',
        status: 'renamed',
      },
    ],
  };
  const verdict = evaluateDeployable({ headSha: HEAD, testedSha: TESTED, comparison });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /apps\/web\/src\/lib\/helper\.ts/);
});

test('blocks the deploy when the last green commit is not an ancestor of the head', () => {
  const verdict = evaluateDeployable({
    headSha: HEAD,
    testedSha: TESTED,
    comparison: { status: 'diverged', files: [] },
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /not an ancestor/);
});

test('blocks the deploy when the comparison hits the file limit and cannot be trusted', () => {
  const files = Array.from({ length: COMPARE_FILE_LIMIT }, (_, index) => ({
    filename: `docs/page-${index}.md`,
  }));
  const verdict = evaluateDeployable({
    headSha: HEAD,
    testedSha: TESTED,
    comparison: { status: 'ahead', files },
  });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /Too many files/);
});

function fakeGithub({ runs, comparison }) {
  const calls = [];
  return {
    calls,
    rest: {
      actions: {
        listWorkflowRuns: async (params) => {
          calls.push(['listWorkflowRuns', params]);
          return { data: { workflow_runs: runs } };
        },
      },
      repos: {
        compareCommitsWithBasehead: async (params) => {
          calls.push(['compareCommitsWithBasehead', params]);
          return { data: comparison };
        },
      },
    },
  };
}

function fakeCore() {
  const messages = { failed: [], info: [] };
  return {
    messages,
    setFailed: (message) => messages.failed.push(message),
    info: (message) => messages.info.push(message),
  };
}

const context = { repo: { owner: 'shashesh', repo: 'nepally' } };

test('run asks for the latest successful CI runs on master', async () => {
  const github = fakeGithub({ runs: [{ head_sha: HEAD, event: 'push' }], comparison: null });
  const core = fakeCore();

  await run({ github, context, core, headSha: HEAD });

  assert.deepEqual(github.calls, [
    [
      'listWorkflowRuns',
      {
        owner: 'shashesh',
        repo: 'nepally',
        workflow_id: 'ci.yml',
        branch: 'master',
        status: 'success',
        per_page: 20,
      },
    ],
  ]);
  assert.deepEqual(core.messages.failed, []);
  assert.equal(core.messages.info.length, 1);
});

test('run trusts push and manual runs on master, not runs from other events', async () => {
  const github = fakeGithub({
    runs: [
      { head_sha: 'forkpr0', event: 'pull_request' },
      { head_sha: HEAD, event: 'workflow_dispatch' },
    ],
    comparison: null,
  });
  const core = fakeCore();

  await run({ github, context, core, headSha: HEAD });

  assert.equal(github.calls.length, 1);
  assert.deepEqual(core.messages.failed, []);
});

test('run compares the last green commit with the head and fails on code changes', async () => {
  const github = fakeGithub({
    runs: [{ head_sha: TESTED, event: 'push' }],
    comparison: { status: 'ahead', files: [{ filename: 'packages/shared/src/index.ts' }] },
  });
  const core = fakeCore();

  await run({ github, context, core, headSha: HEAD });

  assert.deepEqual(github.calls[1], [
    'compareCommitsWithBasehead',
    { owner: 'shashesh', repo: 'nepally', basehead: `${TESTED}...${HEAD}` },
  ]);
  assert.equal(core.messages.failed.length, 1);
  assert.match(core.messages.failed[0], /packages\/shared\/src\/index\.ts/);
});
