# Scope evaluation

**Recommendation: keep John's re-scope (the whole #23865 backport plus `map_over_type` classification of carried collections) and add one modest expansion: classify the carried HDCA in `DataToolParameter._carry_unresolved_inputs` as well.** The data-param carry has the same bug that `fd4963c2021` fixes for collection params. A `multiple` data param that carries a hidden or other-history non-`list` HDCA builds it with no `subcollection_type`, so a map-over selection comes back as a direct selection. The fix is about 6 lines in 26.1-base code. It passes `trans` into `_carry_unresolved_inputs` and computes `subcollection_type` the same way `hdca_filter` does (`multiple`, non-`list`, `can_map_over`). It leaves the cherry-picked hunks alone, takes one red-to-green `/build` test shaped like `test_build_collection_options_carries_other_history_map_over_selection`, and goes forward on merge-up because dev has the same gap. It is small enough to ship as its own commit or as a sibling PR if John wants this one frozen. Nothing else is worth changing. Contracting back to the alt is still the fallback if the 26.1 behavior change is rejected (hidden collections no longer appear in collection selects). The sibling pin branch stays independent.

## Possible Decompositions

The branch is +170/-100 across 6 non-generated files. These are layouts for John to choose from, not a recommendation.

**Option 1: two PRs (backport, then classification)**
1. PR A: `3311cf2dd1f` + `62058ed38ed`. The pure `-x` backport of #23865 with its upstream tests: a visible-only collection listing, a hidden/deleted/other-history carry, and the dead `match_collections`/`active_visible_dataset_collections` code dropped. It fixes #22734 on 26.1 and is the part that changes stable-branch behavior.
2. PR B: `7bee3166e32`, `fd4963c2021`, `c5f2b4503bd`, `13c7352f165`, plus the recommended data-param commit. The other-history tests, `map_over_type` classification for carried collections (and data params), and the test helper. It depends on A's `_carry_selected_hdca`, so it lands second.

**Option 2: backport on 26.1, classification on dev first**
1. PR A as above, on `release_26.1`.
2. Classification of both carries on dev, where 26.2 and dev also lack it, then backport to 26.1 after A. This keeps the 26.1 PR identical to upstream. It costs a second backport round, and the merge-up conflict in `_carry_selected_hdca` stays either way.

**Option 3: single PR (as implemented)**
All six commits (plus the data-param commit) in one PR. The commits are already ordered so that Option 1 can be split out later without rewriting them.

## Scopes considered

### 1. As implemented: #23865 backport + classified collection carry

Collection selects list visible, non-deleted HDCAs only. A selected hidden, deleted or other-history HDCA is carried as a `keep` entry and classified through `_classify_hdca`, so a map-over-only selection keeps `map_over_type`. Fixes #24219's foreign-collection drop and #22734 on 26.1.

| Pros | Cons |
| --- | --- |
| - What John asked for on 2026-10-19<br>- Byte-close to 26.2, so the merge-up only conflicts in `_carry_selected_hdca`'s signature<br>- Fixes #22734 (hidden collections listed as selectable) on 26.1 as well<br>- Reuses `_classify_hdca`, `_carried_state_label`, `make_hdca_entry`; deletes dead code<br>- Codex, thermo and the test challenge found nothing to act on | - Behavior change on a stable branch: hidden collections leave collection selects. The PR description must say so<br>- Leaves the same `map_over_type` gap in the data-param carry (scope 2)<br>- The `(deleted)` label is unreachable and `_history_query` is built twice. Both are kept for 26.2 parity |

### 2. Modest expansion: also classify the data-param HDCA carry (recommended)

In `DataToolParameter._carry_unresolved_inputs`, give a carried HDCA the same `subcollection_type` that `hdca_filter` would give a listed one (`multiple` and non-`list` → `can_map_over`). Add one `/build` test with a `multiple` data param and an other-history or hidden `list:list`/`list:paired`.

| Pros | Cons |
| --- | --- |
| - Same bug class as `fd4963c2021`, in the sibling carry of the same file. A reviewer is likely to ask why one carry is fixed and not the other<br>- Reachable through the same form-refresh/drag path as the collection-param case<br>- About 6 lines in 26.1-base code; cherry-picked hunks untouched<br>- Dev has the same gap, so it goes forward on merge-up | - Predates the branch; thermo and baseline-refactor reviews deferred it to dev<br>- Adds a small conflict surface in `_carry_unresolved_inputs` on merge-up<br>- One more test in the already-large `test_tools.py` |

<details><summary>Details</summary>

The thermo review deferred this as part of a "shared carried-HDCA helper". That helper would rewrite the cherry-picked `_page_hdca_matches`/`_carry_selected_hdca`, so it does belong on dev. The bug fix itself does not need the helper. Computing `subcollection_type` inline in the carry (or through a tiny `_hdca_subcollection_type(trans, hdca)` used by both `hdca_filter` and the carry) keeps it out of the cherry-picked code. If `can_map_over` returns nothing, carry with no `subcollection_type`, as today.

Reachability matches the collection-param fix. A rerun of a mapped job records a DCE, not the HDCA, so both carries matter mainly when the client sends an HDCA it got from another history (multi-history drag) or a carried entry back on form refresh. If the collection-param classification is worth doing, so is this one.

</details>

### 3. Contract: back to the alt (`_alt_original_scope`, `3147227b128`)

Carry only other-history collection selections, keep 26.1's hidden-inclusive listing, and don't cherry-pick #23865.

| Pros | Cons |
| --- | --- |
| - No change to stable-branch listing behavior<br>- Smaller diff (+24 `basic.py`) | - Overrides John's decided direction<br>- #22734 stays on 26.1<br>- The merge-up into 26.2 conflicts with `ee476eb5a3b` anyway |

Kept as the fallback if reviewers reject the hidden-listing change on 26.1.

### 4. Contract: pure #23865 backport, drop `fd4963c2021`

Ship the two cherry-picks plus the other-history tests, with no classification.

| Pros | Cons |
| --- | --- |
| - Identical to 26.2; cleanest merge-up | - Ships a known bug: a carried `list:paired` picked for map-over on a `paired` input comes back direct, and the client submits `batch=false`<br>- The fix is small, reuses `_classify_hdca`, and has red-to-green tests |

### 5. Expand: shared carried-HDCA helper across both params

One helper (`make_hdca_entry(..., keep=True)` plus classification) shared by `_carry_unresolved_inputs` and `_carry_selected_hdca`, and `history_query` hoisted into `to_dict`.

| Pros | Cons |
| --- | --- |
| - Removes the triplicated entry construction and the duplicated carry condition | - Rewrites cherry-picked code on a stable branch, which widens the merge-up conflict<br>- The bug part is covered by scope 2 without it<br>- Thermo and baseline reviews both placed it on dev; still a dev follow-up |

### 6. Expand: carry both direct and map-over entries for multi-type params

When a carried HDCA matches both ways (e.g. `list,list:list` with a `list:list`), emit both entries.

| Pros | Cons |
| --- | --- |
| - Would keep a map-over choice for that edge case | - The client keeps one `keep` entry per id<br>- The build value drops `batch`/`map_over_type`, so the server can't tell which one was picked (#20657 territory)<br>- 26.2 has the same behavior; declined in earlier reviews |

### 7. Fold in the #24219 pin fix

Merge the sibling `issue_24219_pin_offpage_collections_26.1` into this branch.

| Pros | Cons |
| --- | --- |
| - One PR for the "collection selection dropped on refresh" family | - Out of bounds: the branches stay independent so each can land without waiting on the other<br>- The pin branch already documents how to rebase after this one (`_hdca_listing_visible_only = True`) |
