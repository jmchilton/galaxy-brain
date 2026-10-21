Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: e879751951cabc2a78ccc411683425ea5faa67ef

Risks are minimal - this release-branch bug fix only changes how skipped database-operation outputs are materialized, adds no API, schema, or workflow-format surface, and can be reverted cleanly (a two-way door).

<details><summary>Risk Details</summary>

- Skipped database-operation outputs that previously aliased input HDAs now get new HDA copies staged into the history; this adds rows/hidden items per skipped run but nothing that is hard to undo.
- `set_skipped` now assigns the object store after creating the replacement dataset; the replacement no longer inherits the input's `object_store_id`, so skipped outputs may land in a different store than before on distributed/hierarchical setups (intended, and only affects tiny `null` placeholders).
- Input datasets already corrupted by the bug on existing servers (e.g. usegalaxy.eu) are not repaired; that is a data cleanup question outside this PR, not a new commitment it creates.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm the input-ID set covers every way an output can share an input HDA (direct `inp_data` plus nested `collection.dataset_instances`) and that switching the loop to `dataset_elements` with in-place `dce.element_object` reassignment keeps nested output structure intact. The only non-test path touched for non-skipped runs is the `set_skipped` reordering, so a quick look at its other callers (`replace_dataset=False`) is worthwhile.

</details>
