# Test challenges debrief

I made one change: the tagging test now uses `@managed_history` and takes its hids from the API instead of hardcoding them. I fixed it up into the tagging commit. Nothing was weakened or dropped. Head moved from `4e33b74c274` to `800ba0fb6ed`:

1. `c605b2492fd` Share the Add Tags typing loop (unchanged)
2. `4d4b669ef76` Tagging test (was `7d4986f5885`, fixup applied)
3. `800ba0fb6ed` Auto-detect test (was `4e33b74c274`, content unchanged)

## Changes

- `test_history_panel.py::test_item_name_tag_propagates_to_tool_output`
  - Added `@managed_history`, which was not imported in this file before. The test creates datasets, and Best Practice #1 in "Component - E2E Tests - Writing" calls for the decorator. Without it, the test ran in whatever history the user already had open. The local login user is shared, so the hardcoded hids could collide.
  - The input hid now comes from `hda["hid"]` instead of `1`. The output hid comes from `run_tool(...)["outputs"][0]["hid"]` instead of `2`. These are the same assertions, just without the position assumptions.
  - Kept: the API `_wait_on` for `name:plus`. Running the tool depends on the tag having been persisted.

## Checklist

- Unit tests (Vitest/pytest), mocks, and layout faking: N/A. The branch has none.
- API/integration helper reuse: N/A. There are no API tests. The E2E tests already use populators (`new_dataset`, `run_tool`, `get_history_dataset_details`) for setup and state checks.
- Is the E2E coverage missing? No. Both features (item tag entry with name-tag propagation, and the Attributes-tab Auto-detect) now have E2E tests.
- Overlap with lower layers: the API tests already cover name-tag propagation. The E2E test adds what they can't: tag entry through the item's Add Tags UI, and how the propagated tag renders as `#plus` on the output item. I kept it.
- Red/green: this branch only adds tests and changes no product code, so "fail without the branch's changes" doesn't apply. The initial implementation already ran mutation red checks. Dropping `history_panel_item_add_tags` fails the tagging test. Dropping the Auto-detect click fails the Auto-detect test. The normal review added `detected == 0` before the edit, so the re-detect wait can't pass vacuously.
- `tags_add_from_button` has real callers: `history_panel_add_tags`, which `test_history_panel_tags_change` and `test_history_panel_collections::test_name_tags_display` use, and the new `history_panel_item_add_tags`.
- No dev-only helpers are used.

## Not acted on

- The Auto-detect test is left as is. It already uses `@managed_history`, so its literal `hid=1` is safe in a fresh history. Inlining `detected` (asserted `== 0`) would be cosmetic.
- `test_workflow_editor.py::test_pick_value_add_tags_pja` hand-writes the tag loop and could call `tags_add_from_button`. Changing that unrelated file would widen the conflict surface with the sibling branches that were merge-tree checked.
- The `auto_detect_metadata_button` sibling selector (`#dataset-attributes-default-save + button`): Best Practice #10 prefers `data-description`, but that needs a Vue change and a client rebuild, which the plan ruled out. It stays a dev follow-up.
- The test name `test_item_name_tag_propagates_to_tool_output` doesn't follow the file's `test_history_panel_*` prefix. I kept it because the branch record and the upstreaming plan refer to it by this name.

## Verification

After the fixup, `test_item_name_tag_propagates_to_tool_output` passed under Playwright (34s) and under Selenium (32s), run one at a time. The Auto-detect test and the refactor commit are byte-identical to the previously verified versions (`git diff 4e33b74c274 HEAD` touches only `test_history_panel.py`), so I didn't rerun them.
