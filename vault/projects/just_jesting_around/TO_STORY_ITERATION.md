Each iteration moves one readability-reviewed test onto Storybook stories on `vitest_stories`, which is stacked on `vitest_readability`. Lane rules and ledger fields are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md).

Reuse the same branch and worktree for every iteration.

## Rebase

Rebase `vitest_stories` onto `jmchilton/vitest_readability`. Commands are in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md#lanes).
- Resolve conflicts so that both lanes' intent survives.
- Don't select a test until the lane is green: from `client/`, with the pinned node and env, `git grep -l useStoryMount -- '*.test.*' | xargs pnpm exec vitest run --project unit` and the whole `--project storybook` pass, and `pnpm type-check` is clean. If neither the lane nor its base moved since the last green gate, skip it.

## Select

Walk back from the tip of `vitest_readability` through its `Test-File:` trailers and pick the first test whose `jest_tests.yml` entry has no `storified` field. A commit with several trailers names several candidates, and a supporting test touched by a shared-code commit counts.

## Decide

Decide whether the test should become stories. Use the split in [plan_vitest_addon.md](plan_vitest_addon.md#split-to-aim-for):
- **Storify:** components whose setup (stores, API mocks, router, props) describes scenarios a person would want to look at.
  Props alone count when they produce visibly different states (QuotaUsageSummary: finite total vs unlimited). A form counts even when it's empty on mount, since play functions fill it.
- **Skip:** logic, stores, composables and API-client tests, components with one state nobody would browse, and wrappers whose only variation is a size or style passed to children. Tests outside `client/` (the tool shed frontend) have no Storybook yet.

When skipping, set `storified: skip` (only that field), log the reason, and end the iteration.

## Convert

- Follow [STORY_CONVENTIONS.md](STORY_CONVENTIONS.md). FormData, FilesDialog and HistoryExportWizard are the reference conversions.
- Keep every original assertion. Splitting a case or strengthening a weak check is welcome (note it in the log); weakening or dropping one needs John's approval.
- Reuse existing handlers, fixtures and story helpers before adding new ones.
- Drop old setup the story mount replaces (`getLocalVue`, popover mocks) unless an assertion depends on it.
- Cases or rows the conversion itself added may be dropped once another case covers them; original ones may not.
- Story args may replace a test's inputs if every feature the old inputs exercised is still exercised, with exact expectations recomputed. Note it in the log.
- Keep the test's language; moving `.js` to TypeScript is separate work.
- Don't fix component bugs in this lane; add them to [BUGS_FOUND.md](BUGS_FOUND.md).

If the conversion needs a Storybook change (preview, story-mount helper, shared mock handlers), commit that first, separately, and check that existing stories still render.

## Validate

- Re-run the rebase gate, which now includes the converted test and its stories.
- The render check only proves a story doesn't throw. For stories whose content is conditional, confirm each shows what it claims with throwaway play assertions, then remove them.
- Run type-checking, lint and formatting.
- Have an independent subagent confirm that the original assertions survive and that the stories are readable on their own. Re-run the checks after applying its fixes (the touched test and stories, lint and type-check are enough for small fixes), and ask for a second review if a fix changed what an assertion checks.

## Record

- Commit the test and its stories together, with a `Test-File: <path>` trailer, before the review; amend with its fixes. Push the lane once validation and review pass ([how](PIPELINE_BRANCHES.md#invariants)).
- After the push, set `storified: true` in `jest_tests.yml`, and change no other field. Commit it with the log row (`git commit -o`); don't push galaxy-brain.
- Append a row to [STORY_LOG.md](STORY_LOG.md) with the test, the decision, the reason and the line counts before (at the lane's merge-base with `vitest_readability`) and after.
- To fix an earlier conversion, fold the fix into that test's commit (fixup and autosquash), re-run the gate, have a subagent review it if assertions changed, and update its log row in place.
- Put pattern lessons in the row too. The driver decides whether a recurring lesson belongs in client testing guidance.
