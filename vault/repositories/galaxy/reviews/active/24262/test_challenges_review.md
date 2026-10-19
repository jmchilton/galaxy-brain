# Test challenges review: galaxyproject/galaxy#24262

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `cece83167b7409730e13573ed41c98c7e14da774`
- Full debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

## Summary

The tests are strong behavioral tests. All 15 pass under node 22.20.0. Against the merge-base implementation, all 10 new tests fail at their own assertions, so they are genuinely red-to-green. The race scenarios belong at the unit layer. The two issues are that the tag-save queue and its 4-test suite are copied between two components, and that no E2E test covers the deterministic "editor closes on a non-first card" symptom from #24011.

## P2 1: Extract the duplicated tag-save queue and test it once

`HistoryCard.vue` and `WorkflowCard.vue` gained the same ~35 lines of queue state (`tagsSaved`, `pendingTagSaves`, `lastSavedTags`, `lastTagSaveFailed`, `onTagSavesDone`, `sameTags`). `HistoryCard.test.ts` and `WorkflowCard.test.ts` repeat the same 4 scenarios and copy the `deferred()` and `addTag()` helpers. Each test mounts a full card (Pinia, router, `StatelessTags` events) and `vi.mock`s a service module, only to exercise a generic algorithm: serialize saves, remember the last success, then reload on failure or reapply the saved tags.

Suggested fix: move the queue into one reusable unit. Possible shapes are a `useSerialTagSaves({ save, getTags, setTags, onFailed })` composable, or a generic serialize primitive in `client/src/utils/sharedPromise.ts` next to `memoizeUntilRejected` and `dedupeInFlight`. Test the 4 scenarios once against plain async functions, reusing the existing `deferred<T>()` in `sharedPromise.test.ts`. Keep one or two thin wiring tests per card: a tag edit saves the new tags without emitting `refreshList`, and a failure toasts and emits `refreshList`. Back those with MSW (`useServerMock`, handler awaiting a deferred) instead of `vi.mock`, as `client/README.md` prefers. That way the history path also exercises the real `historyStore.updateHistory` → `setHistory`.

## P2 2: Add an E2E test for the editor closing on a non-first card

The second symptom in #24011 is deterministic. On the default last-updated sort, a tag save re-sorted the card to the top, the focused input blurred and the editor closed. The unit tests can only assert the proxy "no `refreshList` emitted". `test_histories_list.py::test_tags` adds one tag and presses Escape, so it passes on `dev`.

Suggested fix: in `lib/galaxy_test/selenium/test_histories_list.py`, open the editor on a non-first history card. Add two tags in a row with the shared `tagging_add([a, b], auto_closes=False, parent_selector=f"#g-card-history-{id} ")`; it reuses the open input, so it fails on `dev`. Then assert that the card hasn't moved, reload the page and assert both tags. The file-local `add_tag` helper could be replaced by the shared one. The race interleavings themselves should stay as unit tests, because Selenium can't time them.

## P3 1: `deferred()` test helper now copied three times

`deferred()` is in `sharedPromise.test.ts`, `HistoryCard.test.ts` and `WorkflowCard.test.ts`. If P2 1 isn't adopted, move it to `client/tests/vitest/helpers` and import it.

## P3 2: Latest-load guard is hand-rolled again

`WorkflowList.vue` copies `HistoryList.vue`'s `loadGeneration` guard. The same pattern exists in `genericTaskMonitor.ts` (`pollGeneration`) and `resourceWatcher.ts` (`currentRequestId`). The PR's two `WorkflowList` tests are good component tests and should stay. A small "latest call wins" helper would let the guard be unit-tested once. The PR extends existing duplication rather than introducing it, so this is optional.
