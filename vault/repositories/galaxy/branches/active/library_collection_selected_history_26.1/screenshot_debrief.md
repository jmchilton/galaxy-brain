# Screenshot debrief

**Screenshots successfully obtained.** Six PNGs are in `screenshots/`, all from Playwright runs on HEAD (Galaxy 8095 + Vite 5185). Selenium produced the same six; I checked them and didn't copy them.

## Test changes (folded with `--fixup` + autosquash; still 4 commits, not pushed)

- **`4189977901c` ListWizard fix (was `fc218167da1`):**
  - `ListWizard.vue`: the success `BAlert` now has `data-description="list wizard created alert"`.
  - `navigation.yml`: new `collection_builders.list_wizard.created_alert` target.
  - `test_build_list_in_viewed_history` now takes a screenshot before Build. After Build it waits for the alert, asserts the alert contains "history it was built from", and takes a second screenshot. The assertion is new, so the test is stricter: it pins the reworded alert.
- **`e6f27e08f50` library collection fix (was `715db425064`):**
  - `wait_for_fade_in(add_to_history_modal)` now runs before the existing `collection_export` and `list_of_pairs_export` screenshots. This was optional in the scope evaluation, and cheap.
- **Unchanged:** `93b3d468c01` Baseline tests and `a15d9bd3e48` refactor.

## Screenshots

| File | Test | Shows |
|---|---|---|
| `libraries_add_datasets_to_selected_history.png` | `test_library_contents.py::test_add_datasets_to_selected_history` | The "Import into History" dialog (Add to History > as Datasets). A non-current history is picked; the current history ("Unnamed history") is empty. |
| `libraries_to_collection_selected_history.png` | `test_library_to_collections.py::test_library_collection_export_to_selected_history` | The "Create History Collection from Datasets" dialog with a picked non-current history and type List. |
| `collection_builder_wizard_list_viewed_history.png` | `test_collection_builders.py::test_build_list_in_viewed_history` | The ListWizard list builder, opened from a non-current history's view page. The breadcrumb names the viewed history; the current history panel is empty. |
| `collection_builder_wizard_list_created.png` | same | The success alert "Collection created and added to the history it was built from." The breadcrumb still names the viewed history, and the current history is still empty. |
| `libraries_to_collection_landing_is_new_history=False.png` | `test_library_to_collections.py::test_library_collection_export` | The pre-existing screenshot, now taken after the fade-in wait. The dialog is fully opaque. |
| `test_export_pairs_list=False.png` | `test_library_to_collections.py::test_export_pairs_list` | The pre-existing screenshot, now taken after the fade-in wait. The dialog shows type List of Pairs. |

## Checks

- **Breadcrumb:** `useHistoryBreadCrumbsToForProps` already reads the store's `historyId`. The screenshots confirm the wizard names the history it builds in.
- **Runs:** five E2Es, each passed under both Playwright and Selenium, one at a time: `test_build_list_in_viewed_history`, `test_add_datasets_to_selected_history`, `test_library_collection_export_to_selected_history`, `test_library_collection_export` and `test_export_pairs_list`. Pre-commit hooks passed on both fixups.

## Problems / notes

- The wizard's Name input is narrow, so "viewed history list" displays as "iewed history list". That is pre-existing layout and cosmetic.
- In the datasets dialog screenshot, the library rows still show "queued". The library import is still finishing; this is pre-existing and doesn't affect the dialog.
