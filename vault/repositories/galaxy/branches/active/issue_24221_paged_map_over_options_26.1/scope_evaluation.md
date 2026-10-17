# Scope evaluation (round 2, after re-scope)

**Recommendation: keep.** The round-1 expansion is done and makes the fix do something on 26.1: the map-over row arrives on the same page as the direct row, survives page merges, can be selected on its own, and is labelled. What's left near this code either isn't modest or belongs to another branch. Echoing `map_over_type` from `/build` would mean carrying batch/map-over state through tool state, which is a state-model change and part of the #24219 refresh/state family. The drop-path mismatch (review L1) is #24220. `canMapOver` parity is #24218. The remaining duplicate merges (WorkflowRunInputStep/FormSimple, `mergeFetchedOptions`) are dev refactors. The only cheap item, aligning `createValue` dedupe with dev's final per-item rule (review L3), can't be reached on 26.1 (every `data_collection` variant is `multiple: false`). It's worth a one-line PR note, not a scope change. Put the known gaps in the PR description: server-seeded values resolve to the direct row, and the suffix becomes search text.

## Possible Decompositions

The branch is +343/-64 across 11 files. About 237 of those lines are tests. Code is ~106 lines client and ~23 lines server. Five commits:

- **Option 1: one PR**, as is. All five commits are on one theme, and a single review of the identity change is easiest.
- **Option 2: two PRs.**
  - A. Server: `4df74333a48` baseline (Python parts) + `599d0978a83` row-atomic `accumulate_with_filter` + API test. It's a cherry-pick from dev and stands alone.
  - B. Client: baseline vitest parts + `27506823dcb` lookup refactor + `4249dbb60ba` `mergeDataOptions` + `79dccaf6f84` map-over selectable.
  - A and B can land in either order. Splitting the baseline commit by language is mechanical.
- **Option 3: three PRs.** A as above, then B1 = refactor + `mergeDataOptions` (this equals the `_alt_original_scope` client half), then B2 = map-over selectable, stacked on B1. B1 on its own lists a map-over row that can't be selected (the round-1 P1), so B2 should follow quickly.

## Scopes considered

### 1. As implemented (keep, recommended)

Server keeps a collection's direct and map-over entries on one page. Client merges pages by src+id+map_over_type. `itemUniqueKey`/`findDataOption` give the map-over row its own identity, with a fallback to the direct row, and collection inputs label it "(one job per <unit>)".

| Pros | Cons |
| --- | --- |
| - Fixes every row of the #24221 table, and the restored row is now usable<br>- One identity key, one lookup helper; `pageMergeKey` is gone<br>- Helpers line-identical to dev `9eff87c8e21`/`05907884de9`, so merging forward is easy<br>- Reviewed after the re-scope (normal, thermo, codex), with red-checked tests and a baseline API test for direct vs mapped submission | - Server-seeded values (first load, rerun, `replaceParams`) still resolve to the direct row<br>- Suffix text is matched by client search (no `label-area` slot on 26.1)<br>- Touches FormData selection on a release branch (~6 call sites) |

### 2. Expand: `/build` echoes `map_over_type` in `value`

Make the server round-trip the map-over choice so a seeded value selects the map-over row.

| Pros | Cons |
| --- | --- |
| - Closes the last known gap: a map-over pick stays put after a server-seeded rebuild | - Not modest. `expand_meta_parameters` (meta.py) strips the batch wrapper before tool state is populated, and `DataCollectionToolParameter.to_json` serialises model objects with no map-over field. Echoing it means changing the state model or adding a side channel<br>- Rerun of a mapped job seeds per-job state (an element), not the parent HDCA plus a map-over type, so the gain is narrower than it looks<br>- Same family as #24219 (off-page selection lost on refresh), which another session owns; doing it here would overlap with that work<br>- User picks already survive client rebuilds (`value` is client-owned) |

<details><summary>Details</summary>

The re-scope review (N2) traced the client side. `value` is in `CLIENT_OWNED_FIELDS`, so `syncServerAttributes` doesn't overwrite it, and the options watcher re-emits from `currentValue` using the exact-key match. So the gap is limited to values the server seeds. Pairing a server echo with #24219's pinning of off-page collections is the natural home, because both are about a selection surviving the server's view of the state. If John wants it on this branch anyway, it's a Python-side change in `basic.py` that will conflict with #24219's ~150-line `basic.py` diff. Coordinate before taking it.

</details>

### 3. Expand: adopt dev's final `createValue` rule (per item, review L3)

Dedupe submitted values by id+src as dev `68b8d3969e5` does, rather than by full key.

| Pros | Cons |
| --- | --- |
| - 26.1 matches dev's final rule, so a forward merge has nothing to reconcile<br>- One line | - Can't be reached on 26.1 (no multi-select collection variant), so it changes nothing users see<br>- Would need a test that can't exercise a real path<br>- The current rule matches dev `9eff87c8e21`, the commit the rest of this slice tracks |

### 4. Expand: fold in the #24220 drop-path fixes (review L1/L2 remainder)

Make `toDataOption` pick the deepest map-over type so a dropped collection's emitted value matches the server's row.

| Pros | Cons |
| --- | --- |
| - Removes the label/value mismatch on drop for `paired,list:paired` inputs | - Already its own branch (`issue_24220_drop_collection_matching_26.0`) on an older base; it merges forward<br>- `handleIncoming` now pushes the server-listed option (`normalizeOption`), which covers the worst of L1 here<br>- Duplicating it causes merge conflicts in adjacent hunks |

### 5. Expand: shared merge helpers (`mergeFetchedInput`, WorkflowRunInputStep/FormSimple)

Collapse the near-duplicate `mergeFetchedOptions` bodies and history-contents merges.

| Pros | Cons |
| --- | --- |
| - Less duplication in touched components | - No behaviour change on 26.1; these Options API components were already rewritten on dev<br>- History-contents merges never see `map_over_type`<br>- Rejected in both review rounds as a dev refactor |

### 6. Contract: original scope (alt `e4a0f756c63`)

Ship only the server paging fix and the client page merge.

| Pros | Cons |
| --- | --- |
| - Smaller, mostly cherry-pick; no FormData selection changes | - The restored row looks identical to the direct row and can't be picked (verified with a probe vitest), so users gain nothing on 26.1<br>- Round 1 already rejected it; nothing new argues for it |

### 7. Contract: drop the lookup refactor commit (`27506823dcb`)

Squash it into the map-over commit.

| Pros | Cons |
| --- | --- |
| - One fewer commit | - Doesn't shrink the final tree; it's history shape only<br>- Without it the fix diff is harder to review and doesn't follow dev's refactor-then-fix shape. A squash is still possible at PR time if reviewers ask |
