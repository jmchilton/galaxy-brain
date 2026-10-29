# galaxy#24262 initial review — default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `cece83167b7409730e13573ed41c98c7e14da774` (merge-base `7c86d742327b`; no drift vs `origin/dev` in touched files)
- Date: 2026-10-19

## Summary

Fixes #24011. History and workflow cards now update `tags` on their list entry in place, run tag saves one after another per card, and only reload the list when the last queued save fails. `WorkflowList.load` gets the same `loadGeneration` stale-response guard `HistoryList.load` already has.

The fix is right: `StatelessTags.onAddTag` emits `[...props.value, newTag]`, so a second tag added before the reload finished was built on stale `props.value`. Updating in place fixes that. In-place update with no reload also matches how the sibling tag editors already work (`DatasetList.onTags`, `GridList.onTagInput` and the grid configs' `updateTags` handlers). The `WorkflowList` guard copies the `HistoryList` pattern exactly.

Verification: `HistoryCard.test.ts`, `WorkflowCard.test.ts` and `WorkflowList.test.ts` pass (15 tests, node 22.20.0). eslint on the three changed `.vue` files shows no errors, only existing event-hyphenation warnings.

Main concern: the serial-save logic is the same ~40 lines pasted into both cards, while the client already has a per-key "latest wins" serial queue (`LastQueue`).

## Findings

### P2 1: Duplicated tag-save queue; reuse `LastQueue` / extract a composable

`HistoryCard.vue` and `WorkflowCard.vue` each add the same state machine: `tagsSaved` promise chain, `pendingTagSaves`, `lastSavedTags`, `lastTagSaveFailed`, `onTagSavesDone`, `sameTags`. Only the save call and the target object differ. The four card tests are also copied almost line for line between the two test files, along with the `deferred()` and `addTag()` helpers.

`client/src/utils/lastQueue.ts` already does this job. `LastQueue` runs one task per key at a time and replaces a pending task with a newer one. It is used by `historyItemsStore`, `collectionElementsStore`, `keyedCache` and the workflow editor. Each tag save sends the full list, so skipping superseded intermediate saves is correct, and it means fewer requests than the PR's chain, which sends every intermediate list.

Suggested fix: extract a small composable, for example `useQueuedTagsSave(save: (tags) => Promise<unknown>, { onFailed })` in `client/src/composables/`, and have both cards call it. It should own the in-flight count, the last-saved tags and the failure toast. The finding is the duplication; using `LastQueue` inside the composable is optional. If it is used, two caveats apply:

- Use `new LastQueue(0, true)`. With the default `rejectSkipped=false`, a skipped task resolves `undefined`, and so does `historyStore.updateHistory`, so a superseded save could not be told apart from a successful one. Treat `ActionSkippedError` as non-terminal.
- `LastQueue` has no "queue drained" signal, so the composable still has to count pending saves to decide when to restore tags or reload.

Move the behavioral tests to that composable (one test file) and keep one thin wiring test per card. This also gives `DatasetList.onTags` and the grid `updateTags` handlers a drop-in fix later: they save without waiting for the previous save, so they have the same out-of-order risk.

### P3 1: Simplify the post-save restore branch

`onTagSavesDone` only writes back `lastSavedTags` when `!sameTags(current, lastSavedTags)`. Assigning unconditionally after a successful final save gives the same result and removes the `sameTags` helper from both files. Separately, the restore only runs after the queue drains. If a list load lands mid-save, the editor shows the pre-save tags until then, and a tag added in that window is built on the stale list, which is the original bug in a much narrower window. That is acceptable for how rarely it happens (`HistoryList`/`WorkflowList` only reload on user actions), but it argues for keeping this branch minimal rather than adding more cases to it.

### P3 2: Shared test helpers

`deferred()` is now defined in `HistoryCard.test.ts` and `WorkflowCard.test.ts`, and similar helpers exist in other client tests (`GalaxyAI.*.test.ts`, `CuratedWorkflowList.test.ts`). Consider adding it to `tests/vitest/helpers`. This becomes moot if P2 1 moves the tests to one composable test.

### P3 3: Cover the race in the existing E2E tag test

`lib/galaxy_test/selenium/test_histories_list.py::test_tags` adds one tag on a history card and filters by it. It already exercises this path, and the PR does not appear to break it: it holds the card element, which now stays in place, and it does not check order. Extending it, or `test_workflow_management.py::test_tagging`, to add two tags quickly, reload the page and check that both persist would cover the PR's manual test plan end to end. The near-duplicate per-card unit tests could then be trimmed toward a single composable test (see P2 1).

## Notes (not findings)

- `history.value.tags = tags` writes to a property of the `history` prop through a `computed` alias. `WorkflowCard` already did this before the PR, and `DatasetList`/`GridList` mutate row objects the same way, so it is consistent with existing code, but it is still mutation of a prop.
- After a tag edit the list is no longer re-sorted or re-filtered (for example, removing the tag the list is filtered by keeps the card visible). The PR description states this on purpose.
- `HistoryList.onBulkTagsAdd` reads `prevTags` from `historiesLoaded`, which in-place updates now keep current. A bulk add while a card save is still in flight could still race, but that is an edge case and the old code had it too.
- The card saves the client's tag strings and does not re-read what the server stored. Display maps `name:` to `#`, so the visible effect is nil.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is client-only, with no API or artifact changes. The one behavior users will notice (cards no longer jump after a tag edit) is subtle and easy to undo.
