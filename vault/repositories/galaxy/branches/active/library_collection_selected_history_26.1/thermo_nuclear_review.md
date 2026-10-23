# Thermo-nuclear code quality review

The verdict was no structural regression and no code-judo move available. The fix is already the minimal shape. I acted on 4 of 5 local findings (1, 2, 4, 5 below) and skipped the `screenshot_if` swap.

The branch still has 2 commits on `origin/release_26.1`:
- `84a8115a1d3` Baseline tests (was `d18fb2d07c1`)
- `430487e9aa6` fix (was `9c7bd0b7c02`)

Both were updated with `--fixup` plus autosquash. Nothing was pushed.

## Acted on

- **Baseline:** `libraries_folder_wait_for_datasets` now returns the row names from the wait condition (`None` until loaded) instead of mutating a closure list.
- **Fix:** `import-collection.js` `showCollectionBuilder` has one `.then(collectionImport).catch(...)` chain. A new `makeTargetHistoryCurrent(name)` resolves the target id: create the history, or set the picked one current. `createNewHistory` is byte-identical, and the `this.select_collection_history` field is gone.
- **Fix:** the `useCollectionCreation` getter type is now `() => string`.
- **Fix:** the E2E local `current_history_id` is renamed `other_history_id`.

## Not acted on

- **`screenshot_if` in `libraries_folder_add_to_history`.** The fade-in wait has to stay conditional, or it runs on every call. Either way it's a 2-line wash.
- **Items already settled by earlier debriefs** (listed below). Not re-raised.

## Tests (local, Galaxy 8095 + Vite 5185, one at a time)

- At HEAD:
  - `src/components/Collections/` plus `import-to-history/` vitest: 32/32.
  - eslint clean.
  - `test_library_to_collections.py` under Playwright: 7/7.
  - `test_library_collection_export_to_selected_history` under Selenium: passed.
  - `test_add_datasets_to_selected_history` under Selenium: passed.
- At the baseline commit (detached, no fix):
  - The fallback vitest passed.
  - `test_add_datasets_to_selected_history` under Playwright passed.

<details><summary>Full review</summary>

Reviewed `origin/release_26.1...HEAD` at `9c7bd0b7c02` (baseline `d18fb2d07c1`), ~154 added lines over 8 files, against `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`.

### Verdict
No structural regression. The fix is already the small, inevitable shape: the creator composable honors the `historyId` prop every creator was already given, and the library dialog makes the picked history current like its sibling paths. No code-judo move deletes a concept here. A few local simplifications are worth taking.

### Findings

1. **`import-collection.js` `showCollectionBuilder`: duplicated promise arms (spaghetti growth, minor).** The fix adds a second `.then(import).catch(log + Toast)` arm that copies the new-history arm's error handling. Collapse both arms into one chain: each arm resolves a history id (create-and-make-current, or make-picked-current), then a single `.then(collectionImport).catch(...)`. Keep `createNewHistory` byte-identical (pre-existing, release backport). This also removes the needless `this.select_collection_history` instance field and the inline comment's need to exist.
2. **`libraries_folder_wait_for_datasets`: closure mutation to smuggle a result out of the wait (magic, minor).** `row_names[:] = ...` then `return row_names` works around a wait that already returns the condition's first truthy value (`_wait_on` -> `galaxy.util.wait.wait_on`). Return the list from the condition (or `None`) and return the wait's result. Empty `names` would poll forever on a falsy `[]`; every caller passes non-empty names.
3. **`libraries_folder_add_to_history`: bespoke `if screenshot_name:` instead of canonical `screenshot_if` (canonical-helper duplication, minor).** The `rule_builder_*` helpers use `self.screenshot_if(screenshot_name)`. The fade-in wait is only needed before a screenshot, so it has to stay conditional or become unconditional (~0.15s per call). Either way it's a 2-line wash.
4. **`useCollectionCreation(historyId?: () => string | undefined)`: wider-than-needed getter type (type boundary, nit).** The only caller passes `() => props.historyId` with `historyId: string` required. Tighten to `() => string`; the `||` fallback still covers an empty string.
5. **`test_library_collection_export_to_selected_history`: misleading local name (legibility, nit).** `current_history_id` holds the history that was current before the import and stops being current by the end; the final wait asserts exactly that. Rename to `other_history_id`.
6. **Size.** `navigates_galaxy.py` was 3.4k lines before this branch; +60 lines of library helpers sit beside the existing `libraries_*` block. No file crosses 1k due to this PR.
7. **Canonical-helper search.** No existing `.ui-modal` target in `navigation.yml`, no existing opacity/fade wait in `lib/galaxy/selenium`. `wait_for_current_history_id` has no equivalent (prior polish debrief). New helpers are not duplicates.

### Already settled by earlier debriefs (not re-raised)
- Importing anyway when `setCurrentHistory` fails; single-caller `libraries_folder_add_to_history`; API-based history setup in E2Es; both fix halves (`setCurrentHistory` + plumbing) being needed; multiview/upload behavior change noted for PR body.
</details>
