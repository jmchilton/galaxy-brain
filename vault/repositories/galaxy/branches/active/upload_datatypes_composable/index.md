# upload_datatypes_composable

Status: `branches_ready_for_final_review`. Base: `dev`. Tip `ff8f3274d02a2a93b003f9a91e58b7bf752f4df5`.

Adds `useUploadDatatypes` and `useUploadDbKeys` composables over store-owned loading/error state, moves every consumer onto them, deletes `DatatypesProvider`/`DbKeyProvider`, and shows datatype and Database/Build load failures instead of empty selectors.

- [Implementation](implementation_debrief.md) ([original](earlier_drafts/1/implementation_debrief.md)) · [Provider removal](provider_removal.md)
- [PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md)
- [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

Stacked on [#23995](../../merged/issue_23977_datatypes_fanout_26.1/index.md): its first three commits are cherry-picks of that PR. Once #23995 merges and `release_26.1` forward-merges to `dev`, rebase onto `dev` to drop them; keep `333b511c6d4` unless the forward-merge already ported those tests.

TICK 2026-10-11: parent #23995 merged to release_26.1 and its record moved to merged/. Its head is not an ancestor of current dev c8708636c2f, so the recorded forward-merge prerequisite for dropping the three parent commits is not met; no restack performed.

## TICK — 2026-10-12

Resolved one small setup conflict by retaining this branch’s `setup(props)` and upstream’s `useConfig()` call (the obsolete argument stays removed). All 21 patches replayed, with only that upstream context change in range-diff. All **91 affected Vitest cases across 12 files pass**. The three parent commits remain because the recorded release-to-dev forward-merge prerequisite has not landed. Rebased onto dev `2671a6d5d63ca13ad554ac68cfd6739d4a881780` and force-pushed with the exact old-head lease to `jmchilton:upload_datatypes_composable` at `c2650e9c8ca381f4c68cb2d829c0ff200b184d23`. Fresh CI is pending. The rebase had a conflict, so any previous SHA approval cannot carry; the branch stays in final review for John’s read-through.

## GOOD_MORNING — 2026-10-13

Current fork head `c2650e9c8ca381f4c68cb2d829c0ff200b184d23` conflicts with `origin/dev` in 10 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Collections/common/CollectionEditView.vue` · `client/src/components/Help/HelpText.test.ts` · `client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.test.js` · `client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue` · `client/src/components/Libraries/LibraryFolder/LibraryFolderDataset/LibraryDataset.test.js` · `client/src/components/Libraries/LibraryFolder/LibraryFolderDataset/LibraryDataset.vue` · `client/src/components/providers/storeProviders.js` · `client/src/stores/datatypeStore.js` · `client/src/stores/datatypeStore.test.ts` · `client/src/stores/helpTermsStore.test.ts`

## Requested rebase — 2026-10-13

Rebased and pushed to latest dev (`63192fd64e4`) at John’s explicit request. [Rebase debrief](rebase_2026-10-13.md). Affected client tests: **80 passed across ten files**. Branch remains ready for final review; conflicts and reconciliation do not carry any previous SHA approval.
