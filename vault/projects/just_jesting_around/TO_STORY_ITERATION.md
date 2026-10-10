Each iteration moves one readability-reviewed test onto Storybook stories on `vitest_stories`, which is stacked on `vitest_readability`. Lane rules and ledger fields are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md).

Reuse the same branch and worktree for every iteration.

## Rebase

Rebase `vitest_stories` onto `jmchilton/vitest_readability`.
- Resolve conflicts so that both lanes' intent survives.
- Don't select a test until the lane is green: every story-backed test (`git grep -l useStoryMount -- '*.test.*'`) passes and `vue-tsc` is clean.

## Select

Pick the most recent test commit on `vitest_readability` whose `jest_tests.yml` entry has no `storified` field. Find commits through their `Test-File:` trailer.

## Decide

Decide whether the test should become stories. Use the split in [plan_vitest_addon.md](plan_vitest_addon.md#split-to-aim-for):
- **Storify:** components whose setup (stores, API mocks, router, props) describes scenarios a person would want to look at.
  Props alone count when they produce visibly different states (QuotaUsageSummary: finite total vs unlimited).
- **Skip:** logic, stores, composables and API-client tests, and components with one state nobody would browse.

When skipping, set `storified: skip` (only that field), log the reason, and end the iteration.

## Convert

- Follow [STORY_CONVENTIONS.md](STORY_CONVENTIONS.md). FormData, FilesDialog and HistoryExportWizard are the reference conversions.
- Keep every original assertion. Splitting a case or strengthening a weak check is welcome (note it in the log); weakening or dropping one needs John's approval.
- Reuse existing handlers, fixtures and story helpers before adding new ones.

If the conversion needs a Storybook change (preview, story-mount helper, shared mock handlers), commit that first, separately, and check that existing stories still render.

## Validate

- Run the converted test with `vitest run` (this lane has no projects yet).
- Render its stories in the `storybook` browser project, which lives on `vitest_story_play`. Cherry-pick the commit into a disposable worktree cut from that branch, give it its own `pnpm install --frozen-lockfile --offline` (a symlinked `node_modules` doesn't work), run `--project storybook`, then remove the worktree.
- Run type-checking, lint and formatting.
- Have an independent subagent confirm that the original assertions survive and that the stories are readable on their own.

## Record

- Commit the test and its stories together, with a `Test-File: <path>` trailer. Push the lane once validation and review pass.
- Set `storified: true` in `jest_tests.yml`, and change no other field.
- Append a row to [STORY_LOG.md](STORY_LOG.md) with the test, the decision, the reason and the line counts before and after.
- Put pattern lessons in the row too. The driver decides whether a recurring lesson belongs in client testing guidance.
