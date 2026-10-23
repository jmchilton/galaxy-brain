# Test challenges debrief (re-harden, whole branch)

The headline change: I dropped the creator vitest ("creator creates the collection in its historyId…"). The first pass kept it because no E2E could observe `useCollectionCreator` forwarding `props.historyId`. The re-scope made that false.
- `test_build_list_in_viewed_history` goes ListWizard → `ListCollectionCreator` → `useCollectionCreator` → emitted payload → `ListWizard.onCreate`. So the E2E observes the forwarding directly.
- I checked this empirically. I reverted only the `useCollectionCreator.ts` forwarding (via Vite HMR) and ran the E2E under Playwright. It fails at its own wait: `Timed out after 90.25 seconds waiting on the list in the viewed history`.
- Under the "unit test duplicated by a Selenium test" rule, I dropped it.
- Trade-off: commit `715db425064` no longer has a test of its own for the plumbing half. Its library E2E pins the `setCurrentHistory` half, and the plumbing is pinned by the next commit's E2E. The `_alt_original_scope` branch still carries the vitest.

I also made the E2E changes below. The branch still has 4 commits on `origin/release_26.1`, with the same subjects; old tip was `469a571f614`:
- `93b3d468c01` Baseline tests (was `84a8115a1d3`)
- `a15d9bd3e48` refactor (was `c4f44684748`)
- `715db425064` library collection fix (was `c57876ad7b5`; its message now mentions the new helper)
- `fc5b94ef73a` ListWizard fix (was `469a571f614`)

Changes went in as fixups plus an autosquash rebase. Nothing was pushed.

## Changes

- **Shared helper `NavigatesGalaxy.history_collection_names(history_id)`.** It is added in `715db425064`, next to `history_contents`.
  - It calls `histories/{id}/contents?type=dataset_collection` (the same call `framework.py` makes) and raises on a non-2xx response.
  - It deliberately does not wrap `history_contents`, which returns `{}` for an id missing from the user's history list. With that, the `== []` checks would pass without checking anything.
  - It replaces the identical local `collection_names` closures in `test_library_to_collections.py` and `test_collection_builders.py`, which made the same contents GET and applied the same collection filter.
- **API setup for target histories.** All 3 new E2Es now create the target with `dataset_populator.new_history(name=...)` instead of through the history panel UI.
  - Each test still creates a fresh *current* history through the UI, so the "other" history is guaranteed empty even when the local login user is shared.
  - In `test_build_list_in_viewed_history`, the target used to be the login user's existing current history, which could be dirty. Now it is a fresh API history, so `hid 1` is guaranteed to be the new dataset. That is a robustness gain.
- **Strengthened the baseline dataset E2E.** `test_add_datasets_to_selected_history` now also asserts that the previously current history stays empty.
  - It passes at baseline: the datasets path (`import-dataset.js`) is unchanged by the later commits.

## Per-test challenge

- **`test_add_datasets_to_selected_history` (baseline E2E).** Kept and strengthened as above. This is the first coverage of Add to History > as Datasets.
- **`test_library_collection_export_to_selected_history` (fix E2E).** Kept. Without the fix it fails at its own `_wait_on` ("the list in the selected history"). It also asserts that the other history has no collection and that the picked history becomes current.
- **`test_build_list_in_viewed_history` (ListWizard E2E).** Kept. Without the ListWizard fix it times out at its own wait; the re-scope verified this. It also guards the creator plumbing (see the headline above). It runs under both backends.
- **Fallback vitest (`falls back to the current history`, baseline).** Kept.
  - No E2E can see this fallback: the server defaults to the current history even if `history_id` were wrong or undefined.
  - It still pins `useCollectionCreation()` for the remaining no-arg callers: SampleSheet, and ListWizard's `""` getter.
  - Its only "mock" is `createTestingPinia`.
- **Refactor commit test edits** (`admin_login` moved to callers, ticking rows by name). These are behavior-preserving, and `test_library_to_collections.py` passed 7/7 in earlier rounds.
- **None of these present:** layout faking, dedicated infra test files, SimpleNamespace or mock objects to replace.

## Considered, not done

- **`scope="#center"` → `self.navigation._.selectors.center_panel.selector`.** This matches the "selectors in navigation.yml" practice. But `history_element` scopes are plain strings everywhere in the file, and the rescope review already declined it. Left as a nit.
- **`@managed_history` on the viewed-history test.** It would make a third history current. The test manages its two histories explicitly.

## Tests run (final code; one E2E at a time)

- Red check: `test_build_list_in_viewed_history` with the creator forwarding reverted failed under Playwright, as expected.
- `test_add_datasets_to_selected_history`: passed under Playwright and Selenium.
- `test_library_collection_export_to_selected_history`: passed under Playwright and Selenium, both before and after the helper's final form.
- `test_build_list_in_viewed_history`: passed under Playwright and Selenium, both before and after the helper's final form.
- After the last autosquash, `git diff` between the pre-rebase tip and HEAD was empty, so the commits match the tree that was tested.
- `src/components/Collections/` vitest (node 22.20.0): 29/29. That is 30 minus the dropped test.
- Pre-commit (ruff/black/eslint) passed on each fixup.
