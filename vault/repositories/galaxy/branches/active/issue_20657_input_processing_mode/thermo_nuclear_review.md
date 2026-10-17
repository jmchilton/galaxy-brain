# Thermo-nuclear review debrief (hardening pass 2, post re-scope)

I acted on four findings without changing behavior: a test-file split, one pure function for the hint sentence, a layering fix and a deleted wrapper. The commits are `024adf78013`, `5d15cfcdb30` and the comment fix `cab17f2f1a9`, in the worktree and not pushed. I did not act on the rest, which are earlier-pass declines that still hold, i18n, or pre-existing structure.

Tests (`FormData.vue` is now 1357 lines, base 1359):
- vitest on node 22.20.0 across FormData/, collectionTypeDescription, ToolForm, Workflow/Run/, Collections/ and FormSelect*: 27 files, 220 tests pass.
- After the split, the FormData/ test names match the pre-split run exactly, 71 tests.
- `vue-tsc` reports no errors in changed files. The 14 errors it does report are elsewhere and pre-existing.
- `test_parameter_pagination.py` passes (3 tests). The pre-commit prettier and client eslint checks pass.
- I didn't run the E2E tests. No selectors, classes or hint text changed.

## Not acted on

- **The earlier-pass declines still hold** ([earlier_drafts/2/thermo_nuclear_review.md](earlier_drafts/2/thermo_nuclear_review.md)):
  - `FormData.vue` decomposition and the `useKeepOptions` composable are pre-existing structure. Follow-up.
  - The `isToolForm` gate appears twice, in the hint and in the legacy block.
  - The `label-area` forwarding is duplicated per branch in `FormSelection.vue`, which matches its `after-list` and `no-options` pattern.
  - `findDataOption` keeps its `toOption` accessor.
  - The label helpers stay in `buildCollectionModal.ts`.
- **Hint text is localized in fragments** (`localize("The selected")` + label + `localize("will be")`). This is an i18n smell, but fixing it changes the strings the translators see. It is now in one place (`describeProcessingMode`), so a follow-up can switch to whole-sentence templates.
- **`matchCollectionType` returns `{ mapOverType } | null`**, and `canNestToMapOver` reads its three states through `?.mapOverType === null` and `!!…?.mapOverType`. This is dense but correct and tested. Named predicates would be a nit-level change.
- **The `pagination.py` row loop** (`emitted = result if isinstance(...) else [result]` as four lines) is pre-existing style. The codex pass's limit-check change in the same loop is clean.
- **The Selenium and `navigation.yml` changes** (`tool_form_clear_multiselect_tags` in `NavigatesGalaxy`, the `*[contains(@class,'multiselect__tag-icon')]` XPaths) are fine as they are.

<details>
<summary>Full review</summary>

### 1. `FormData.test.ts` crossed 1k lines: acted on (`024adf78013`)

The branch added about 770 lines of tests to a 611-line file, which made it 1382 lines. Nearly all of the growth sat in two cohesive describes: `map-over options` (about 260 lines) and `processing hint` (about 350 lines).

They moved verbatim into `FormData.mapOver.test.ts` and `FormData.processingHint.test.ts`, following the `GalaxyAI.newchat.test.ts` dotted-spec precedent. Both new files keep the outer `describe("FormData")`, so full test names are unchanged. I checked this by diffing the sorted verbose test names before and after.

The pure helpers moved to `testData/formDataHarness.ts`: `createTarget`, a live-bound `eventStore`, `defaultOptions`, `nestedListProps`, `openMultiselect` and the selectors. The mock imports, `vi.mock` and `useServerMock` stay in each spec file, because hoisting and lifecycle hooks are per file.

Resulting sizes: `FormData.test.ts` 702, `FormData.mapOver.test.ts` 285, `FormData.processingHint.test.ts` 380, harness 75.

### 2. Processing hint assembled its sentence two ways: acted on (`5d15cfcdb30`)

`FormDataProcessingHint.vue` built most sentences with a `lead` computed. The single-collection map-over branch instead built its own subject inline. That branch had three nested `v-if`s (no selection, labelled type, raw `<code>` type) plus the separate computeds `selectedLabel`, `jobUnit` and `nestText`. That is two mechanisms branching on overlapping mode fields.

The sentence is now one pure function, `describeProcessingMode(mode)` in `processingMode.ts`. It returns `{lead, code?, link, tail, nest?}`. The component is a computed plus one flat template: an icon, a lead, an optional `<code>`, a help link, a tail and an optional nest link.

One whitespace pitfall came up along the way. A `<template v-if>` wrapper dropped the space before the link ("will bemapped"). Two existing exact-text tests caught it, and I fixed it in the template, not in the tests. All the hint tests pass unchanged.

### 3. Submission and option labels depended on the hint module: acted on (`5d15cfcdb30`)

`FormData.createValue` decides the submitted `batch` flag, and it imported `isBatchSelection` from `processingMode.ts`. `FormDataOptionLabel.vue` imported `mapOverUnit` from the same module. This is the dependency-direction smell the earlier pass fixed for `matchCollectionType`.

I moved `isBatchSelection` into `variants.ts`, which owns `BATCH`, using a type-only `DataOption` import. I moved `mapOverUnit` into `collectionMatch.ts`, next to `SINGLE_DATASETS`. The hint module now only consumes these helpers.

### 4. The `mapOverMarkerType` wrapper existed only to gate on `isToolForm`: acted on (`5d15cfcdb30`)

The two `label-area` slot templates are now `<template v-if="isToolForm" v-slot:label-area>` and pass `option.value?.map_over_type` directly. This is the same conditional-slot pattern the file already uses for `after-list`. Outside tool forms the slot is absent, so FormSelect's default label span renders, which is the same DOM as before. The "leaves workflow run options unmarked" test covers this.

The reason dataset-input collections carry no marker is a fact about the server's data shape: they are listed without `map_over_type`. I moved that note into the `isToolForm` doc comment. It covers only single-dataset inputs (checked against `basic.py`; `multiple` data params can set `subcollection_type`), and `cab17f2f1a9` makes the wording say so.

### 5. Reviewed and fine

- **Removing the legacy "supplied input will be mapped over" span.** Outside tool forms, a batch-enabled variant exists only for `module_*` flavors, and `module_data` has no collection variant. The span was therefore unreachable once tool forms moved to the hint, so deleting it is dead-code removal.
- **`canAcceptSrc`.** `matchCollectionType` collapses the old duplicated direct and `endsWith` branches, each of which had its own column-definitions check, into one.
- **The `CollectionTypeDescription.canMapOver` rewrite.** It removes the rank-gated early branch, matches the server semantics and has tests.
- **The `accumulate_with_filter` change.** Moving the limit check to after the whole row is minimal and keeps post-filter offset semantics. The docstring and comment explain the client merge contract.
- **`mergeDataOptions`.** It replaces two hand-rolled id+src merges, in `ToolForm.vue` and `WorkflowRunDefaultStep.vue`.
- **`collection_type` on `make_hdca_entry`.** It is a one-key addition that the hint and `findDataOption` rely on.

</details>
