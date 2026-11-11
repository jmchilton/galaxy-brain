# Re-scope review debrief

Run via Claude (general-purpose subagent, session default model and effort) on `b20d1d56a4f`.

The review found nothing serious. I acted on its test nit in `62a9cb88b0a`: the in-place test now also asserts `metadata_deferred is False`, removes the replacement's index file, and checks the materialized input still reads its own.

Not acted on:

- **`get_replacement_dataset` doesn't filter on `HistoryDatasetAssociation.purged`/`deleted`** (`dereference.py:200-209`). This predates the branch. A purged replacement HDA whose Dataset is still alive can be picked, and its files may already be gone, so the copy gets an empty index. Before this branch the result was a reference to a purged row, which was also broken. Out of scope; a one-line follow-up.
- **Object store I/O inside workflow scheduling:** in-place materialization now copies files, so a transient store error raises inside `hda_manager.materialize`. This is the same risk `HDA.copy()` and the job cache path carry. Noted only.

<details>
<summary>Full review</summary>

Checks: `replacement_dataset` is assigned only under `if attached:`, so the setter always has a session (the instance is added at ~219, and `materialize()` commits right after). The dataset and `dataset_id` are set to the replacement's just before the setter. The extension is unchanged and filtered equal by `get_replacement_dataset`. `object_store_id` is filtered equal and the replacement Dataset is OK, so `exists()` is true and the file is copied. The early return needs no regeneration, since composite and extra-files datatypes are excluded. LDDAs can't reach `in_place` (it asserts an HDA). The new test goes through the real `get_replacement_dataset` match and fails with the old raw `_metadata` assignment.

Findings: (1) Low, pre-existing: `get_replacement_dataset` ignores HDA purged/deleted; a purged replacement whose Dataset is still alive yields an empty copied index. Suggested follow-up: filter on `HistoryDatasetAssociation.purged == false()`. (2) Low: object store I/O inside `__attempt_materialize`'s exception handling; acceptable, same as `HDA.copy()`. (3) Nit: optionally test removal of the replacement's file and `metadata_deferred`.

</details>
