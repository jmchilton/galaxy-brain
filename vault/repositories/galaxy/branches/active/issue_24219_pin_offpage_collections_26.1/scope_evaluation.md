# Scope evaluation

**Recommendation: expand (modestly).** Keep the `release_26.1` target. Add one commit that backports the deleted and foreign-history part of 26.2's `_carry_selected_hdca` (#23865) to the 26.1 `data_collection` param. Feed it the unpinned values that `_page_and_pin_hdcas` already returns and the collection call site currently throws away. On 26.1 a rerun or refresh whose selected collection is deleted or in another history is dropped from the build response, so the client quietly selects the newest collection. That is the same silent-swap symptom as #24219, in the same `to_dict`, through the same seam. The branch's own debrief leaves it open, and 26.2 already has the design. It costs about 15 lines of `basic.py` plus a rerun API test. It also makes the forward merge simpler: 26.2 then differs only in visible-only listing, not in having a carry at all. Don't backport #23865's hidden-collection listing change (#22734); that is a 26.2 behavior change. Keep sibling #24221 on its own branch, don't retarget, and don't do a client-side keep.

## Possible Decompositions

The branch has about 160 non-generated changed lines (+159/-62) in two commits. They already split cleanly:

- **A. Refactor** `406e85c34ab`: one shared HDCA page listing (`_hdca_entries`, `_page_hdca_matches` on the base, `_hdca_listing_visible_only`). No behavior change. About +59/-55.
- **B. Fix** `09a7f2012fe`: `_page_and_pin_hdcas`, reorder `DataToolParameter.to_dict`, and two API tests. Fixes #24219. About +103/-10. Depends on A.
- **C. (If expanded) carry** deleted or foreign selected HDCAs in the 26.1 collection param, plus a rerun API test. Depends on B, because it consumes B's return value.

Order: A → B → C. A+B+C is still a small single PR (about 220 lines). A can stand alone as a refactor PR if a reviewer balks at the combined diff.

## Scopes considered

### 1. As implemented (26.1, server pin of off-page visible HDCAs)

A selected HDCA that the listing could return but that sits outside the page window is pinned into `pinned["hdca"]`. The pinned entries are byte-identical to the page entries. This applies to both `data` (batch) and `data_collection` inputs.

| Pros | Cons |
| --- | --- |
| - Closes #24219 exactly as the issue describes it, for both param types<br>- Shared `_hdca_entries` classifier is a good reusable abstraction, and it removes duplicated `_page_hdca_matches`<br>- Reviewed (normal, codex, thermo-nuclear), red-checked, and already split into refactor and fix | - On 26.1 the `data_collection` path still drops a deleted or foreign selected HDCA. Same symptom, same function, and left as an open question in the debrief<br>- `_page_and_pin_hdcas`'s return value is ignored at the collection call site, so the seam is half-used<br>- Forward merge to 26.2 has to add a carry call while it resolves conflicts |

### 2. Expand: backport the deleted/foreign carry for `data_collection` (recommended)

Scope 1, plus a 26.1 `DataCollectionToolParameter._carry_selected_hdca` that takes the unresolved values from `_page_and_pin_hdcas`. It carries each deleted or foreign-history HDCA as a `keep=True` entry with a state prefix (`(deleted) …`, and so on), as 26.2 does.

| Pros | Cons |
| --- | --- |
| - Fixes the remaining "selection silently replaced" case on 26.1 collection inputs (rerun after a delete, or rerun of a job from a copied or other history)<br>- Uses the seam the branch already built and makes `data` and `data_collection` behave the same (the `data` param already carries HDCAs)<br>- Port the code from 26.2, don't invent it: `_carried_state_label` and `make_hdca_entry` already exist on 26.1<br>- Shrinks the forward-merge conflict: 26.2/dev keep their carry, and the only 26.1 difference is the visible-only listing | - Not a regression: 26.0 also dropped these, and #23865 went to dev as an improvement<br>- Adds about 15 lines and one or two API tests<br>- A hidden HDCA that doesn't match on 26.1 would also be carried, if the 26.2 condition is copied verbatim (see details) |

<details><summary>Details</summary>

- Call site on 26.1: `unresolved = self._page_and_pin_hdcas(..., util.listify(other_values.get(self.name)))`, then `for value in unresolved: self._carry_selected_hdca(builder, history, value)`. A list is safe even though `multiple = False`.
- Condition: copy 26.2's `value.deleted or not value.visible or value.history != history`. On 26.1 a hidden, live, in-history HDCA that matches is pinned before it reaches the carry. Only a hidden one that doesn't match is left, and 26.2 carries that one too (as `(hidden)`). So copying verbatim keeps 26.1 and 26.2 identical and leaves no merge decision.
- Include `include_column_definitions=True` the way 26.2 does, so a carried entry for a sample sheet still has its columns.
- Tests: a rerun API test in `test_jobs.py`, modeled on 26.2's `test_job_build_for_rerun_hidden_hdca_carried_into_collection_options`. Cover a deleted HDCA and an HDCA from another history (one test with both is fine). Assert one `keep=True` entry with the state-prefixed name. The test should fail on the current branch head.
- Don't backport the rest of #23865 (visible-only collection listing, removing `visible_only`, deleting `match_collections`). That changes what the 26.1 dropdown lists (#22734), and it goes beyond a selection-loss fix.

</details>

### 3. Fold in sibling #24221 (paging splits direct and map-over entries)

Make `accumulate_with_filter` finish a row before it stops, and merge client pages by `map_over_type`, all in this branch.

| Pros | Cons |
| --- | --- |
| - Same regression origin (#22643), same feature (paged collection options)<br>- This branch pins both entries of a direct+map-over HDCA, which is the same pair #24221 is about | - Already its own branch (`issue_24221_paged_map_over_options_26.1`), with its own scope expansion (client selection identity in `FormData`)<br>- Different code: `pagination.py` and client merges vs `basic.py` pinning. No shared seam<br>- Merging them gives one large client+server PR that is harder to review and backport |

<details><summary>Details</summary>

The two branches meet at one point. This branch can't tell which entry of a pair the user picked, so it pins both. #24221's expanded scope makes the client key options on `map_over_type`, and that resolves the ambiguity on the client side once both entries are present. So the branches complement each other and don't conflict. Land them independently. Server-side value identity (`to_python` dropping `map_over_type`) stays with #20657.

</details>

### 4. Retarget to `release_26.2` or `dev`

Base the fix on 26.2, where the collection listing is visible-only and the carry already exists. Pin, then carry the rest.

| Pros | Cons |
| --- | --- |
| - Simpler code on 26.2: no hidden-listing special case, and the carry already exists<br>- No backport-specific adaptation | - The bug ships in 26.1 (#22643 paging landed there). Policy is the oldest supported branch that has the bug<br>- Small server-only fix, fine for a release branch<br>- Forward-merge notes in `index.md` already work out the 26.2 resolution |

### 5. Client-side keep of the selection (the issue's alternatives)

Have `ToolForm.onUpdate` copy the selected option into the new options or the keep cache, or re-request every loaded page on refresh.

| Pros | Cons |
| --- | --- |
| - Would also keep which entry of a pair (direct or map-over) was picked | - Fixes one client path only. Rerun, reload and the workflow run form still lose the selection<br>- Adds a second keep mechanism alongside `pinned`, which exists for exactly this<br>- Re-requesting pages brings back large payloads and does nothing for a selection found by search<br>- Already rejected in the issue, with reasons |

### 6. Contract: `data_collection` only (or `data` only)

Pin for only one param type.

| Pros | Cons |
| --- | --- |
| - Slightly smaller diff | - The issue's table shows both param types failing. The shared classifier is what makes fixing both cheap<br>- Would undo the refactor that removes the duplicated `_page_hdca_matches` |
