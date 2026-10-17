# Normal review 1 (raw) - issue_24220_drop_collection_matching_26.0

Reviewed `git diff origin/release_26.0...HEAD` (4 commits: baseline, #24218 canMapOver, matchCollectionType, dce map-over) against REVIEW_FOCUS.md plus the domain points in the brief. Client vitest `FormData/` + `Workflow/Editor/modules/`: 6 files, 127/127 pass. API test not run (per brief).

## Verdict

Good to go after resolving the #24218 duplication. No must-fix correctness bugs found; the helper agrees with the 26.0 server on every combination I traced (table below). Issues are about merge mechanics, sibling-path consistency, and test polish.

## Server parity trace

Server path: `DataCollectionToolParameter.to_dict` (basic.py ~L2723-2765): direct listing via `HistoryQuery.direct_match` -> `input.can_match_type(item)`; map-over via `HistoryQuery.can_map_over` -> first of input types sorted by `dimension` desc (stable) where `item.has_subcollections_of_type(input)`; then the `paired_or_unpaired` -> `paired`/`single_datasets` adjustment on the raw hdca type.

Client `collectionMatch.ts`: `input.canMatch(item)` (input is receiver, same as server) -> sort by `rank` desc (`rank` = `dimension - 1`, `Array.sort` stable, so declared-order ties match Python `sorted`) -> `item.canMapOver(input)` -> identical adjustment, also on the raw item type and the raw input type.

`canMapOver` (after commit 2) is a line-for-line port of `has_subcollections_of_type` (equality -> `:`-suffix -> `paired_or_unpaired` != `paired` -> compound `:paired_or_unpaired` higher-ranks-with-`!=`), minus the server-only `single_datasets` branch. `canMatch` is a port of `can_match_type`, both normalize `sample_sheet` symmetrically on 26.0.

| Input | Dropped | Client (branch) | Server 26.0 |
| --- | --- | --- | --- |
| `list,paired` | `list:paired` | map `paired` | map `paired` |
| `paired_or_unpaired,list` (tie) | `list:list` | map `single_datasets` | same (stable sort) |
| `list:paired_or_unpaired` | `list:list:paired` | map `list:paired_or_unpaired` | same |
| `paired_or_unpaired` | `list:paired_or_unpaired` | map `paired_or_unpaired` | same |
| `paired_or_unpaired` | `list:record` | map `single_datasets` | same |
| `record` | `list:record` | map `record` | same |
| `sample_sheet` | `list` | direct, then column-def check | direct, filtered by column defs |
| `list:paired` | `sample_sheet:paired` | direct | direct |
| `sample_sheet` | `list:list` | map `sample_sheet`, then column-def check on item | map `sample_sheet`, **no** column-def filter in `match_multirun_collections` |
| `paired` | `list:paired_or_unpaired` | refused | not listed |
| no `collection_type` (null) | any | accepted, no map-over | listed (`direct_match` -> True) |

Only remaining divergence: column-definition check on map-over drops onto a `sample_sheet` input with `column_definitions`. Pre-existing (old `endsWith` branch did the same check); the client is stricter than the dropdown. Not this issue's scope - worth a line in the PR or a follow-up.

`any`: `ANY_COLLECTION_TYPE_DESCRIPTION` is a workflow-editor-only concept; tool form inputs without `collection_type` send `collection_types: null`, which both `canAcceptSrc` (`!props.collectionTypes`) and `toDataOption` (`?.length > 0`) short-circuit. OK.

## dce change in `toDataOption`

Safe. `getElementAttributes` only sets `collectionType` for an hdca or a dce whose object is a collection; dataset elements leave it undefined, so they skip the block. `data` inputs never get `collection_types` (only `DataCollectionToolParameter.to_dict` emits it, basic.py L2698), so the prop is the default `[]` and the block is skipped - the `data`-side dce map-over from #19900 is untouched. Callers: `handleIncoming` (already guarded by `canAcceptSrc`, which uses the same helper, so the new `null` return cannot fire there for a collection) and `onDragEnter` (`containsDataOption` handles `null`). `getSourceType` maps a dce without `is_dataset` to `hdca`, so variant selection is unchanged.

## canMapOver vs `effectiveMapOver` / terminals

Behavior change is only in the old `rank <= other.rank` branch: `list`/`paired`/`paired:paired` over `list:paired_or_unpaired` were wrongly true, now false (server false). `effectiveMapOver` for the remaining true cases is unchanged and agrees with `effective_collection_type`. terminals.ts callers (L603, L656, L840) only become stricter in those cases. Workflow Editor modules suite (terminals.test.ts 79 tests) passes.

## Findings

### should-fix

1. **#24218 duplicated with divergent tests -> guaranteed add/add conflict.** `client/src/components/Workflow/Editor/modules/collectionTypeDescription.test.ts` is a new file on both this branch and `issue_24218_can_map_over_parity_26.0`; the `collectionTypeDescription.ts` change is byte-identical, but the 24218 branch's test file is richer (adds plain `paired_or_unpaired` rows, self-map, `list:list` on `list:list:paired_or_unpaired`) and it also carries a terminals.ts `collection_type_source` fix + terminals tests. Suggest: rebase this branch on top of the 24218 branch (stack it) and drop commit `4ce2bca0f52` plus the baseline's copy of that test file, rather than carrying a second version. If both stay independent, whichever merges second hits a conflict in a file that only differs in tests.

2. **Merge-forward to dev will conflict in canMapOver and the test file.** dev renamed `canMatch` -> `accepts` (asymmetric: `sample_sheet` input does not accept `list`) and added a `sample_sheet` asymmetry guard at the top of `canMapOver`; dev also already has `collectionTypeDescription.test.ts`. The `collectionMatch.ts` helper must switch to `accepts` on merge-forward, and the 26.0 table row `sample_sheet` on `list` stays valid, but any symmetric `sample_sheet` behavior would change on dev. Worth recording in the PR description so whoever merges forward resolves to dev's `accepts` + sample_sheet guard rather than this branch's version.

3. **Sibling path: workflow editor `_effectiveMapOver` still takes declared order, not deepest first** (`client/src/components/Workflow/Editor/modules/terminals.ts` ~L596-610). Server `HistoryQuery` sorts deepest first for both tool form and workflow runtime. Pre-existing and out of this issue's scope, but the deepest-first rule now lives in `collectionMatch.ts` under `Form/Elements/FormData/`, where the editor can't naturally reuse it. Consider moving `matchCollectionType` (or at least a `sortDeepestFirst`/"pick map-over input" helper) into `Workflow/Editor/modules/collectionTypeDescription.ts` next to `canMatch`/`canMapOver`, so the editor fix is a one-liner later. At minimum note it as a follow-up.

### nit

4. `collectionTypeDescription.test.ts:10` comment references `test_compound_paired_or_unpaired_can_map_over in test_type_descriptions.py`, which only exists on dev; on 26.0 the counterpart is `test_compound_paired_or_unpaired_has_subcollections`. Fix the name or drop the comment (moot if finding 1 is taken - the 24218 version drops it).
5. `collectionMatch.ts:4` exports `SINGLE_DATASETS` but nothing imports it. Un-export or have the test use it.
6. `FormData.vue:465` comment "collections and collection elements holding a collection are both matched like the server" restates the code; drop or shorten.
7. `collectionTypeDescription.test.ts` uses multi-`expect` `it` blocks while the FormData tests are `it.each` tables. A `[item, input, expected]` table would match the rest of the branch and the server's test style. Low value if finding 1 replaces the file.
8. Optional extra rows (not in the issue table, cheap): a `sample_sheet:paired` HDCA on `paired` (normalization through `canMapOver`), and a dce holding a `list` on `paired_or_unpaired` (adjustment path for elements). Current rows cover every row of the issue table.
9. Pre-existing divergence noted above: column-definition check applied to map-over drops onto a `sample_sheet` input; server's multirun listing doesn't filter. Out of scope; mention in PR or follow-up.

## Checklist (REVIEW_FOCUS)

- Reuse: builds on existing `CollectionTypeDescription` as the issue proposed. Good. See finding 3 on placement.
- New abstraction: `matchCollectionType` replaces two divergent inline checks; real consolidation, not accretion.
- Tests: red-first rows for every issue-table row; baseline commit pins pre-existing behavior and passes on base (per debrief); no assertions weakened. API test `test_can_map_over_dce_on_collection_param` is the `data_collection` analog of the existing `test_can_map_over_dce_on_non_multiple_data_param` - not redundant, pins the server behavior the dce commit relies on.
- Unit vs integration: FormData tests mount the component and drive real drag events - already integration-ish. Fine.
- Trivial tests: none.
- Python imports: no new imports in test_tools.py.
- Typing: helper takes `string[]` rather than `CollectionType[]` to avoid a cast at the dce site; acceptable. Return type `{ mapOverType: string | null } | null` is clear.
- Security: nothing found.
