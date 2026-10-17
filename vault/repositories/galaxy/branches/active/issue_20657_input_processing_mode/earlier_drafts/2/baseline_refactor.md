Four behavior-preserving refactor commits now sit on the base, right after the "Baseline tests" commit and before the feature: a collection-type label helper, a FormSelect `label-area` slot, shared data option lookup/merge helpers, and a reusable Selenium multiselect-clearing helper. The final branch tree is byte-identical to the pre-refactor head (`18056a609f5`, kept locally as `issue_20657_pre_refactor_baseline_backup`).

## Refactor commits (on top of `ef706e3a4b2` Baseline tests)

1. `6472a21884d` **Move collectionTypeToText next to COLLECTION_TYPE_TO_LABEL.** `collectionTypeLabel`/`collectionTypeToText` move into `buildCollectionModal.ts`, and FormData's private copy is dropped. This is a pure move. The processing hint reuses it later.
2. `ab73817f5df` **Add label-area slot to FormSelect, forward it from FormSelection.** The default content is the existing label span, and the slot name matches `FormSelectMany`. Nothing uses it yet. The feature's map-over marker fills it.
3. `5686ba1e0b7` **Share data option lookup and page-merge helpers.** This adds `OptionIdentity`, `isSameItem`, `findDataOption` and `mergeDataOptions` beside `itemUniqueKey` in `FormData/types.ts`, all on the base id/src identity. `ToolForm.vue` and `WorkflowRunDefaultStep.vue` replace their hand-rolled merges with `mergeDataOptions`. FormData keys keep options with `itemUniqueKey`, and its value lookups (`currentValue`, `matchedValues`) go through `findDataOption`. Behavior is unchanged: a key-only match is the same as the old first-id/src `find`. `createValue`'s id-only dedupe stays as it was, because moving it to `isSameItem` would change behavior. That switch stays in the feature.
4. `510945a965f` **Move multiselect tag clearing into NavigatesGalaxy.** `RunsToolTests._clear_multiselect_tags` becomes `tool_form_clear_multiselect_tags`, and a condition wait replaces the per-click sleep. The base selector is unchanged. The separate selector fix stays in the feature series as a fix, not a refactor.

## Feature commits after restructuring

The feature commits keep their content. The conflicts were resolved so that each commit now builds on the helpers instead of introducing them:
- "Mark map-over options…" upgrades `itemUniqueKey`/`findDataOption` to be map-over aware and fills the existing `label-area` slot directly. The transient `after-label` slot is gone, and the commit message no longer mentions it.
- "Align dropped-collection map over…" no longer touches FormSelect/FormSelection. Its subject dropped "tidy select label slot".
- "Keep map-over options split across option pages" is now a regression test (ToolForm), the pagination comment and a docstring. `mergeDataOptions` has keyed on `map_over_type` ever since options did, so this commit no longer flips behavior. Its message says so.
- "Polish processing hint E2E tests" no longer claims the wait-not-sleep change. That change moved into refactor 4.

Known intermediate state, unchanged from the original history: at "Mark map-over options…" the baseline test "submits a collection once even when both its entries are selected" fails. "Align dropped-collection map over…" fixes it.

## Validation

- Refactor tip `510945a965f`: client vitest (Form/, ToolForm, Workflow/Run, collectionTypeDescription, Collections), 48 files and 323 tests pass. `vue-tsc` shows no errors in the changed files (14 pre-existing elsewhere). ruff is clean and mypy shows no errors in the touched Selenium files.
- Branch head `be1f6486427`: the same vitest set passes, 361 tests. The tree equals the pre-refactor head, so no E2E rerun was needed. The Selenium helper is byte-identical to the version the polish pass exercised.
- Nothing pushed.
