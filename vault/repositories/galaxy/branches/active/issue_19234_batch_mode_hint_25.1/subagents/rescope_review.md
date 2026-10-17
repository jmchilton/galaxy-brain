# Re-scope review — issue_19234_batch_mode_hint_25.1

Acted on: the job unit now comes from the existing `COLLECTION_TYPE_TO_LABEL` ("one job per dataset pair", the same text as dev). Unlabeled types fall back to `<code>type</code> collection`. The unit text is localized with `localize()` in a computed instead of `v-localize` spans. Commit `de8046bcdf3`, pushed to `jmchilton`. Server semantics checked, and the unit text is correct. Nothing else changed.

The `MAPPED_OVER_PER_PAIRED` → `MAPPED_OVER_PER_PAIR` expectation change ("paired collection" → "dataset pair") is a deliberate wording change. It is not a weakened assertion: it is still an exact, anchored match. Red→green: 3 tests failed before the fix. Added a test that pins the fallback (`list:paired_or_unpaired` → `paired_or_unpaired` unit, shown in `<code>`). jest 30/30, `vue-tsc` clean, eslint/prettier clean.

Not acted on:
- **Multiple selections still say "mapped over this tool."** The server doesn't split collections when there are several batch values (`__collection_multirun_parameter` needs exactly one value). It runs one job per selected collection, so "mapped over" is loose here. Dev says "Each selected collection will be run as a separate job". This came from the original scope, and the fix belongs with 20657's hint rewrite.
- **The lead "The supplied input will be … this tool" is not localized.** This predates the branch. The sentence is also split into fragments, so translators can't reorder it. Dev splits it the same way.
- **"this tool" wording in the workflow-run form.** This predates the branch and was already deferred by the normal review and the scope evaluation.
- **Dev's `nested <type>` fallback isn't copied.** For a backport, `<code>type</code> collection` reads better. Dev may want to adopt this form later.

## Details

### Server semantics (unit correctness)
- **`map_over_type` X** goes to `meta.__expand_collection_parameter` and then `subcollections._split_dataset_collection(collection, X)`. That yields every X-typed subcollection, recursing through deeper levels, so "one job per X" is correct.
- **`single_datasets`**: `_is_a_subcollection_type` accepts it. A flat collection promotes each element through `PromoteCollectionElementToCollectionAdapter`, and a nested one recurses down to its leaves. So it is one job per dataset, and "dataset" is correct.
- **Plain `data` input with a collection and no `map_over_type`**: `collection.dataset_elements` flattens to every leaf. A `list:paired` gives one job each for forward and reverse, so "per dataset" is correct.
- **`data` + `multiple` with a nested collection**: `basic.py` ~2460 sets `map_over_type = can_map_over(hdca).collection_type`, and a single selection splits by it, so the unit is correct. A flat `list` on `data_multiple` gets no `map_over_type`, uses a `BATCH.DISABLED` variant, and shows no hint, which is correct.
- **`paired_or_unpaired` inputs** (`basic.py` ~2675): `list:paired` → `paired` ("dataset pair"), flat `list` → `single_datasets` ("dataset"), `list:paired_or_unpaired` → `paired_or_unpaired` (no label, so `<code>` fallback). All three are covered by tests.

### Reuse / wording
- The rescope debrief said "25.1 has no `collectionTypeLabel`, so a collection unit shows the raw type". That is wrong. `FormData.vue` on 25.1 already imports `COLLECTION_TYPE_TO_LABEL` from `History/adapters/buildCollectionModal` (`paired` → "dataset pair", `list:paired` → "list of pairs"), and its local `collectionTypeToText` uses it. Using the map clears the scope evaluation's listed con ("shows a raw type rather than dev's `collectionTypeLabel` wording"). It also makes the megahit case read the same as dev: "…mapped over this tool: one job per dataset pair."
- I used the map directly rather than `collectionTypeToText`. That function falls back to the bare type with no `<code>` and no "collection", which reads badly ("one job per paired_or_unpaired").

### Localization
- `v-localize` only translates in its `bind` hook. When the selection flips between the collection and dataset branches, Vue can patch the existing `<span>` in place and write back the untranslated template text. A label that comes from code would never be translated by it either. The unit is now built in the `mapOverUnit` computed with `localize()` (same import as `FormRepeat.vue`), so it updates reactively. "one job per" uses `{{ localize(...) }}`. English output is unchanged apart from the wording fix.

### Workflow-run form
- Workflow-run inputs use the `workflow_data_collection` variant (`BATCH.DISABLED`). When a map-over option is selected, the hint now shows with the unit. That is directionally correct, since downstream steps map over that unit. The "this tool" wording predates the branch (see not-acted list).

### Tests
- Exact anchored regexes, with whitespace normalized only because of template line breaks. They cover data input + collection (dataset), nested paired (dataset pair) for direct, toggle and drop, `single_datasets` (dataset), unlabeled type (`<code>` fallback), and multiple selections (no unit). They are not trivial, and none were weakened.
