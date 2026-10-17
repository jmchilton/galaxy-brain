# Debrief: tool_options_paging_splits_map_over_entry

## Research (verified, how)

- Mid-row break + row-based `has_more`: read `pagination.py` on `origin/dev` and `origin/release_26.1`; re-ran `accumulate_with_filter` extracted from dev, 26.1 and the feature branch with a standalone uv script. Dev/26.1: rows `[B,A]` limit 2 -> A's map-over never served, `has_more` false; `[A,B]` limit 1 -> map-over alone at offset 1. Branch: whole row on one page (limit+1), offset 1 re-sends map-over (true dupe). Extra case `[A,X]` (X = older non-matching collection): `has_more` true, map-over served at offset 1, then lost to the merge. So the never-requested case is "last collection the history listing returns", not "oldest matching".
- Which inputs give two entries: ran dev `HistoryQuery` + `CollectionTypeDescription` with `_classify_hdca`'s `paired_or_unpaired` adjustment over many input/HDCA combos. Single-type inputs never give two entries. Two entries: `list,list:list` + `list:list`; `paired,list:paired` + `list:paired`/`sample_sheet:paired`; `list:list,list:list:list` + `list:list:list`; and the core **Extract dataset** (`list,paired,paired_or_unpaired,record`, no format) + every plain `list`, `record`, `sample_sheet` (`map:single_datasets` via `paired_or_unpaired`). Same logic on 26.1/26.2 (26.1 additionally skips multirun for hidden HDCAs; listing is visible-only anyway).
- Client merges: `ToolForm.vue` dedupes incoming against existing by `id_src`. `WorkflowRunDefaultStep.vue` also `seen.add`s inside the filter, so it drops a pair's second entry even when both arrive on the same later page. Confirmed with a node snippet. Client offset = `meta.offset + limit` (entries).
- #22643: "Paginate /api/tools/{tool_id}/build history options", merged to dev 2026-05-22, milestone 26.1; multi-emit commits 5ae6ee1c350/8df902b83a9 are in it. #23384 (26.1 backport, workflow run-form pagination) added the run-form merge (3662be4b58b). `pagination.py` absent on 26.0.
- Branch fix verified: `562ce4f58fa` finishes the row; shared `mergeDataOptions` uses `itemUniqueKey` with `map_over_type` in both forms. Baseline API test (split at offsets 0/1) passed on base per branch `baseline_refactor.md`; it does not assert `has_more`.
- Dupe search: no existing issue found (light re-check plus writer's search list).

## Corrections vs raw draft / writer's proposal

- Raw draft's "list:list on a list input" example wrong (only map-over there); writer fixed it.
- Writer said the server fix alone suffices; wrong for the workflow run form (within-page dedupe). Raw draft's "both halves needed" was right, for a different reason than it gave. Proposal now says both are required and adds a "server only" alternative.
- Writer's example used a test tool; now leads with Extract dataset.
- "49 newer matching collections" removed: with all-two-entry rows and limit 50, no split happens. Now "an odd number of entries before it".
- Table row "oldest matching collection" -> "last one the history listing returns"; table now has tool form vs workflow run form columns, plus a "both on a later page" row (run form ❌).
- API repro claim trimmed: dropped `has_more: false` (not asserted by any test); function-level repro carries it.

## Leftovers / doubts

- Not reproduced in a live UI or against a running server; API behavior is from the passing baseline test plus code.
- On dev both entries render with the same label (`hid: name`) in the dropdown; picking the second one turns on batch. So users can't tell the pair apart even when both show. Not in scope here, but it softens "the user loses a choice". Maybe worth its own issue or a note in the PR.
- Sibling issue number still `#TBD` (`proposed_tool_form_offpage_collection_selection_lost_on_refresh.md` not filed yet). Fill in, or drop the sentence, before posting.
- Branch's `itemUniqueKey` change also changes `containsDataOption` (selection identity), not only page merges. Worth a look in PR review.

## Recommendation

Post. Real, reproduced regression in 26.1+, affecting a core tool (Extract dataset) and both forms. Fill `#TBD` first.
