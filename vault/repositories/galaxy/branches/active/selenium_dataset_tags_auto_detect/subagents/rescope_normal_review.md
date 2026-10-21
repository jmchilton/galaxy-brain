# Normal review after re-scope

Verdict: approve, no bugs. I took the vitest suggestion. `DatasetAttributes.test.ts` now clicks `#dataset-attributes-autodetect-metadata` and checks that the request's `operation` is `autodetect`. It passes (5/5) and fails without the id. It's folded into the Auto-detect commit (`157d6e7c064`).

Not acted on:
- A `metadata_disable` vitest checking the button is absent. The button's `v-if` was already there; the branch doesn't change it.
- `history_panel_wait_for_hid_ok(1)` after the Auto-detect click isn't the sync point, but the API `_wait_on` that follows covers it. It's harmless, so I left it.
- The stale `edit_dataset_attributes` interface in schema.ts: pre-existing, and declined by the scope evaluation.

<details>

- The id sits next to the existing `v-if`, so a `metadata_disable` server makes the test fail loudly instead of retargeting. Button counts in the vitest are unchanged.
- The only caller of `auto_detect_metadata_button` is `test_dataset.py`, and the old sibling selector is gone.
- One attribute of markup on 26.2 follows the `selenium_history_datatype_citations` precedent.
- No security concerns.

</details>
