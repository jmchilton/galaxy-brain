Fix 🎯 #24220 - tool form drag and drop matches collections to collection inputs by plain string suffix, so it refuses collections the dropdown lists and accepts ones the dropdown doesn't.

Drag a collection onto a tool form collection input and the client decides by `endsWith`: no `:` boundary, no `paired_or_unpaired` or `sample_sheet` rules, first declared type instead of deepest. The server's dropdown knows all of these, so drag and drop and the dropdown disagree in both directions.

| Drop | Before (`release_26.0`) | After |
|---|---|---|
| `list:paired_or_unpaired` on a `paired` input - not in the dropdown, fails at run time | ![accepted](screenshots/before_paired_input_drop_list_paired_or_unpaired_2_dropped.png) Accepted, mapped over `paired`; the job fails with "Cannot split collection in desired fashion." | ![refused](screenshots/after_paired_input_drop_list_paired_or_unpaired_1_dragover.png) Refused with an alert; the value is unchanged. |
| `list:paired` on a `paired_or_unpaired` input - listed in the dropdown | ![refused](screenshots/before_paired_or_unpaired_input_drop_list_paired_1_dragover.png) Refused: "list of pairs dataset collection is not a valid input…" | ![accepted](screenshots/after_paired_or_unpaired_input_drop_list_paired_2_dropped.png) Accepted and mapped over, as the dropdown offers it. |

***This is client-only: drops now follow the rules the 26.0 server already uses for the dropdown. Nothing the server accepts or lists changes, and the workflow editor's code is untouched (the fix reuses its `CollectionTypeDescription`).***

***It targets 26.0 only: 25.1's dropdown still has the suffix bug, so a fixed client would disagree with it there.***

All seven rows of the issue's table are fixed: `paired` accepted directly on `paired_or_unpaired`, `list`/`list:paired` accepted directly on `list:paired_or_unpaired` and mapped over on `paired_or_unpaired`, `sample_sheet` accepted on `list`, `X:paired_or_unpaired` refused on `paired`, the deepest declared type picked for map-over, and dropped collection elements mapped over like collections.

***One drop is newly allowed on purpose: a mapped-over drop onto a `sample_sheet` input with column definitions, because the 26.0 dropdown already lists and runs it (see Risks).***

<details><summary>How</summary>

- One helper, `matchCollectionType()` (`FormData/collectionMatch.ts`), built on the client's existing `CollectionTypeDescription.canMatch`/`canMapOver`, the same class the workflow editor uses and the one `type_description.py` says must stay in sync with the server. It tries a direct match, then maps over the deepest input type, with the server's `paired_or_unpaired` → `paired` / single-datasets rewrite.
- Both drop gates use it: `canAcceptSrc` (dragenter/drop) and `toDataOption` (the emitted value). This covers HDCAs and collection elements that hold a collection.
- A dropped element keeps its `map_over_type` when the form refreshes its options. The server lists the selected element without it, so without this the next emit would drop the map-over.
- Both gates read one `restrictedCollectionTypes`, so they can't disagree on an unrestricted input (they did on `[]`; the server sends `null`, so this is consistency, not a user-visible fix).
- `sample_sheet` column definitions are checked only on direct drops, like the server's listing.

</details>

<details><summary>Tests</summary>

- `FormData.test.ts` drop tables mount `FormData`, fire real dragenter/drop events with HDCAs and collection elements, and assert the emitted payload or the refusal alert. Baseline rows (behavior the client already got right, plus the first client tests of the `sample_sheet` column-definition check) are in the leading commit; each fix commit flips only the rows it fixes and fails at its parent.
- `test_can_map_over_dce_on_collection_param` (API) pins the one server fact the element map-over relies on: a `dce` with a `map_over_type` on a collection input maps over that level.
- No E2E: the shared `drag_and_drop` helpers don't fire `dragenter`, which `FormData` needs. The screenshots above are ad hoc captures.

</details>

## Risks

One behavior is a judgement call: a mapped-over drop onto a `sample_sheet` input with column definitions is now accepted, matching the 26.0 dropdown, and each job gets a plain list without column data. Everything else is a two-way door.

<details><summary>Risk Details</summary>

- The `sample_sheet` relaxation above follows the server's `match_multirun_collections`, which doesn't check column definitions. If that's the server's bug, the fix is a server issue plus reverting one `match.mapOverType === null &&` guard and flipping its test.
- The `formattedOptions` patch that keeps a dropped element's `map_over_type` works around the server's `DataCollectionToolParameter.to_dict` omitting it; a server fix would let it go.
- Merge forward: `dev` renamed `canMatch` to `accepts`, so `collectionMatch.ts` needs that rename on merge.
- 25.1 isn't targeted: its dropdown still has the suffix bug, so a fixed client would disagree with it.

</details>

<details><summary>Risk Review Advice</summary>

Compare `matchCollectionType` against `DataCollectionToolParameter.to_dict` / `HistoryQuery` in `basic.py` and `query.py`: direct match first, deepest map-over next, then the `paired_or_unpaired` rewrite. Then decide whether the `sample_sheet` map-over drop should follow the dropdown (as here) or the dropdown should be tightened.

</details>

## Context

Builds on 🔀 #24227 (🎯 #24218, merged), which fixed the client's `canMapOver` for `X:paired_or_unpaired` inputs; without it the helper would accept a `paired` drop on `list:paired_or_unpaired`. Follow-up to 🔀 #18623 (added the suffix check) and 🔀 #22193 (the server's `:` boundary on 26.0). Carved from 🌿[`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode). Alternative kept on 🌿[`issue_24220_drop_collection_matching_26.0_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24220_drop_collection_matching_26.0_alt_original_scope) - the seven issue rows only, without the direct-drop-only column-definition check and the shared `restrictedCollectionTypes` gate. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented; round 1's modest expansion was taken.</summary>

- Round 1 added two divergences in the touched code: column definitions checked only on direct drops, and empty `collectionTypes` meaning no constraint.
- Round 2: no user-visible bug left that a few more lines would fix. Server `to_dict` reporting `map_over_type`, `from_json` type validation, the async tool-request `dce` path and the editor's deepest-first `_effectiveMapOver` are follow-ups.
- Split options (refactor + fix, by surface, column-definition change alone) were recorded.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers; <code>canAcceptSrc</code> flattened into guard clauses.</summary>

- Two ad-hoc suffix matchers became one helper over the canonical `CollectionTypeDescription`; `FormData.vue` shrinks.
- Left for `dev`: collapsing the two drop gates into one, and moving the helper next to `canMatch`/`canMapOver` (merge-forward risk on a release branch).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Nothing dropped or weakened; refusal rows for dropped elements added.</summary>

- Every element row was an accept; added refusals (`paired` element on `list`, `paired_or_unpaired` element on `paired`), the second red under the old suffix check.
- Red/green verified per commit by swapping in each parent's source.
- E2E deferred: needs a new drop helper that fires `dragenter`.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, confirmed and fixed with a red-to-green test.</summary>

- A dropped element lost its map-over when the form refreshed its options, because the server lists the selected element without `map_over_type`. Confirmed against `/build`; the cached `map_over_type` is now kept.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests and a behavior-free helper extract lead, so fix commits show only semantic changes.</summary>

- The extract commit pulls out `matchCollectionType()` and flattens `canAcceptSrc` at base semantics.
- The column-definition fix is one guard line; the empty `collectionTypes` fix is one computed swapped in at two sites.

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A drop that doesn't fit is refused with an alert on the input (e.g. "mixed list of paired and unpaired dataset collection is not a valid input for paired type dataset collection parameter.") and the value is unchanged.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They drop items on a mounted `FormData` and assert the emitted payload against the server's listing rules; the helper isn't tested directly.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, followed by a behavior-free helper extract.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
