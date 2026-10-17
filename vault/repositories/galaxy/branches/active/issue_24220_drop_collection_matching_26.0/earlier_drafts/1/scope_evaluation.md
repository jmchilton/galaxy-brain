# Scope evaluation

**Recommendation: expand (modest).** Keep the branch as implemented and add two small fixes to the `canAcceptSrc` block that the baseline refactor already collapsed. (1) Run the sample-sheet column-definition check only on direct matches. Today it also refuses map-over drops that the server lists and runs. (2) Give `canAcceptSrc` and `toDataOption` the same meaning for an empty `collectionTypes`. Both fixes are in touched code, are a few lines each, have red-first rows in the existing `FormData.test.ts` drop table, and continue the issue's goal: "drag and drop agrees with the dropdown". Don't fold the workflow editor's deepest-first `_effectiveMapOver` fix into this branch. It is the same rule, but it is a different surface with no shipped trigger, and it fits better with #24218 (editor-side) or a dev follow-up.

## Possible Decompositions

The branch is 163+/25− over four files (`FormData.vue`, new `collectionMatch.ts`, `FormData.test.ts`, `test_tools.py`). All of it is stacked on `issue_24218_can_map_over_parity_26.0` (`d45d2fdb3bc`), which has to land first or with it.

- **A. One PR (as implemented).** Four commits: baseline tests, then the behavior-preserving extract of `matchCollectionType`, then the semantics change, then the DCE map-over.
- **B. Two PRs.**
  1. Baseline tests (`59d9f797cc3`) plus the extract refactor (`36f6506bc5b`). No behavior change, and it includes the API test that pins server `dce` + `map_over_type` handling.
  2. The HDCA matching fix and the DCE map-over (`56735197126`, `27146fc2ef7`).
- **C. Three PRs.**
  1. As in B.1.
  2. HDCA matching on `CollectionTypeDescription` (issue rows 1–6).
  3. DCE elements mapped over like HDCAs (row 7). The API test could move here, since it is the server fact this PR relies on.
- **D. Fold into #24218.** Ship the 24218 `canMapOver` fix and this branch as one PR, since the issue says to "land #24218 first or together".

If the recommended expansion is taken, it goes with the HDCA matching fix (B.2 / C.2), because it touches the same `canAcceptSrc` block.

## Scope: as implemented

`matchCollectionType()` (`collectionMatch.ts`) is built on `CollectionTypeDescription.canMatch` / `canMapOver`. It tries direct matches first, then the deepest input type, with the server's `paired_or_unpaired` → `paired` / `single_datasets` rewrite. `canAcceptSrc` and `toDataOption` both use it, and DCE elements that hold a collection now get `batch` / `map_over_type`. This covers all 7 rows of the issue table.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes every row in the issue, using the approach the issue proposes.</li><li>Removes the `isHDCA` special case. `FormData.vue` gets shorter.</li><li>The commits are clean to review: refactor first, then the semantics change.</li><li>Codex, normal and thermo-nuclear reviews found no must-fix issues.</li></ul> | <ul><li>Leaves one known drop/dropdown divergence in the block it rewrote (column-definition check on map-over drops).</li><li>Leaves the `[]` vs `null` `collectionTypes` inconsistency between the two gates it rewrote.</li><li>No client test covers the column-definition branch at all.</li></ul> |

## Scope: contract to a `:` boundary only (issue's rejected alternative)

Change both checks to `t === item \|\| item.endsWith(":" + t)`.

| Pros | Cons |
| --- | --- |
| <ul><li>A tiny diff.</li><li>No dependency on #24218.</li></ul> | <ul><li>Fixes only 1 of the 7 rows.</li><li>Each of the other rows would need its own special case that copies `CollectionTypeDescription`.</li><li>The issue already rejects it.</li></ul> |

## Scope: contract to matching against listed options (issue's rejected alternative)

Accept a drop only when `props.options.hdca` lists the item, and take `map_over_type` from that entry.

| Pros | Cons |
| --- | --- |
| <ul><li>The server is the only source of truth.</li></ul> | <ul><li>Options are paged, so valid off-page collections would be refused (see #24219 / #24221).</li><li>DCEs are never listed.</li><li>The issue already rejects it.</li></ul> |

## Scope: + column-definition check only on direct matches (recommended)

In `canAcceptSrc`, apply `columnDefinitionsCompatible` only when `matchCollectionType` returns `mapOverType: null`. Add drop-table rows: a direct `sample_sheet` drop with matching column definitions is accepted, one with mismatched column definitions is refused, and a `list:list` drop onto a `sample_sheet` input with `column_definitions` is accepted and mapped over.

| Pros | Cons |
| --- | --- |
| <ul><li>It is in the exact block the baseline refactor collapsed. The direct and map-over paths both run the check today.</li><li>Server parity: `DataCollectionToolParameter.match_collections` filters only direct matches by column definitions, `match_multirun_collections` doesn't filter, and `from_json` / the run path never check. So the client refuses drops that the dropdown lists and that run fine.</li><li>The check compares the dropped collection's own `column_definitions`. An outer `list:list` has none, so every map-over drop onto such an input is refused.</li><li>It adds the first client coverage of the column-definition branch.</li><li>About 2 lines of logic plus test rows.</li></ul> | <ul><li>Debatable which side is right: the mapped-over subcollections have no column definitions, so the server's multirun listing may be too lax. In that case the client is "accidentally right".</li><li>Pre-existing, and not a row in #24220.</li></ul> |

<details><summary>Details</summary>

- Server side, 26.0 `lib/galaxy/tools/parameters/basic.py`: `match_collections` (direct) runs `column_definitions_compatible`. `match_multirun_collections` only does `can_map_over`. `from_json` resolves `hdca` / `dce` ids with no collection-type or column check.
- Normal review 1 (raw parity table) flagged this as "the only remaining divergence".
- If John decides the server listing is the side that's wrong, the expansion shrinks to adding baseline rows that pin current client behavior, and a server issue for `match_multirun_collections`. Either way, the branch should gain tests for this branch of the code.

</details>

## Scope: + same empty `collectionTypes` meaning in both gates (recommended)

`toDataOption` treats `[]` as "no constraint". `canAcceptSrc` only short-circuits on falsy `collectionTypes`, so `[]` reaches `matchCollectionType` and is refused with an alert. Make both gates treat `null` and `[]` as "any collection", and widen the prop type to admit `null`, which is what the server actually sends.

| Pros | Cons |
| --- | --- |
| <ul><li>Both functions are already rewritten in this branch.</li><li>Server `to_dict` sends `collection_types: None` for an unconstrained input, but the prop is typed `Array<CollectionType>` with a `[]` default. The type hides the real value.</li><li>One-line guard plus a test row.</li></ul> | <ul><li>Mostly latent: the tool form passes `attrs.collection_types` (null when unset), so `[]` only arises from the prop default. The thermo-nuclear review notes the old code also failed on `[]`.</li></ul> |

## Scope: + workflow editor deepest-first map-over (not recommended here)

Move the deepest-first pick into `collectionTypeDescription.ts` and use it from both `matchCollectionType` and `terminals.ts` `_effectiveMapOver`. `_effectiveMapOver` currently iterates input types in declared order, while runtime (`modules.py` → `HistoryQuery.from_collection_types`) sorts deepest first.

| Pros | Cons |
| --- | --- |
| <ul><li>Same root cause as issue row 6, and one shared rule is the "general over specific" fix.</li><li>Gives the helper its canonical home (raised by thermo-nuclear and normal review 1).</li><li>The editor would show the same map-over the run produces.</li></ul> | <ul><li>A different surface (workflow editor terminals), needing its own editor tests.</li><li>Only triggered by tools that declare a shallower type before a deeper one with the same suffix. The issue found none shipped in Galaxy or tools-iuc, only a test tool.</li><li>It belongs better with #24218 (the editor's `canMapOver` parity) or a dev follow-up, where dev's `canMatch` → `accepts` rename can be handled once.</li><li>More than a modest expansion of a tool-form bug.</li></ul> |

## Scope: + async tool-request path accepts `dce` (not recommended)

`__expand_collection_parameter_async` only accepts `hdca`. The sync path, which the tool form uses, handles `dce`.

| Pros | Cons |
| --- | --- |
| <ul><li>Would make DCE map-over work on the tool-request API too.</li></ul> | <ul><li>Server side, not on the tool-form path this issue covers.</li><li>Needs its own API tests.</li><li>Better tracked as a separate issue.</li></ul> |

## Scope: + collapse the double match in `canAcceptSrc` / `toDataOption` (not recommended)

A drop runs `getElementAttributes` and `matchCollectionType` twice, once per gate. The two gates could be merged into one.

| Pros | Cons |
| --- | --- |
| <ul><li>Simpler drop path.</li></ul> | <ul><li>A pure `FormData.vue` refactor with no user-visible bug.</li><li>Increases merge-forward risk against `issue_19234_batch_mode_hint_25.1` and dev.</li></ul> |

## Unresolved questions

- Column definitions on map-over: should the client match the dropdown (relax it), or is the server multirun listing the bug (pin the client, file a server issue)?
- Editor deepest-first: fold into #24218, or a dev follow-up?
- Decomposition: one PR, or split DCE (row 7) out?
