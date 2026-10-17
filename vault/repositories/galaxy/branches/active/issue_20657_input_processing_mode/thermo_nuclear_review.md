# Thermo-nuclear review debrief

I acted on four findings in commit `18056a609f5` (worktree, not pushed): a duplicated keep-option path, a duplicated marker slot, a layering leak, and assertion-heavy matching. The changes preserve behavior. `FormData.vue` now has 1361 lines, up from 1359 on base; the branch had grown it to 1386. I did not act on the remaining findings. Most are pre-existing structure in `FormData.vue` or would be large refactors.

Tests: vitest on node 22.20.0, covering FormData/, FormSelect*, collectionTypeDescription, ToolForm and Workflow/Run/: 18 files, 168 tests pass. One failure appeared mid-change (a wrapper span broke the "marker sits beside the label" assertion). I fixed the component, not the test. `vue-tsc` shows no errors in the changed files; the 22 errors it reports are pre-existing and unrelated. The pre-commit client eslint and prettier checks pass. I did not run the E2E tests, because selectors and the `.form-data-map-over-marker` class are unchanged.

## Not acted on

- **`FormData.vue` is already over 1k lines (1359 on base).** The branch didn't cross the threshold. Decomposing it (keep-options cache, drag/drop, paging sentinel) is a separate refactor. Follow-up.
- **`formattedOptions` keep-option reconciliation has a three-way branch** (add / replace same key / keep the server's differently-mapped entry). It is correct, and the keep-options cache model is pre-existing. A cleaner fix is a `useKeepOptions` composable that owns `keepOptions`, `keepOptionsUpdate`, `isInKeepOptions` and `normalizeOption`. Follow-up together with the decomposition above.
- **`isToolForm` gates twice** (`processingMode` returns null outside the tool form, and the template's legacy block is `v-else-if="!isToolForm"`). Merging the two would put the legacy linked/unlinked block behind `processingMode` semantics it doesn't share. The duplication is small and explicit, so I left it.
- **The `label-area` forwarding in `FormSelection.vue` is duplicated per branch.** That matches the existing pattern for `after-list` and `no-options`. A generic `$slots` passthrough would be a wider change to a shared component.
- **`findDataOption` keeps a `toOption` accessor.** Callers mix `SelectOption[]` and `DataOption[]`, and need the container back to replace it in place. Splitting it would add index bookkeeping at the call sites.
- **`collectionTypeLabel` / `collectionTypeToText` live in `buildCollectionModal.ts`.** That module already owns `COLLECTION_TYPE_TO_LABEL`, so I left them there.

<details>
<summary>Full review</summary>

### 1. Duplicated keep-option normalization in `handleIncoming`: acted on

After this branch, the loop body in `handleIncoming` was `normalizeOption` line for line: find the server option, otherwise cache it in `keepOptions` with the `hid || "Selected"` label, bump `keepOptionsUpdate`, and return the canonical option. Two copies of the cache rule invite drift, for example in key format or label. Fix: `incomingValues.push(normalizeOption(newValue))`. I also updated the docstring, which covers dropped and dialog-selected items as well as uploaded ones.

### 2. Map-over marker slot copied into both selects: acted on

`FormData.vue` had two identical `label-area` templates that each called `mapOverMarker()` twice per option, once for `v-if` and once for the text, and the marker CSS sat in FormData's unscoped style block. I extracted `FormDataOptionLabel.vue`, which takes props `label` and `mapOverType`, builds the localized text, and holds scoped CSS. FormData keeps only the tool-form policy (`mapOverMarkerType`). The component renders two sibling spans (Vue 3 fragment), so the existing DOM shape (label span first, marker beside it) and the E2E selector are unchanged.

### 3. Acceptance logic imported from the hint module: acted on

`matchCollectionType` is the client's mirror of server option listing and map-over typing (`basic.py` and `map_over.py`, including the `paired_or_unpaired` → `paired`/`single_datasets` rule). `canAcceptSrc` and `toDataOption` in FormData use it to decide whether a drop is accepted, but it lived in `processingMode.ts`, the module behind the explanatory hint. I moved it and `SINGLE_DATASETS` to `FormData/collectionMatch.ts`. `processingMode.ts` now imports it, so dependencies run one way: acceptance → matching, hint → matching.

### 4. `findDataOption` non-null assertions and inline identity checks: acted on

`findDataOption` filtered candidates, then called `toOption(item)!` twice more. `createValue` repeated `v.id === value.id && v.src === value.src` inline. I added `isSameItem` (id+src, ignoring map-over) next to `itemUniqueKey` in `types.ts` and a shared `OptionIdentity` type. `findDataOption` now resolves `{item, option}` pairs once and has no assertions. `createValue`'s dedupe uses `isSameItem`.

### 5. FormData.vue size / keep-options model: not acted on

The file was 1359 lines before the branch. The keep-options cache (`keepOptions`, `keepOptionsUpdate`, `isInKeepOptions`, `normalizeOption`, and the reconciliation in `formattedOptions`) is the natural seam for a `useKeepOptions` composable. That would delete the manual reactivity counter and the three-way reconciliation branch from the component. It is a pre-existing structure and a larger change than this PR warrants.

### 6. Reviewed and fine

- `processingMode.ts`: a typed discriminated union (`batch` / `bulk`) with the logic kept out of the component. `canNestToMapOver` is dense but rests on `matchCollectionType` and has direct tests.
- `CollectionTypeDescription.canMapOver`: the rewrite removes the rank-gated early branch and matches the Python `type_description` semantics, with tests.
- `mergeDataOptions` replaces two hand-rolled id+src merges in `ToolForm.vue` and `WorkflowRunDefaultStep.vue`. It removes duplication.
- The `FormSelect` `label-area` slot reuses the slot name `FormSelectMany` already exposes.
- Selenium: `tool_form_clear_multiselect_tags` replaces a sleep loop with a condition wait and moves to `NavigatesGalaxy` for reuse. Imports are at module top.

</details>
