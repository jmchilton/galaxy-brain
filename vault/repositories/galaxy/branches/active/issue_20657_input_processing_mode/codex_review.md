# Codex review debrief

Fixed all three Codex findings: two confirmed bugs and one confirmed heuristic gap. Each fix is a commit with its red-to-green test. No push. Not acted on: the matching id+src merges in `WorkflowRunInputStep`/`WorkflowRunFormSimple` (see below).

Commits (worktree, branch `issue_20657_input_processing_mode`):
- `8f3bf051379` Map dropped collection elements over inputs like collections
- `214fa3bbf6d` Keep map-over options split across option pages
- `83cf8bfdbc6` Judge nesting hint by selected collection type

Tests: vitest on node 22.20.0, covering FormData/, processingMode, collectionTypeDescription, ToolForm and Workflow/Run/: 16 files, 154 tests pass. `vue-tsc --noEmit` reports no errors in the changed files.

## Not acted on

- `WorkflowRunInputStep.vue` and `WorkflowRunFormSimple.vue` still dedupe by `id_src`. Their rows come from history contents, which never include map-over entries, so the bug can't occur there. I left them alone.
- I did not change server paging. A row with two matches can still be split across pages. I only corrected the docstring that claimed it can't be.

<details>
<summary>Findings and verdicts</summary>

### 1. Dropped DCE loses map-over metadata (FormData.vue toDataOption): CONFIRMED, partly pre-existing

- `canAcceptSrc` (`FormData.vue` ~L911) accepts collection elements via `matchCollectionType`. `toDataOption` only applied the match under `isHistoryItem(v) && isHDCA(v)`, so a dropped DCE always emitted `batch:false`.
- The server supports batching over a DCE. `meta.py` `__collection_multirun_parameter` accepts `src` `dce`, and `__expand_collection_parameter` splits `item.child_collection` by `map_over_type`. A DCE value with a map-over type would therefore run as intended.
- Before this branch, `canAcceptSrc` already accepted DCEs using `endsWith` (e.g. a `list:list` DCE on a `list` input) and also submitted them with `batch:false`. The bug predates the branch. The branch's matcher widened acceptance, which makes more cases reachable, such as the `paired_or_unpaired` example.
- Fix: gate the match on the `collectionType` from `getElementAttributes`, which is set for both HDCAs and collection-holding DCEs. The now-unused `isHDCA` import is removed.
- Red-to-green test: `FormData.test.ts` "maps a dropped collection element over the input when its child collection is nested deeper". It drops a DCE with a `list:list` child on a `list` input and expects `batch:true` with `map_over_type: "list"`.

### 2. mergeFetchedOptions dedupes by id+src (ToolForm.vue ~L322): CONFIRMED, pre-existing, exposed by the branch

- `pagination.py` `accumulate_with_filter` resumes by match count, so a row emitting `[direct, map-over]` can be split across pages. I verified this directly: limit 2 over rows `0, 1(direct,map), 2` gives page 1 `[0, 1-direct]` and page 2 `[1-map, 2]`. The function's comment said this "never straddles" a page boundary, which is wrong; I corrected the comment.
- The client merge dropped the later map-over entry because its `id_src` key was already present.
- Fix: new `mergeDataOptions` in `FormData/types.ts`, keyed by `itemUniqueKey`. It is used by `ToolForm.vue` and by `WorkflowRunDefaultStep.vue`, whose tool-step options come from the same server builder and had the same id+src merge.
- Red-to-green test: `ToolForm.test.ts` "keeps a collection's map-over option when it arrives on a later page than its direct option". It emits `load-more` from the FormDisplay stub and asserts both entries are in the input's options.

### 3. canNestToMapOver heuristic (processingMode.ts ~L94): CONFIRMED, rewritten with matchCollectionType

- The old rule was input-based and ignored the selection. Codex's example: input `list,list:list` with `list:list` selected; nesting to `list:list:list` maps over `list:list`, but the hint was suppressed. That example is borderline, because the dropdown already offers the map-over entry for that input.
- A clearer failure: input `list,paired` with a `paired` collection selected. The old rule said `canNest: true`, but nesting cannot split a pair.
- New rule:
  - With a single selection the input accepts directly: suggest nesting only if the selection is list-prefixed and `matchCollectionType("list:"+selected)` maps over.
  - Otherwise, fall back to the accepted types. Suggest nesting if some list type would map over once nested and no accepted type would be matched directly once nested. This generalizes the old "X and list:X" rule.
- All existing assertions pass unchanged, including the case where an unrealistic flat-list selection is used for `["list:paired"]`. That works because a selection the input doesn't accept directly falls back to the input-based rule.
- Red-to-green test: `processingMode.test.ts` "judges nesting by the selected collection's type". It covers the paired selection (red before the fix), the `list:list` selection, and two no-selection cases.

</details>
