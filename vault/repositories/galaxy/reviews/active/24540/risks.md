Profile gx_risk_assessment · Opus 5.5 (claude-opus-5-5) · low effort · reviewed `613265a0d2f0ed31a93d2487ce9e9fd9b3796284`

The one-way part is a new required `elements_purged` field on `DCObject` and `HDCASummary` (and so `HistoryContentsResult`, generated client types, and dictified elements); once clients rely on it, its name and its counting rule ("purged elements are also counted as deleted") are hard to change. The UI and model refactor are two-way doors.

<details><summary>Risk Details</summary>

- `elements_purged` is declared required (`Field(...)`), not optional with a default. Every producer of these models (serializers, `to_dict`, adapters, element dictification) must now supply it, and external API consumers and generated clients get a new contract field.
- The counting rule is now public. `elements_purged` counts only `hda.purged`, but `elements_deleted` in the adapters counts `hda.deleted or dataset.deleted`. The schema text says purged is a subset of deleted. Purged HDAs are normally also deleted, so this holds in practice, but the API doesn't enforce it.
- Collections now show "purged" as a derived UI state: a collection counts as purged when every dataset is purged. Users will see a Purged badge on collections and must read it as "all contents gone", not "the HDCA itself was purged". HDCAs have no purged flag of their own.
- Item options are now hidden only when the collection is both all-purged and `deleted`. A non-deleted collection whose datasets are all purged keeps its options and still shows the badge. Reviewers should confirm that combination is intended.
- `dataset_dbkeys_and_extensions_summary` changes from a positional tuple to `HDCAStateSummary` (a NamedTuple, so index access still works). `CollectionStateSummary` gains a required `purged` field, which breaks any out-of-tree code constructing it positionally. The risk is low because it is internal.
- The summary SQL now selects one more HDA column (`purged`), so the performance effect is negligible.

</details>

<details><summary>Risk Review Advice</summary>

Focus on the API contract. Decide whether `elements_purged` should be required or optional with a default of `0`, and whether its name and semantics (count of purged HDAs, a subset of `elements_deleted`) are what Galaxy wants to commit to. Consider whether `elements_deleted` and `elements_purged` should apply the same `dataset.deleted`/`dataset.purged` fallback so the subset invariant holds.

On the UI, confirm that a derived collection-level "Purged" badge is the desired user model. Also check how the badge interacts with options visibility for collections that are not deleted but have all their datasets purged.

</details>
