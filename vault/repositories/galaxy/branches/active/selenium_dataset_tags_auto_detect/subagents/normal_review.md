# Normal review

Verdict: ready, no bugs. I took the one strengthening fix: the Auto-detect test now asserts `detected == 0` before editing, so a baseline of 3 can no longer make the re-detect wait pass vacuously. It's amended into the Auto-detect commit (`4e33b74c274`) and green under Playwright.

Not acted on:
- `test_workflow_editor.py::test_pick_value_add_tags_pja` hand-writes the same tag loop and could call `tags_add_from_button`. Left to the baseline refactor step: that code is in another component's test.
- The `auto_detect_metadata_button` sibling selector. An id would be sturdier, but the plan avoids client changes; it's a dev follow-up.
- schema.ts `edit_dataset_attributes` keys: already stale on 26.2.
- `has_class("alert-success")` right after `wait_for_visible()`: fine as is. Wrap in `retry_assertion_during_transitions` only if it flakes.

<details>

Checked, no issues: the tagging test waits on the API for `name:plus` before running cat1. The `tags_add_from_button` refactor behaves the same as before and keeps `@edit_details` on the outer method. The item selectors are `${_}`-scoped. The Auto-detect alert wait copes with the stale "updated" alert. The alert string exists on 26.2. No dev-only helpers are used. No security concerns.

</details>
