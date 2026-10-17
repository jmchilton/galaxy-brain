# Scope evaluation

**Recommendation: expand (modestly).** Add a third commit that makes a collection's map-over option selectable on its own and tells it apart from the direct option. That means `itemUniqueKey` includes `map_over_type`, value matching prefers an entry mapped over the same way and falls back to the same item, and the label gets a short map-over marker. As implemented, the branch's only user-visible effect on 26.1 is that a second row appears, labelled exactly like the first, and that row can't be selected. Picking it snaps back to the direct entry (required input) or clears the selection (optional input). So the restored entry does nothing. Both bugs come from the same regression (#22643 started listing two entries per collection), sit in the same helper file (`FormData/types.ts`), and show the same symptom: the dropdown can't map a collection over. Take only the selection-identity part of dev's `9eff87c8e21`/`68b8d3969e5`. Leave out the "one job per …" badge and processing hint (part of 20657), the drop/map-over picker (#24220), and the `mergeFetchedInput`/WorkflowRunInputStep refactors (dev). Once `itemUniqueKey` is unified, the private `pageMergeKey` goes away (thermo T3).

## Possible Decompositions

The branch is about 147 changed lines (+120/-27). It splits cleanly:

- **A. Server, row-atomic paging.** `2203d0d3d95` baseline tests + `7462b38acbf` `accumulate_with_filter` fix and API test. Stands alone: it fixes the two "never requested / split" rows of the issue table even with the old client merge, as long as both entries land on one page.
- **B. Client page merge.** `e4a0f756c63` `mergeDataOptions` + `types.test.ts`. Independent of A, since it fixes the "later page, workflow run form" row by itself. A and B together fix all four rows.
- **C. (If expanded) client selection identity.** `itemUniqueKey` with `map_over_type`, a small `findDataOption` (exact key, then same item), the FormData.vue call sites, a label marker, and FormData.test.ts cases. Stacks on B, because it replaces `pageMergeKey` with `itemUniqueKey`.

Order is A → B → C, or A ∥ B with C on B. A single PR also works: A+B+C together is still under about 350 lines.

## Scopes considered

### 1. As implemented (server row-atomic paging + client page merge)

The server never splits a collection's direct and map-over entries across pages. Both form merges keep entries that differ only in `map_over_type`.

| Pros | Cons |
| --- | --- |
| - Minimal, clean backport. Server is a cherry-pick; the client helper removes two hand-rolled merges<br>- Fully closes #24221 as written ("entry dropped")<br>- Reviewed 3x (normal, codex, thermo-nuclear); API test red-checked | - The restored entry can't be selected and looks identical to the direct one, so on 26.1 the user gains nothing (codex P1)<br>- It widens an existing UX bug from page one to every page<br>- Leaves two identity keys (`itemUniqueKey` vs `pageMergeKey`) |

### 2. Expand: selection identity for map-over options (recommended)

Scope 1, plus the selection-identity slice of dev's 20657 commits, hand-ported to the 26.1 Options-API forms. Identical options become distinct, and map-over options get a label marker.

| Pros | Cons |
| --- | --- |
| - Makes the fix actually work: users can pick "map over" from the dropdown on core tools like Extract dataset<br>- Same regression origin (#22643), same file, same symptom; reviewers would expect it fixed together<br>- Unifies onto one identity key; deletes `pageMergeKey`<br>- Fixes the `option.label:String(option.value)` render key collision for the identical rows<br>- Dev has already worked out the design and tests (fallback to the direct entry for values without `map_over_type`) | - Touches FormData selection on a release branch: ~6 call sites (`currentValue`, keep-option replace, `createValue` dedup, `handleIncoming`, `normalizeOption`, `matchedValues`) plus `FormSelect` keying<br>- Can't cherry-pick: dev's version depends on `findDataOption`/`isSameItem` (`05907884de9`), `collectionTypeLabel`, and a FormSelect `label-area` slot, none of which are on 26.1<br>- Needs its own vitest coverage (FormData.test.ts mounting cases)<br>- Adds about 150-200 lines |

<details><summary>Details</summary>

What to port, by function in 26.1 `FormData.vue`:
- `currentValue` getter (L174): match by `itemUniqueKey`, then fall back to id+src. Values that come back without `map_over_type` still resolve to the direct entry.
- keep-option replace (L263): match by key instead of `id` only. Today a keep-option can overwrite the wrong one of the pair.
- `createValue` dedup (L410): by key. Otherwise a multi-select that holds both entries of one HDCA collapses to one.
- `handleIncoming` (L523), `normalizeOption` (L616), `matchedValues` (L1045): use the shared lookup.
- Label: the simplest 26.1 form is a suffix in the `formattedOptions` label string, e.g. `(map over)`, or `(one job per <type>)` built from `map_over_type`. Dev deliberately kept labels unchanged for search and used a slot. 26.1 has no slot, so a text suffix is the release-branch shape. The suffix does change what search matches.

Leave out: the processing hint and badge component, the drop path (`toDataOption`/`canAcceptSrc`, which is #24220 on a separate 26.0 branch), and the deepest-type drop map-over in `68b8d3969e5`.

Conflict check: the sibling #24219 branch (`issue_24219_pin_offpage_collections_26.1`) only changes server code (`basic.py`, `test_tools.py`), so it doesn't collide with C. #24220 is on 26.0 and touches FormData drop functions, not the selection paths. Merge-forward from 26.0 should be clean apart from nearby context.

Open point: dev's own comment says server-provided values carry no map-over type, so after a form rebuild a map-over selection resolves back to the direct entry. Check whether the 26.1 build response round-trips `map_over_type` in `value`. If it doesn't, the selection holds until the next refresh and then snaps back. That is still far better than never being selectable, but the PR should say so. The persistence part could go with #24219's refresh work.

</details>

### 3. File the P1 as its own issue / 26.1 PR

Keep this branch as implemented and track the selection-identity bug separately.

| Pros | Cons |
| --- | --- |
| - Keeps #24221 a tight, low-risk backport that's easy to review<br>- The selection bug exists on page one without paging, so it is arguably a separate bug | - Ships a fix with no user-visible effect until the second PR lands<br>- Both PRs edit `FormData/types.ts` identity; the second immediately deletes `pageMergeKey`<br>- Process history: John has repeatedly overridden "outside the original issue" as a reason to stay narrow |

### 4. PR-description note only (known 26.1 limitation)

Ship as implemented, mention P1 in the PR, and rely on dev/26.2 picking up 20657.

| Pros | Cons |
| --- | --- |
| - No extra work or release-branch risk | - The 26.1 bug never gets fixed unless 20657 is backported, which it won't be (it's a feature)<br>- The PR would openly say its restored option doesn't work, which invites the reviewer to ask for scope 2 anyway |

### 5. Contract: server only

Ship only A (baseline + `accumulate_with_filter`). Drop the client merge.

| Pros | Cons |
| --- | --- |
| - Cherry-pick only, smallest diff | - Leaves the "later page" rows broken (WorkflowRunDefaultStep drops same-page pairs; ToolForm drops after mid-row offsets)<br>- No reason to contract; the client half is small and reviewed |

### 6. Expand: review refactors (T2 `mergeFetchedInput`, N1 WorkflowRunInputStep/FormSimple merges)

Collapse the remaining duplicated `mergeFetchedOptions` bodies and history-contents merges onto shared helpers.

| Pros | Cons |
| --- | --- |
| - Removes duplication in touched components | - Pure refactor of Options-API components that dev has already rewritten; no behaviour change on 26.1<br>- History-contents merges never see `map_over_type`<br>- Belongs on dev, not here |
