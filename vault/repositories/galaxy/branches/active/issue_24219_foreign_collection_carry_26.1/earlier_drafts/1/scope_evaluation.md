# Scope evaluation

**Recommendation: keep scope as implemented.** The branch (`3147227b128`, +24 `basic.py`, +68 tests) backports the one part of 26.2's `_carry_selected_hdca` (`ee476eb5a3b`) that is reachable on 26.1 without the #24219 pin seam: a `data_collection` selection from another history is carried as a `keep=True` option (with `map_over_type` when it only maps over) instead of being silently dropped on rerun/refresh. The usual modest expansions don't apply here. Deleted HDCAs never reach `to_dict` (`from_json` raises). The hidden case can only be handled without duplicating on-page entries by deduping against the page, which is exactly the #24219 pin seam, and this branch must stay independent of it. Multi-entry (direct + map-over) carry is blocked by the client's one-`keep`-per-id contract. The remaining gap, 26.2's own carry lacking `map_over_type`, belongs to the forward merge (already noted in `index.md` and `thermo_nuclear_review.md`), not to this 26.1 PR.

Under 100 non-generated lines, so no decomposition section.

## Scopes considered

### 1. As implemented: carry other-history HDCAs, keep `map_over_type` (recommended)

`DataCollectionToolParameter._carry_selected_hdca` appends a selected HDCA whose `history != trans.history` as `(not in current history) <name>`, `keep=True`, with column definitions, plus `map_over_type` from `_classify_hdca` when there is no direct match. Tested via `/build` and job rerun.

| Pros | Cons |
| --- | --- |
| - Fixes the real 26.1 symptom (rerun of a job whose collection input came from another history silently swaps the selection)<br>- Makes `data_collection` match `data`, which already carries foreign HDCAs (`_carry_unresolved_inputs`)<br>- Reuses `_classify_hdca`, `_carried_state_label`, `make_hdca_entry`; no new abstractions<br>- Independent of #24219; supersedes the pin branch's `_alt_foreign_carry`<br>- Fixes a `map_over_type` gap 26.2 still has | - Narrower condition than 26.2 (`deleted or not visible or other history`), so the forward merge must resolve a conflict and keep both 26.2's wider condition and this branch's classification<br>- Not a regression fix; 26.0 dropped these too |

### 2. Expand: copy 26.2's condition verbatim (also hidden, deleted)

Carry when `value.deleted or not value.visible or value.history != history`.

| Pros | Cons |
| --- | --- |
| - Byte-closer to 26.2; smaller forward-merge conflict | - Deleted branch is dead code on 26.1 (and 26.2): `from_json` raises for a deleted HDCA before `to_dict`<br>- On 26.1 the collection listing includes hidden HDCAs as direct matches, so carrying hidden duplicates on-page entries<br>- Avoiding the duplicate needs a page dedupe, which is the #24219 `_page_and_pin_hdcas` seam and would couple the branches |

<details><summary>Details</summary>

The only hidden case 26.1 actually drops on its own is a hidden HDCA that matches only by map-over (`_classify_hdca` demotes hidden HDCAs to direct-only), plus hidden HDCAs that sit off-page, which is #24219 itself. The first is hard to reach on 26.1 because the form never offered a hidden HDCA for map-over in the first place. Handling either one properly means knowing what the page already listed, and that belongs with the pin branch or with 26.2's visible-only listing (#22734). That is not this backport.

</details>

### 3. Expand: carry both direct and map-over entries for multi-type params

When an other-history HDCA matches both directly and by map-over (e.g. `list,list:list` with a `list:list`), emit both entries.

| Pros | Cons |
| --- | --- |
| - Would keep the user's map-over choice for that edge case | - The client keeps one `keep` entry per id, so a second entry is either dropped or shadows the first<br>- The build `value` drops `batch`/`map_over_type`, so the server can't tell which one was picked (#20657 territory)<br>- Codex review already declined this for these reasons |

### 4. Expand: shared carried-entry helper / hoist `history_query`

Factor `make_hdca_entry(..., keep=True)` into a helper shared with `DataToolParameter._carry_unresolved_inputs`, and compute `history_query` once in `to_dict`.

| Pros | Cons |
| --- | --- |
| - Removes three duplicated lines and one redundant `HistoryQuery` build | - Signature churn on a stable branch and more forward-merge friction against 26.2's `_carry_selected_hdca`<br>- Better done on dev, where the same pair exists. The thermo-nuclear review and the baseline refactor eval both declined it |

### 5. Fold into the #24219 pin branch

Land this as the pin branch's expansion commit (its alt `_alt_foreign_carry`).

| Pros | Cons |
| --- | --- |
| - One PR for the "selection silently dropped" family on 26.1 collection inputs | - Explicitly out of bounds: the carry is being kept independent so it can land without waiting on the pin fix's open decision<br>- The pin branch's alt lacks `map_over_type` handling and its later test strengthening |

### 6. Contract: drop the `map_over_type` commits (pure narrowed backport)

Ship only `1991e542a04` + tests, matching 26.2's carry (no classification).

| Pros | Cons |
| --- | --- |
| - Matches 26.2 exactly; simpler forward merge | - Ships a known bug: a foreign `list:paired` picked for map-over on a `paired` input comes back as a direct selection, and the client then submits `batch=false`<br>- The fix is ~5 lines that reuse `_classify_hdca` and are covered by a red-to-green test |

### 7. Retarget to `release_26.2` / dev

Fix only 26.2's `map_over_type` gap, where the carry already exists.

| Pros | Cons |
| --- | --- |
| - Smaller change; no backport adaptation | - The foreign-collection drop ships in 26.1, and policy is the oldest supported branch that has the bug<br>- 26.2's `map_over_type` gap is picked up by the forward merge of this branch anyway |
