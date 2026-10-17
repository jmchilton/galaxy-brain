# Scope evaluation (round 2, post re-scope)

**Recommendation: keep.** The re-scope already took the modest expansion that round 1 recommended: column definitions are now checked only on direct drops, and empty `collectionTypes` means no constraint. Since then, Codex found and fixed one more drop/refresh gap, the DCE `map_over_type` keep. No user-visible bug remains in the touched code at `f6ff31f7187` that a few more lines would fix. The remaining candidates are server changes, editor changes, or refactors, and each fits better as a follow-up. The strongest is the server `to_dict` reporting `map_over_type` for a selected DCE. I checked whether a FormData remount could lose the client-side patch. Version switch, the only `:key` remount found, refetches the form without values, so it isn't a path, and I found no other common remount. That makes the server change hardening, not a fix. The one open item is John's call on column definitions under map-over (see below). It is a decision about behavior HEAD already ships, not a reason to resize. Because this verdict is keep, the branch doesn't need to park for a scope decision.

Stacking note, not a scope change: `issue_24218_can_map_over_parity_26.0` is now at `c217ced0660`, ahead of this branch's base `d45d2fdb3bc`. `d29206dcd71` changes `CollectionTypeDescription.canMapOver`, which `matchCollectionType` calls. It adds the `:` boundary for `paired:paired_or_unpaired` higher ranks. No row in this branch's drop table uses a `paired:paired_or_unpaired` input, so no row should flip. Still, rebase onto `c217ced0660` and rerun Form + Workflow vitest before opening.

## Possible Decompositions

The branch is +284/−46 over 4 files: about 100 lines of source (`FormData.vue`, new `collectionMatch.ts`), about 183 lines of `FormData.test.ts` and 34 lines of `test_tools.py`. All of it stacks on #24218, which has to land first or in the same PR. Commits: `622d604a43e` baseline, `8dcf21ccad0` helper extract + `canAcceptSrc` guard-clause flatten, `f11e05aefc5` match like server, `2338074fe14` DCE map-over (includes the Codex refresh-keep fix), `07e9cc7a177` column definitions on direct drops only, `f6ff31f7187` empty `collectionTypes`.

- **A. One PR (as implemented).** All six commits, after #24218.
- **B. Refactor PR + fix PR.**
  1. `622d604a43e` + `8dcf21ccad0`. Baseline tables, the API test that pins server `dce` + `map_over_type`, and the extract/flatten. No behavior change.
  2. `f11e05aefc5` … `f6ff31f7187`.
- **C. Three PRs by surface.**
  1. As in B.1.
  2. HDCA matching: `f11e05aefc5`, plus `f6ff31f7187` (same gates).
  3. DCE map-over (`2338074fe14`), which is issue row 7 plus the refresh keep. The API test could move here, since it's the server fact this PR relies on.
  - `07e9cc7a177` (column definitions) rides with C.2, or stands alone if John wants to debate it separately.
- **D. Split out the column-definition change.** A, minus `07e9cc7a177` and its tests, as a separate small PR. This isolates the one behavior change that is debatable.
- **E. Fold into #24218.** One PR covering the `canMapOver` parity and drop matching. The issue says "land #24218 first or together".

## Scope: as implemented (recommended)

One `matchCollectionType()` helper on `CollectionTypeDescription.canMatch`/`canMapOver` (deepest first, with the server's `paired_or_unpaired` rewrite) drives both drop gates for HDCAs and collection-holding DCEs. Column definitions are checked only on direct drops. `null` and `[]` `collectionTypes` mean "any". A selected DCE keeps its `map_over_type` across option refreshes.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes all 7 issue rows, plus the two touched-code divergences round 1 found, plus the Codex refresh bug.</li><li>Client-only (plus one API pin test). Fits a 26.0 backport.</li><li>Normal review 2, Codex and thermo-nuclear: no must-fix left. Clean refactor-then-fix commits.</li><li>`FormData.vue` shrinks (1069 → 1064).</li></ul> | <ul><li>The `formattedOptions` keep patch works around a server omission instead of fixing it.</li><li>The column-definition relaxation means mapped jobs receive column-less lists; which side is right is still open.</li><li>`matchCollectionType` lives in `FormData/`, not beside `canMatch`/`canMapOver`.</li></ul> |

## Scope: contract to original scope (alt branch)

`issue_24220_drop_collection_matching_26.0_alt_original_scope` (`27146fc2ef7`): the 7 issue rows only, without the column-definition and empty-`collectionTypes` changes.

| Pros | Cons |
| --- | --- |
| <ul><li>Smallest diff that closes the issue table.</li><li>Avoids the column-definition debate.</li></ul> | <ul><li>Leaves two known divergences in code the branch rewrote.</li><li>Lacks the first client tests of the column-definition branch.</li><li>Goes against the user's standing preference for fixing related bugs in touched code.</li></ul> |

## Scope: revert column-definition relaxation; tighten server multirun listing instead (open decision, not recommended as resize)

Revert `07e9cc7a177` (option b), or also make the server's `match_multirun_collections` / `from_json` refuse column-less map-over onto column-defined `sample_sheet` inputs (option c). The client would then keep refusing these drops.

| Pros | Cons |
| --- | --- |
| <ul><li>Mapped jobs on a column-defined input would never get rows without column data.</li><li>Arguably the semantically "right" contract for `sample_sheet`.</li></ul> | <ul><li>Today the 26.0 dropdown lists these collections and they run. Reverting makes drop and dropdown disagree again, against the issue's goal.</li><li>Option (c) is a server behavior change that could break API callers. It is its own issue, needs its own discussion, and needs `sample_sheet` design input.</li><li>No user report asking for the stricter behavior.</li></ul> |

<details><summary>Details</summary>

`sample_sheet` is outermost-only, so the map-over units are plain lists. On the server, `match_collections` filters direct matches by `column_definitions_compatible`. `match_multirun_collections` doesn't filter, and `from_json` checks neither type nor columns. The branch makes the client agree with the dropdown. If John prefers (c): file a server issue, keep this branch as is, and revert the `match.mapOverType === null &&` guard and flip its test once the server tightens. That flip is noted in normal review 2.

</details>

## Scope: + server `to_dict` reports `map_over_type` for a selected DCE (follow-up)

In `DataCollectionToolParameter.to_dict`, compute the selected DCE's map-over from `dce.child_collection.collection_type`. Pull the inline `paired_or_unpaired` → `paired`/`single_datasets` rewrite out of the multirun loop into one helper that both sites call. Add an API test on `/build`. Keep the client patch and its test.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the root cause the Codex finding exposed. The thermo-nuclear review calls it cleaner long term.</li><li>Yields a reusable server helper (the rewrite is duplicated today).</li><li>Protects any client path that rebuilds `FormData` without the keep cache.</li></ul> | <ul><li>No user-visible bug left to fix. The client patch covers refreshes, and the one remount path found (version switch, `FormDisplay :key="id"`) refetches the form without values.</li><li>Adds a server change and an API test to a client-only backport.</li><li>`HistoryQuery.can_map_over` takes an `HdcaLike` (`.collection`), so a DCE needs an adapter.</li><li>A good dev/26.0 follow-up on its own.</li></ul> |

<details><summary>Details</summary>

Remount check: `keepOptions` is component-local (`FormData.vue:111`). The only `:key` remount on the tool form path is `FormDisplay`'s `:key="id"`, and `ToolForm.onChangeVersion` calls `getToolFormData` without current values. So the selection is gone anyway. Inputs inside conditionals and repeats (`FormInputs.vue` `v-if="conditionalMatch"`, `:key="index"`) could in theory remount or reorder a `FormData` that holds a mapped DCE. I didn't verify this. It would be rare, and it's the scenario where the server fix would matter.

</details>

## Scope: + workflow editor deepest-first `_effectiveMapOver` (not recommended)

Share deepest-first selection between `matchCollectionType` and `terminals.ts`.

| Pros | Cons |
| --- | --- |
| <ul><li>Same rule as issue row 6, and it gives the helper its canonical home.</li></ul> | <ul><li>A different surface, with no shipped tool triggering it. It belongs with #24218 or dev (`canMatch` → `accepts` rename). Round-1 call, unchanged.</li></ul> |

## Scope: + collapse double gate / move helper into `collectionTypeDescription.ts` (not recommended)

`toDataOption` returns the match or a refusal reason, `canAcceptSrc` drops its collection branch, and the helper moves next to `canMatch`.

| Pros | Cons |
| --- | --- |
| <ul><li>One gate, which removes a class of drift (the empty-`collectionTypes` bug was gate drift).</li></ul> | <ul><li>A pure refactor of the pre-existing two-gate flow, with merge-forward risk (`issue_19234_batch_mode_hint_25.1`, dev rename). Thermo-nuclear: dev follow-up.</li></ul> |

## Scope: + async tool-request path accepts `dce` (not recommended)

`__expand_collection_parameter_async` only takes `hdca`.

| Pros | Cons |
| --- | --- |
| <ul><li>DCE map-over on the tool-request API.</li></ul> | <ul><li>Server-side, and not the tool-form path. Separate issue.</li></ul> |

## Scope: + `from_json` validates collection type / columns (not recommended)

Server rejects an `hdca`/`dce` whose type doesn't match the input (or its map-over).

| Pros | Cons |
| --- | --- |
| <ul><li>Defense in depth: today a wrong payload silently runs (issue row 7's original failure mode).</li></ul> | <ul><li>Could reject API payloads that are accepted today. Not for a 26.0 backport. Dev issue.</li></ul> |

## Scope: + widen `collectionTypes` prop to `| null` (not recommended)

| Pros | Cons |
| --- | --- |
| <ul><li>The type would match what the server sends.</li></ul> | <ul><li>Tried in normal review 2: type errors ripple into child components. The runtime is already safe through `restrictedCollectionTypes`.</li></ul> |

## Scope: + E2E history-item → tool-form drop (not recommended)

Add a `tool_form_drop_history_item` helper that fires `dragenter`, plus one map-over drop E2E.

| Pros | Cons |
| --- | --- |
| <ul><li>An end-to-end pin of the drop path.</li></ul> | <ul><li>Needs a new shared helper, and the existing `drag_and_drop` is used by editor tests. Dev follow-up, per the test challenges debrief.</li></ul> |

Sweep note: I grepped all of `client/src` for collection-type `endsWith`. Outside `FormData`, the only suffix checks are in the workflow editor (`terminals.ts`, `collectionTypeDescription.ts`, which belong to #24218/dev) and in collection creators (pairing UI, not input matching). No other tool-form or run-form drop check has the same bug.

## Unresolved questions

- Column definitions under map-over: keep the relaxation (matches the dropdown), or file a server issue to tighten `match_multirun_collections`?
- Server `to_dict` DCE `map_over_type`: file it as a follow-up issue, or skip it?
- Decomposition: one PR, or split out the column-definition commit (D) or the DCE commit (C.3)?
- Ship with #24218 as one PR (E), or stacked?
