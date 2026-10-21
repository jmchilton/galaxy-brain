# Baseline refactor

No refactoring of the base branch was performed. The branch was already in refactor-first order, so the history is unchanged. Head stays at `142b0facd30`.

1. `3f1900de910` Share the Add Tags typing loop as `tags_add_from_button`. This is a refactor of base: `history_panel_add_tags` behaves the same as before.
2. `10f649d0e87` Share the Edit Dataset Attributes success-alert check in test_dataset.py. Also a refactor of base, used by three existing tests.
3. `fb0283ee475` Tagging test.
4. `142b0facd30` Auto-detect test.

## Checked

- Each refactor commit stands alone on base. Commits 3 and 4 only add lines to `navigates_galaxy.py` and `test_dataset.py`; neither changes nor removes any line the refactors wrote. Both refactor commits' versions of those files byte-compile.
- Only new infrastructure remains in the test commits, and none of it has a caller on base, so moving it into a refactor commit would add unused code to base:
  - `history_panel_item_add_tags`
  - `content_item.tag_area_button` / `tag_area_input`
  - `edit_dataset_attributes.metadata_input` / `auto_detect_metadata_button`
- I searched base for hand-written tag entry or metadata-input code that could use these, and found only the sites listed below.

## Not acted on (already declined in earlier debriefs; no new reason)

- `test_workflow_editor.py::test_pick_value_add_tags_pja` and `test_histories_list.py::add_tag`. Both could call `tags_add_from_button`, but they're unrelated files and would add conflict surface with the sibling branches.
- Merging `tagging_add` with `tags_add_from_button`. They aren't equivalent, and merging would touch the workflow-management tests. That's a dev follow-up.

## Tests

None were rerun. The history and tree are unchanged from `142b0facd30`, which passed under both backends (see `polish_e2e_tests_debrief.md` and `thermo_nuclear_review.md`).
