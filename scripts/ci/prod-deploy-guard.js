/**
 * Guard for .github/workflows/deploy-vercel-prod.yml: only deploy a master head
 * that CI has vouched for.
 *
 * CI skips docs-only commits (paths-ignore in ci.yml), so the head of master may
 * have no CI run of its own. The deploy is allowed when the latest successful CI
 * run on master is for the head, or for an ancestor followed only by docs-only
 * commits. Decision record: docs/decisions/2026-09-19-ci-actions-minute-budget.md.
 */

/** Paths CI ignores. Must equal both `paths-ignore` lists in ci.yml; prod-deploy-guard.test.js checks it. */
const DOCS_ONLY_PATHS = ['**/*.md', 'docs/**'];

/** GitHub's compare API returns at most this many files, so a full page can hide a code change. */
const COMPARE_FILE_LIMIT = 300;

/** CI runs on master that test master itself. Pull request runs report their own head branch, never master. */
const MASTER_EVENTS = new Set(['push', 'workflow_dispatch']);

const RUN_CI_ON_MASTER = 'Run Actions → CI → Run workflow on master, then retry.';

function isDocsOnlyPath(filePath) {
  return filePath.endsWith('.md') || filePath.startsWith('docs/');
}

function allow(reason) {
  return { ok: true, reason };
}

function block(reason) {
  return { ok: false, reason };
}

/**
 * @param {object} input
 * @param {string} input.headSha            master commit about to be deployed
 * @param {string | undefined} input.testedSha  head of the latest successful CI run on master
 * @param {{ status: string, files?: { filename: string, previous_filename?: string }[] } | null} input.comparison
 *        GitHub compare of testedSha...headSha; null when the two are equal
 */
function evaluateDeployable({ headSha, testedSha, comparison }) {
  if (!testedSha) {
    return block(`No successful CI run on master found. ${RUN_CI_ON_MASTER}`);
  }
  if (testedSha === headSha) {
    return allow(`CI passed on ${headSha}.`);
  }
  if (!comparison || comparison.status !== 'ahead') {
    return block(
      `The last commit CI passed on (${testedSha}) is not an ancestor of master (${headSha}), ` +
        `so its result says nothing about what would ship. ${RUN_CI_ON_MASTER}`
    );
  }

  const files = comparison.files ?? [];
  if (files.length >= COMPARE_FILE_LIMIT) {
    return block(
      `Too many files changed since the last green CI run (${testedSha}) to prove they are docs only. ` +
        RUN_CI_ON_MASTER
    );
  }

  const untested = files
    .flatMap((file) => [file.filename, file.previous_filename])
    .filter((filePath) => filePath && !isDocsOnlyPath(filePath));
  if (untested.length > 0) {
    return block(
      `CI has not passed on master (${headSha}) yet. The last green run was on ${testedSha}, ` +
        `and code changed since: ${[...new Set(untested)].join(', ')}. ` +
        'Wait for CI on master to finish (or fix it), then retry.'
    );
  }

  return allow(
    `CI passed on ${testedSha}; the commits after it up to ${headSha} change docs only.`
  );
}

/** Entry point for actions/github-script. */
async function run({ github, context, core, headSha }) {
  const { owner, repo } = context.repo;
  const { data } = await github.rest.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: 'ci.yml',
    branch: 'master',
    status: 'success',
    per_page: 20,
  });
  const testedSha = data.workflow_runs.find((ciRun) => MASTER_EVENTS.has(ciRun.event))?.head_sha;

  let comparison = null;
  if (testedSha && testedSha !== headSha) {
    ({ data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${testedSha}...${headSha}`,
    }));
  }

  const verdict = evaluateDeployable({ headSha, testedSha, comparison });
  if (verdict.ok) {
    core.info(verdict.reason);
  } else {
    core.setFailed(verdict.reason);
  }
}

module.exports = { DOCS_ONLY_PATHS, COMPARE_FILE_LIMIT, isDocsOnlyPath, evaluateDeployable, run };
