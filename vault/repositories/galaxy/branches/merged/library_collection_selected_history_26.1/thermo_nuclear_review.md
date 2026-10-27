# Thermo-nuclear code quality review (re-harden, whole branch)

Verdict: no structural regression, no code-judo move left. All 4 commits were reviewed fresh. Acted on 1 finding: dropped the unused `scope` param from `history_panel_build_list_advanced`. It was speculative surface; the ListWizard commit message only claims `_auto` takes a scope, and now the code matches. Everything else is not worth churning on a release branch, or was already settled.

The branch is still 4 commits on `origin/release_26.1`. The change went in as `--fixup` plus autosquash. Nothing was pushed.
- `93b3d468c01` Baseline tests (unchanged)
- `a15d9bd3e48` refactor (unchanged)
- `715db425064` library collection fix (unchanged)
- `fc218167da1` ListWizard fix (was `075e519c704`; `git diff 075e519c704 HEAD` is only the `scope` removal)

## Not acted on

- **Swap `history_collection_names` for `dataset_populator.get_history_contents_of_type(id, "dataset_collections")`.** Net-negative. The populator returns dicts, so all 4 call sites (a wait plus an assert in each of 2 tests) would need the name projection that the test-challenge pass just consolidated. The helper also sits beside sibling API readers (`history_contents`, `current_history`) in `NavigatesGalaxy`, so it's not in the wrong layer.
- **ListWizard `() => historyId.value || ""`.** The `|| ""` only satisfies the `() => string` getter type. The template guard (`currentHistoryId && historyId`) keeps null from ever reaching `createPayload`. Widening the getter to `() => string | null` would touch both fix commits for a one-token gain.
- **ListWizard still pulls `currentHistoryId` only for its template guard.** The guard is pre-existing. Dropping it changes render timing on a release branch, for no user-visible gain.
- **`setCurrentHistory` is in both `createNewHistory` and the picked path of `makeTargetHistoryCurrent`.** Hoisting it would edit the pre-existing `createNewHistory`. An earlier review settled keeping that byte-identical for backport.
- **`resolveTargetHistoryId` (refactor commit) is renamed to `makeTargetHistoryCurrent` (fix commit).** That's fine: the new name honestly reflects the side effect the fix adds.
- **`use_bootstrap_dropdown` / `history_panel_build_list_auto` repeat the `".history-index"` default.** This matches `history_element`'s existing default-literal convention.
- **Pre-existing, out of scope:** the `muli` typo in `history_panel_muli_operation_select_hid`, and the raw `"#center"` strings elsewhere in `navigates_galaxy.py`.
- **Already settled by earlier debriefs:** single-caller `libraries_folder_add_to_history` optionals, `wait_for_fade_in`, `libraries_folder_wait_for_datasets` returning the wait result, API-based history setup, `history_collection_names` not wrapping `history_contents`, and the `screenshot_if` swap.

## Tests (Galaxy 8095 + Vite 5185, one at a time)

- `test_collection_builders.py` (whole file, the shared helper's callers) under Selenium: 9/9 passed.
- `test_collection_builders.py::TestCollectionBuilders::test_build_list_in_viewed_history` under Playwright: passed.
- Pre-commit (black/ruff/flake8) passed on the fixup.
- Not rerun: vitest and the library E2Es, since no client or library code changed. Baseline tests weren't rerun either; `93b3d468c01` is unchanged.

<details><summary>Full review</summary>

Reviewed `origin/release_26.1...075e519c704` (10 files, +188/-35) against `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`.

### Verdict
The fix is the minimal, inevitable shape:
- `useCollectionCreation` takes the target history.
- `useCollectionCreator` forwards the `historyId` prop that every creator was already given.
- ListWizard feeds the selection store's `historyId`, which it already tracked.
- The library dialog makes the picked history current, like its sibling paths do.

No concept, branch or layer can be deleted beyond this. No file crosses 1k lines: `navigates_galaxy.py` was already ~3.4k and gains ~80 lines of helpers next to their siblings.

### Per commit
1. **Baseline (`93b3d468c01`).**
   - `libraries_folder_*` helpers, `wait_for_current_history_id`, `wait_for_fade_in`, plus navigation.yml targets. No canonical duplicates exist (checked in the earlier pass).
   - The vitest pins the no-arg fallback that SampleSheet relies on.
   - Clean.
2. **Refactor (`a15d9bd3e48`).** One promise chain replaces two arms with duplicated error handling. It's small, behavior-preserving, and states its one timing change in the commit message. Clean.
3. **Library fix (`715db425064`).**
   - `useCollectionCreation(historyId?: () => string)` is an optional getter with a fallback. That's the right contract: SampleSheet and the upload paths keep the current history.
   - The picked path adds `setCurrentHistory`. Clean.
4. **ListWizard fix (`075e519c704`).**
   - Client: 3 tokens change (store `historyId` replaces `currentHistoryId` in 2 props and the creation getter), plus the alert text. Clean.
   - Test helpers:
     - `history_id` on `history_panel_item_selector` / `_select_hid`: used.
     - `scope` on `use_bootstrap_dropdown` / `_build_list_auto`: used.
     - **`scope` on `history_panel_build_list_advanced`: no caller.** That's speculative surface, and the commit message doesn't claim it. **Acted on:** removed.

### Considered (see Not acted on)
`history_collection_names` → populator; the ListWizard `|| ""` coercion; the vestigial `currentHistoryId` guard; the duplicate `setCurrentHistory`; the rename across commits; the repeated scope defaults.
</details>
