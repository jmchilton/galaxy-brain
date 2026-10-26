# Initial implementation debrief

```
created .../differential-review/snapshots/20261026T144907Z-implementation-87435d24ee99.json
  implementation @ 87435d24ee99 vs origin/release_25.1 (merge-base a2e6ecf48277)
  first snapshot: 2 commits, 3 files, 9 hunks
```

Base `release_25.1` (John; issue said 25.0, unsupported).

## Root cause correction

Issue blamed only the dangling `@created-collection="createdCollection"`. But Auto/Advanced Build List call `listWizard()`, which copies the selection into `useCollectionBuilderItemSelection` and routes to `ListWizard` — `CollectionCreatorIndex` only renders for "Build Dataset List" on an all-in-query selection. Restoring the handler alone wouldn't fix the repro. Same structure on `release_26.2` and `dev`.

## Change

`SelectionOperations.vue`:
- `listWizard()` emits `update:show-selection` false after handing the selection to the store.
- Restored `createdCollection()` (same emit) for the build-list-all modal.

`setShowSelection(false)` already resets the selection via `watch(showSelection)` in `useSelectedItems`, so `reset-selection` isn't emitted; matches `runOnSelection`.

Tradeoff: cancelling the wizard drops the selection. Covers the rules-builder path too (lives inside `ListWizard`), resolving the issue debrief's open rules-builder question.

## Tests

- Baseline commit `206d8cb3a59`: `listWizard` hands selection to store + routes (passes pre-fix).
- Jest: wizard (both modes) and modal `created-collection` emit `update:show-selection` false. Red before, green after. `CollectionCreatorIndex` stubbed: 25.1 omits required `extendedCollectionType` prop (pre-existing Vue warning, also on dev; out of scope).
- Selenium `test_collection_builders.py`: `_assert_selection_cleared` after create in `test_build_list_simple_hidden` (auto) and `test_build_paired_list_auto_matched` (advanced). Red on reverted `SelectionOperations.vue` (selection menu never absent), whole file 8/8 green with fix.
- 25.1 has no Playwright backend; ran Selenium with `GALAXY_TEST_SELENIUM_BROWSER=CHROME`, own server (8080 held by another worktree).

## Review

[normal review 1](subagents/normal_review_1.md): approve; redundant `reset-selection` emit dropped.
