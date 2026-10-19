# Review and history rewrite — 2026-10-14

Changed the rerun history-switch catch to show exactly one toast including the error detail, and reviewed the full branch diff and tests. No additional correctness fixes were identified. The run form still renders after a failed switch. A switch skipped because another switch is in progress retains the existing generic toast. Tests check success ordering and props, a permanent rerun-data error, a skipped switch, retry loading, and a rejected switch with one detailed toast.

Not acted on: the separate owned-workflow counts API proposal remains outside this client-only branch. No new live rate-limited-server measurements were made. The prior human-read checkbox was left as the user set it; newly added tests still need a human read before approval.

## Read the commits in this order

Base: latest fetched `origin/release_26.1`, `933e342ad1d8d618cb616b9fbfb51ae9db4a749c`.

1. [`c914bcee537`](https://github.com/jmchilton/galaxy/commit/c914bcee537) — baseline component tests, no production changes. Seven tests across DatasetPopoverLink, invocation grids, workflow card badges, and WorkflowRerun pass on the release implementation.
2. [`2eaa5fed2ce`](https://github.com/jmchilton/galaxy/commit/2eaa5fed2ce) — regression tests and updates to existing expectations for retry behavior. Against the unchanged production code: 41 failed / 65 passed across 12 files (11 failing suites). The grid also produces two expected unhandled rejections, demonstrating the fire-and-forget failure. Failures include 1000/1000/1000 ms concurrent retries instead of 500/750/1000, extra requests during backoff, hidden counts, prematurely visible errors, and rerun failure handling. Existing behavior safeguards accompany the regressions; not every added assertion is expected to fail.
3. [`5ce39226753`](https://github.com/jmchilton/galaxy/commit/5ce39226753) — production fix and new-helper unit tests. The helper tests live here because their modules/exports do not exist before the fix. Consumer tests use explicit timing expectations so the red commit fails on behavior rather than missing helper imports.

The branch was first squashed and rebased without conflicts, then split into these three commits. The upstream datatype PR already supplies sharedPromise and its tests; those files are no longer in this branch diff. Local backup `backup/issue_23977_fanout_before_restructure_20261014` preserves the old history plus the toast change. The fork was force-pushed with an explicit lease on old head `423bd6a3ec23606d4d112585bdb3ae4decea4819`.

## Validation

Node 22.20.0, final implementation:

- Changed suites: 14 files / 123 tests passed.
- Surrounding API client, composable, store, Common, Grid, History Export, Markdown Elements, PageEditor, Workflow List/Run, and WorkflowInvocationState suites: 121 files / 980 tests passed. This overlaps the changed suites; counts are not additive.
- `vue-tsc --noEmit`: passed.
- Pre-commit with `.pre-commit-config.yaml.sample` over every changed file: passed, including client ESLint and Prettier.
- `git diff --check`: passed; Galaxy worktree clean after commit.

The system Node 25 runtime initially failed before test collection because window.localStorage.getItem was unavailable. Switching to the branch's previously validated Node 22 runtime resolved the environment issue. An intermediate lint run caught a numeric separator incompatible with the JavaScript test parser; the red test uses 30000 instead.

<details>
<summary>Review scope and limitations</summary>

Read the complete production and test diff, then followed the retry gate through keyed caches, history/collection stores, and rendered loading/error consumers. Checked propagation of the last middleware response and Retry-After, shared workflow-fetch rejection and cleanup, lazy counts gating, and rerun history-switch behavior. Existing regression tests cover recovery, exhaustion, reactive retry wakeup, hidden popovers, and cached summaries missing details. No new end-to-end or browser run was performed for this follow-up. This was a single-agent review.

GitHub queried 2026-10-14: no upstream PR exists for this head. Fork CI on `5ce39226753` has started queuing, including [Main tool tests](https://github.com/jmchilton/galaxy/actions/runs/38673023907), [Database indexes](https://github.com/jmchilton/galaxy/actions/runs/38673023919), and [Test Galaxy packages](https://github.com/jmchilton/galaxy/actions/runs/38673023909). Status remains branches_ready_for_final_review, with the new SHA requiring human approval.

</details>
