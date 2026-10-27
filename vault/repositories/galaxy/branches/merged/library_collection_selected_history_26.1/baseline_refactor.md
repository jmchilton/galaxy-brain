No refactoring of the base branch was performed. History unchanged: Baseline tests `93b3d468c01` → refactor `a15d9bd3e48` (from the first pass, see [earlier_drafts/1/baseline_refactor.md](earlier_drafts/1/baseline_refactor.md)) → library fix `715db425064` → ListWizard fix `fc218167da1`.

## Re-evaluated after the re-scope

- **First-pass refactor `a15d9bd3e48`** still fits. The ListWizard fix doesn't touch `import-collection.js`, so the re-scope adds nothing to pull into it.
- **ListWizard commit's Selenium helper params** (`history_id` on `history_panel_item_selector`/`history_panel_muli_operation_select_hid`, `scope` on `use_bootstrap_dropdown`/`history_panel_build_list_auto`): kept in the fix commit.
  - They're about 20 lines of optional-param plumbing, defaults keep existing behavior, and the only caller is `test_build_list_in_viewed_history` in the same commit.
  - In a refactor commit they'd be infrastructure with no caller. The first pass made the same call for `prepare_library_for_data_export(history_id=)` and `export_to_history_history_select`.
  - The fix commit is already small (`ListWizard.vue` +4/-3, plus the test) and its message names the helper changes, so moving them wouldn't make the fix clearer.
- **`history_collection_names`**: kept in `715db425064`, where it gets its first caller. Moving it into Baseline tests would add an unused helper to a commit meant to pin current behavior.
  - Trade-off: `fc218167da1`'s test uses it too, so the ListWizard commit can't be cherry-picked without `715db425064`. That's fine while both ship in one PR. If the ListWizard fix is ever split out, move the helper into a refactor commit then.
  - Existing similar lookups (`framework.py` staged-collection hid map, `test_workflow_extraction.py`) map ids, not names, so they aren't worth switching to it.

## Tests

None rerun; no commits changed. The tree at `fc218167da1` is untouched (`git diff fc218167da1 HEAD` empty).
