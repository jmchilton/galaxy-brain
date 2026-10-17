# Paged collection options lose a collection's "map over" entry

A collection input can list one collection twice, once directly and once to map over, and option paging or the client's page merge can drop the map-over entry.

This happens on a core tool. **Extract dataset** (`__EXTRACT_DATASET__`) takes `collection_type="list,paired,paired_or_unpaired,record"`, so every plain `list` (and `record`, `sample_sheet`) gets two options: use it directly as a `list`, or map over it (`map_over_type: single_datasets`, via `paired_or_unpaired`). The same goes for any multi-type input such as `list,list:list` with a `list:list`, or `paired,list:paired` with a `list:paired`. Options are paged (50 per page by default) and later pages are merged into the form:

| Where the two entries land | Tool form | Workflow run form |
| --- | --- | --- |
| Both on the first page | ✅ | ✅ |
| Both on a later page ("load more" or search) | ✅ | ❌ dropped by the merge |
| Split across a page, collection is the last one the history listing returns | ❌ never requested (`has_more: false`) | ❌ |
| Split across a page, more collections follow | ❌ dropped by the merge | ❌ |

A split happens whenever an odd number of entries come before the collection on its page, for example a `paired` or `list:paired` (one entry each) among the lists. Nothing tells the user, and loading more doesn't bring the entry back.

<details><summary>Why: the server breaks mid-row, <code>has_more</code> counts rows, and the client merges by <code>id</code>+<code>src</code></summary>

`_classify_hdca` in `basic.py` returns a list of two entries for such a collection, and `accumulate_with_filter` in `lib/galaxy/tools/parameters/pagination.py` stops on the entry that reaches `limit`, even inside a row:

```python
for entry in emitted:
    ...
    matches.append(entry)
    if len(matches) >= limit:
        hit_limit = True
        break
```

The row still counts as consumed, and `has_more = db_offset < pre_filter_total` counts history rows, not entries. When that row is the last one the listing returns, the page reports nothing more and the map-over entry is never sent. The comment above the loop says the opposite: multi-match entries are "kept adjacent so a multi-emitting row never straddles a page boundary in a half-emitted state".

If more rows follow, the next page (`offset` counts entries) starts with the map-over entry. But `mergeFetchedOptions` in `ToolForm.vue` and in `Workflow/Run/WorkflowRunDefaultStep.vue` dedupes by `` `${o.id}_${o.src}` ``, and the map-over entry has the same `id` and `src` as the direct one already listed. The workflow run form version also adds each incoming key to `seen` as it goes, so it drops the second entry of a pair even when both arrive on the same page. The form value carries `map_over_type`, so the two are different choices.

</details>

<details><summary>Reproduction</summary>

`accumulate_with_filter` from `dev` (same on `release_26.1`). Rows are newest first. `A` emits `[direct, map over]`, `B` emits one direct entry. Each call asks for the next offset while `has_more` is true, as the client does:

```
rows [B, A], limit=2
  offset=0 -> [('B', 'direct'), ('A', 'direct')] has_more=False      # A's map-over never served

rows [A, B], limit=1
  offset=0 -> [('A', 'direct')] has_more=True
  offset=1 -> [('A', 'map over')] has_more=True                      # same id+src, dropped by the merge
  offset=2 -> [('B', 'direct')] has_more=False
```

Through the API, `/api/tools/collection_list_or_nested_list_input/build` with one `list:list` in the history and `options_pagination={"f1": {"hdca": {"offset": 0, "limit": 1}}}` returns only the direct entry. The map-over entry comes back at `offset: 1`.

The two client merges, given `existing=[B]` and an incoming page `[X, X with map_over_type]`:

```
ToolForm             -> [B, X, X (map over)]
WorkflowRunDefaultStep -> [B, X]
```

</details>

## Context

Bug found while working on 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode). A regression from 🔀 #22643 (26.1), which added option paging and emitted both entries per collection. 🔀 #23384 added the workflow run form merge. A sibling paging issue (#TBD) covers a selected collection that drops off the form on refresh when it isn't on the loaded page. Affects `release_26.1`, `release_26.2` and `dev`. 26.0 and older don't page options.

## Proposed Approach

Let a page finish the row it is on, so `accumulate_with_filter` returns every entry of the last row even if that goes one past `limit`. Also merge client pages with one shared helper keyed on `src`, `id` and `map_over_type`, so the two entries stay distinct in both forms. Both halves are needed: the server change keeps pairs on one page, and the client change stops the workflow run form from dropping a pair's second entry. Both are on 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode) and can be backported to 26.1.

<details><summary>Approach details</summary>

- Server: drop the inner `break` in `accumulate_with_filter`, so the outer check stops after the whole row, and fix the misleading comment. A page can hold `limit + 1` entries, only for two-entry rows. The next page's `offset` then re-sends the map-over entry, which the merge drops as a true duplicate.
- Client: one shared `mergeDataOptions` helper next to `itemUniqueKey` in `FormData/types.ts`, keyed on `map_over_type` as well, used by both `ToolForm.vue` and `WorkflowRunDefaultStep.vue` instead of two hand-written `id`+`src` merges.
- Tests, red first:
  - Unit, `accumulate_with_filter`: a list-returning filter where `limit` lands mid-row returns the whole row, with the right `has_more`.
  - API, `collection_list_or_nested_list_input` with `limit: 1`: both entries for a `list:list` come back on the first page.
  - vitest: merging a page that holds both entries, or only the map-over entry of an option already listed, keeps both.

</details>

## Alternative Approaches

A client-only fix is not enough: when the split collection is the last row, the server says there is nothing more, so the client never asks. A server-only fix leaves the workflow run form dropping pairs on later pages. Paging by history row instead of by entry would remove the mismatch at its root, but it changes what `offset`, `limit` and `options_meta` mean for every data and collection parameter, for a problem only two-entry rows have. Finishing the row is a few lines and leaves the paging contract as it is.

<details><summary>Alternatives In Detail</summary>

### Alternative: Fix only the client merge

<details><summary>Description</summary>

#### Details

Key both merges on `map_over_type` as well, and leave the server alone.

#### Why the proposed approach is preferred

It fixes the second and fourth rows of the table but not the third: with `has_more: false`, the map-over entry for the last collection is never requested.

</details>

### Alternative: Fix only the server

<details><summary>Description</summary>

#### Details

Finish the row on the server and leave both merges as they are. The re-sent map-over entry on the next page is then a true duplicate.

#### Why the proposed approach is preferred

The workflow run form merge still drops the second entry of any pair that arrives on a later page, split or not.

</details>

### Alternative: Page by history row instead of by entry

<details><summary>Description</summary>

#### Details

Make `offset` and `limit` count history rows, so a page always holds whole collections and a resumed offset can never land mid-row.

#### Why the proposed approach is preferred

`offset` and `limit` count entries today, both in `accumulate_with_filter`'s `post_filter_offset` and in the client's `offset: meta.offset + limit`. Switching would touch every paged data and collection parameter, the tool form, and the workflow run form, which is too much for a backport. Pages that may go one entry past `limit` get the same result here.

</details>

</details>
