# mvdbeek review response — 2026-10-27

Implemented all seven points from the review of `d0b76746d47` in commit [`0e46a8984b4`](https://github.com/jmchilton/galaxy/commit/0e46a8984b40f4c52d798e3f44c9893ad995a618), pushed to `jmchilton:issue_24173_invocation_selection_urls`. No rebase: the open PR was mergeable against its actual base, `dev`.

## Changes

- Added missing `order_index` values to dev's polling/input graph fixtures; restored `@selenium_test` on the mapped-job URL test.
- Wait for the output provider's rendered content before scrolling a URL target. Dataset and collection tests hold the provider response pending and confirm that scrolling happens only after content renders.
- Notify the Steps list before local card/tab/job/output selections change the selected step. Preserve the search and position for those interactions; retain revealing/scrolling for external navigation. Bind the input to the actual query. Test both navigation origins.
- Pass `true` only for the URL's output target and `undefined` for other outputs, preserving local expansion. Clear the URL only when the target itself collapses. Cover inactive steps and other outputs leaving the URL intact.
- Fix feedback's final positional invocation-step lookup, with a regression that deliberately reverses invocation steps and assigns different job states.
- Build `Map` lookups outside the graph-polling, Steps-search, and feedback loops.

All suggestions were accepted. No pushback report or follow-up issue was needed. [Suggested replies](review_response_mvdbeek_1.md) are prepared for John; no GitHub comments were posted and no review threads were resolved. John's final read-through remains pending. The PR was already non-draft when this work began.

## Validation

- `NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run src/composables/useInvocationGraph.test.ts src/composables/invocationSelection.test.ts src/components/History/Content/GenericItem.test.ts src/components/Workflow/Invocation src/components/WorkflowInvocationState`: **17 files, 148 tests passed**, including 39/39 graph tests.
- Worktree-owned Galaxy :8091 and Vite :5181 via `jmchilton:galaxy-playwright`: `test_mapped_job_selection_urls` and `test_output_urls_expand_outputs` both **passed** (105.88 seconds). The latter retains the real viewport assertion that failed in CI.
- Quiet ESLint across all changed client files, `git diff --check`, and all commit hooks passed (Black, Ruff, Flake8, Prettier, client ESLint, and repository hygiene checks).
- `make validate` in galaxy-brain: **127 files, 0 errors, 15 advisory warnings**.
- Live GitHub head confirmed as `0e46a8984b40f4c52d798e3f44c9893ad995a618`; CI queued/running at 2026-10-27 16:18 UTC. Full remote CI has not completed.

## Revision snapshot

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24173_invocation_selection_urls/differential-review/snapshots/20261027T161822Z-revision-0e46a8984b40.json
  revision @ 0e46a8984b40 vs origin/dev (merge-base f1772b6775de)
  first snapshot: 15 commits, 33 files, 102 hunks
```

## Posting follow-up — 2026-10-27

John authorized posting and specified GPT-6.1-Sol at medium effort. Updated all six attributions and posted the five inline replies plus the [summary](https://github.com/galaxyproject/galaxy/pull/24307#issuecomment-6448179712). [Reply links](review_response_mvdbeek_1.md#posted-links) are recorded. No review thread was resolved. Rechecked `0e46a8984b4`: every check that ran passed, with only the report aggregation check skipped. Updated the posted summary to report green CI. John's final read-through remains pending.
