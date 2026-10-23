# Polish E2E tests debrief

I moved the one raw DOM lookup into `navigation.yml` and pulled the repeated current-history wait into a shared helper. I also added screenshots of both "Add to History" dialogs, with a real fade-in wait in place of a sleep. Both E2Es pass under Playwright and Selenium.

The branch still has 2 commits on `origin/release_26.1`:
- `d18fb2d07c1` Baseline tests (was `d1fbcbbe086`). The message was reworded to list the new helpers and selectors.
- `9c7bd0b7c02` fix (was `14541f7ead3`)

Nothing was pushed.

## Changes

**Baseline commit** (`navigates_galaxy.py`, `navigation.yml`, `test_library_contents.py`):
- **Raw selector.** `libraries_folder_wait_for_datasets` used `row.find_element(By.CSS_SELECTOR, "td a")`. It now reads each row's name cell through a new target, `libraries.folder.row_name: '#g-table-cell-name-${row_index}-folder_list_body'`, which is GTable's per-cell id.
  - The lookup stays indexed by row, so it lines up with `select_dataset(row_index=...)`.
  - It reads the cell, not the link, so a deleted row (which has no `<a>`) can't throw or shift the indices.
- **Shared current-history wait.** The baseline test's inline `_wait_on(lambda: current_history_id() == ...)` is now `wait_for_current_history_id(history_id)`. The fix test uses it too. No equivalent helper existed; the nearest ones wait on a name or on a switch away from the current history.
- **Fade-in wait.** New `wait_for_fade_in(target)` waits until the target is visible and its computed opacity is `1`. New target: `libraries.folder.add_to_history_modal: '.ui-modal'`.
  - The legacy `utils/modal.js` fades in over 0.15s.
  - The first collection-dialog screenshot came out half-transparent, with the folder table showing through.
  - This wait replaces a sleep. `UX_TRANSITION` would have been a 5s sleep, or 10s with the multiplier.
- **Dataset-dialog screenshot.** `libraries_folder_add_to_history` gains `screenshot_name=None`. When it is set, the helper waits for the fade-in, then screenshots after the history is picked and before Import is clicked. The baseline test passes `libraries_add_datasets_to_selected_history`.
  - This is the first coverage of Add to History > as Datasets, so it needs a screenshot.
- The `libraries_folder_add_to_history` docstring is now one line.

**Fix commit** (`test_library_to_collections.py`):
- The test waits for the fade-in, then screenshots the collection dialog with the picked history in "Select history" (`libraries_to_collection_selected_history`).
- The final `assert self.current_history_id() == target_history_id` is now `wait_for_current_history_id(target_history_id)`. This is no weaker: the wait fails on timeout, and it runs after the collection was already seen in the target history.
  - It is still preceded by `assert collection_names(current_history_id) == []`, which I left unchanged.

I checked both screenshots by eye. Each shows its fully opaque dialog with the target history selected.

## Sleeps

The branch's E2E code adds no sleeps.

## Not done (pre-existing, out of scope for a 26.1 backport)

- The `sleep_for(UX_RENDER)` calls in `test_library_contents.py`, in tests this branch doesn't touch.
- The xpath `contains(text(), ...)` button selectors (`import_datasets_ok_button`, `add_to_history_as_collection`).
- The raw `"td a"` in `libraries_index_table_elements` callers (library index page) and `libraries_table_elements`' raw tbody selector. Both have other callers.
- `collection_export` / `list_of_pairs_export` take their screenshots without a fade-in wait, so they can catch the same half-faded modal. A one-line `wait_for_fade_in` each would fix it, but those tests aren't this branch's.
- `wait_for_overlays_cleared` still uses a raw `.ui-modal` string. It could use `add_to_history_modal`, but that target lives under `libraries.folder`, so I left it.

## Tests run (local, Galaxy 8095 + Vite 5185, one at a time, on the final HEAD)

- `test_library_contents.py::TestLibraryContents::test_add_datasets_to_selected_history`: Playwright passed, Selenium passed.
- `test_library_to_collections.py::TestLibraryToCollections::test_library_collection_export_to_selected_history`: Playwright passed (before the rebase, with identical tree contents), Selenium passed.
- `test_library_to_collections.py` (whole file, because the shared `prepare_library_for_data_export` path reads names through the changed helper): Playwright 7/7 passed.
- Pre-commit (black, ruff, flake8, prettier) passed. Black re-wrapped one call.
