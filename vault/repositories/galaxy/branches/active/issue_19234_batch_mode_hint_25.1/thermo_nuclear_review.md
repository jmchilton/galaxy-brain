# Thermo-nuclear code quality review (round 2) — issue_19234_batch_mode_hint_25.1

Acted on: one structural finding. After the job-unit re-scope, the rule "is this input mapped over" was written twice: in the template `v-if` (`selectionMapsOver || (type == 'data' && src == COLLECTION)`) and again inside `mapOverUnit` (`type || (type == 'data' && src == COLLECTION)`). I folded both into one `mapsOver` computed. The span uses `v-if="mapsOver"`, and `mapOverUnit` now returns early on `!mapsOver` and drops a branch. The `selectionMapsOver` computed is gone. Behavior is unchanged. FormData.vue is one line shorter than before. Commit `c2987f4abad`, pushed. Jest 30/30, vue-tsc, eslint and prettier are clean.

Not acted on:
- **The `{ code?, text }` unit shape vs dev's plain-string `mapOverUnit()`.** Dev (`collectionMatch.ts`) returns `nested <type>` as plain text for unlabeled types. Matching it would delete the `<code>` template branch, but it changes rendered text that the re-scope chose on purpose and a test pins. It would also have to port `collectionMatch.ts`. Dev rewrites this whole block anyway (`FormDataProcessingHint.vue`).
- **Hint selection is still split between a computed and the template** (`mapsOver` picks the mapped-over vs batch text). The full fix is dev's pure `getProcessingMode` and `describeProcessingMode`. A half port would grow the backport and conflict with that rewrite.
- **FormData.vue is over 1k lines** (1069 on `release_25.1`, now 1107). This was already over before the branch. Decomposition belongs on dev, which has already done it.
- **The `"single_datasets"` literal.** Dev has a `SINGLE_DATASETS` constant in `collectionMatch.ts`, which doesn't exist on 25.1. One use site doesn't justify a new export.
- **Lowercasing the label by hand vs the existing `collectionTypeToText` in FormData.vue.** That helper falls back to the raw type, so it can't tell apart the unlabeled case that needs `<code>`. Reusing it would bring back a conditional.
- **Tests.** They are well shaped: they assert anchored exact text, check the emitted payload next to the DOM, and cover single, multiple, drop, toggle and unlabeled-type cases. Nothing to change.

## Details

### Scope
`git diff 8bb256be5b1..de8046bcdf3`: `FormData.vue` +45/-7, `variants.ts` +7 (`isBatchSelection`, already aligned with dev in round 1), `FormData.test.js` +222. I compared against `issue_20657_input_processing_mode` (`processingMode.ts`, `collectionMatch.ts`, `buildCollectionModal.ts`).

### Findings
1. **Duplicated map-over predicate (structural, acted on).** The re-scope added `mapOverUnit`, and its "dataset" fallback repeated the template's `props.type == "data" && currentVariant.src == SOURCE.COLLECTION` disjunct. The two were coupled only by convention: the unit is meaningful only inside the span, but nothing tied the two conditions together. Fix:
   ```ts
   const mapsOver = computed(
       () =>
           (props.type == "data" && currentVariant.value?.src == SOURCE.COLLECTION) ||
           !!currentValue.value?.some((v) => !!v.map_over_type),
   );
   ```
   `mapOverUnit` becomes: null unless `mapsOver` and exactly one value; "dataset" when the value has no map-over type or `single_datasets`; otherwise the label, or `<code>type</code> collection`. Equivalence check: with a single value and `mapsOver` true, either the value has `map_over_type` (same branches as before) or the data+collection disjunct holds (which was the old "dataset" branch). The span's visibility is the same expression as before.
2. **Ad-hoc unit object (boundary, not acted on).** See the list above. The shape is small and local. Dev replaces it with a typed `ProcessingHintText`.
3. **Template/computed split of hint choice (spaghetti, not acted on).** Now a single named predicate rather than an inline disjunct, which is the reasonable stopping point for a backport.
4. **File size (not acted on).** The file was over 1k lines before this branch.
5. **`isBatchSelection` (round 1).** Still the right call. The function is identical to dev's, and both `createValue` and `showBatchInfo` share it.

### Verification
- `npx jest --config tests/jest/jest.config.js src/components/Form/Elements/FormData/FormData.test.js`: 30 passed.
- `npx vue-tsc --noEmit`: clean.
- eslint + prettier on `FormData.vue`: clean. Pre-commit hooks passed.
- Baseline commit `9b6f39b7609` is still first. The new commit was added on top with no history rewrite. Head is `c2987f4abad`, pushed to `jmchilton`.
