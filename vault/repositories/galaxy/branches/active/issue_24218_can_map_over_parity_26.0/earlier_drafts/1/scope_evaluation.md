# Scope evaluation: issue_24218_can_map_over_parity_26.0

**Recommendation: expand (modestly).** Keep both commits. The `collection_type_source` fix belongs here because without it the `canMapOver` fix regresses `list -> list:paired_or_unpaired` source resolution, and the rewrite matches the server. Then add one commit that puts a `:` boundary on the compound-branch suffix check, `higherRanks.endsWith(higherRanksRequired)`, on both client and server, with tests on both sides. That bug sits on a line this branch rewrites. It also produces the issue's 💥 symptom with no spare outer rank: `paired_or_unpaired` "maps over" a `paired:paired_or_unpaired` input because `"paired_or_unpaired".endsWith("paired")`, and the client's `effectiveMapOver` then returns `""` or garbage types. Python ends up wrong in the same way, so fixing only the client would break parity. The fix is about 2 source lines plus tests. Leave the server `effective_collection_type` ordering bug, the shared declared-type resolver (D1) and the shared parity table for separate dev or follow-up work.

## Possible Decompositions

The branch is about 147 lines added or removed, tests included (about 70 of those are source). Splitting it is John's call.

1. **Baseline tests** (`3e3b6d75e8b`). Pins the `canMapOver` cases that already agree. Can land alone or first.
2. **`canMapOver` parity** (`0e9a619bda4`). The issue fix plus its unit and terminal tests. This is the same commit that `issue_24220_drop_collection_matching_26.0` carries, so whichever lands second drops its copy.
3. **`collection_type_source` resolution** (`d45d2fdb3bc`). Must land with or right after 2. On its own, 2 regresses `list -> list:paired_or_unpaired` source resolution to "any".
4. **(Proposed) colon-boundary fix**, client and server. Depends on 2, because it edits the rewritten compound branch. It could also be its own small 26.0 PR.

Natural splits: {1}, {2+3}, {4}. Or 1+2+3+4 as a single PR, as recommended.

## Scopes considered

### A. As implemented: `canMapOver` parity + `collection_type_source` resolution

Rewrites the client `canMapOver` to use the Python rule order. Rewrites `getCollectionTypeFromInput` to the server order: map-over gives the declared type, a direct match gives the connected type.

| Pros | Cons |
| --- | --- |
| Fixes every row in the issue table. 0 disagreements with the server across 7744 pairs | The colon-boundary false positive in the line it rewrote is left alone, and it causes the same 💥 shape |
| Second commit stops the regression the fix exposes and matches server `tools/actions` order (Codex P1 resolved) | Goes slightly beyond the issue text (second commit) |
| Small diff, net-negative source lines, clean merge-forward story | |

<details>
<summary>Does the collection_type_source commit belong?</summary>

Yes. The old `canMapOver` bug was the only reason `list` connected to a `list:paired_or_unpaired` `collection_type_source` input resolved to anything specific. Its `canMatch` call was reversed (output.canMatch(input)). If commit 2 lands without commit 3, that case degrades to `ANY_COLLECTION_TYPE_DESCRIPTION`, which is a regression this branch would cause. Commit 3 also fixes direct matches that were already wrong on base: `list:paired -> list:paired_or_unpaired` and `paired -> paired_or_unpaired` used to resolve to the broader declared type, and that type then rejected valid downstream connections, as Codex reproduced. It follows the server's `HistoryQuery.can_map_over` / `create_collection` order. Both `can_map_over` and `getCollectionTypeFromInput` consume the same predicate, so this counts as "a related bug in touched code", not scope creep. The thermo-nuclear review showed that for single-type inputs (all of #24218's cases) map-over-first and match-first can't disagree (`both=0`). The one behavior shift is `sample_sheet` connected to a `list` source, which now resolves to `sample_sheet` (was `list`) and matches the server.

</details>

### B. Contract: `canMapOver` only (drop `d45d2fdb3bc`, file the resolution bug)

| Pros | Cons |
| --- | --- |
| Exactly the issue's proposed approach | Brings in a regression: `list -> list:paired_or_unpaired` source output becomes "any" |
| Identical to the commit #24220 carries | Leaves known base bugs in the resolver that the reviewers already fixed and tested |
| | Galaxy reviewers would want the regression handled in the same PR |

Not recommended.

### C. Modest expansion: A + colon-boundary suffix check on both sides (recommended)

In the compound `X:paired_or_unpaired` branch, require `higherRanks == required || higherRanks.endsWith(":" + required)`. The `!=` guard makes the first case false, so in practice this is `endsWith(":" + required)`. Make the change in both `collectionTypeDescription.ts` and `type_description.py` `has_subcollections_of_type`, and add cases to `collectionTypeDescription.test.ts` and `test_type_descriptions.py`.

| Pros | Cons |
| --- | --- |
| Same line this branch rewrites, and the same symptom class as the issue (map-over with no real extra rank, `effectiveMapOver` gives `""`/`"li"`/`"sampl"`) | Touches server Python on a release branch (Galaxy is fairly liberal here, and the change is a 1-line tightening) |
| Keeps client/server parity, because both sides change together | `paired:paired_or_unpaired`-style inputs are rare in real tools, so the user impact is low |
| About 2 source lines plus a few asserts. Fits the issue's "keep in sync" framing | Adds a small conflict surface with #24220 if both carry the `canMapOver` code. Rebase whichever lands second |
| Both reviews (normal follow-up 2, thermo) flagged it. They deferred it only for being "server too", and the process doc says that reason has been overridden before | |

<details>
<summary>Affected pairs</summary>

`higherRanksRequired` ends with `paired` (input `paired:paired_or_unpaired`, `list:paired:paired_or_unpaired`, ...). `higherRanks` ends with `paired_or_unpaired` / `unpaired`, so a bare `endsWith` matches without a `:` boundary. Examples, both true on client and server today: `paired_or_unpaired` over `paired:paired_or_unpaired`, and `list:paired_or_unpaired` over `paired:paired_or_unpaired`. Neither has a real map-over. The rest of the branch (self check, `:other` suffix) is already boundary-safe. Rerun the existing parity harness after the change to confirm it still finds 0 disagreements and that every flip is true -> false.

</details>

### D. Larger expansion: also fix server `effective_collection_type` compound ordering

Normal-review follow-up 1: the peel-off runs before the plain suffix strip, so `list:list:paired_or_unpaired` over `list:paired_or_unpaired` gives `list:list` (should be `list`). Used by `structure.py`.

| Pros | Cons |
| --- | --- |
| A real server bug in the same feature area | A different function and file from anything this branch touches |
| | It's a server-only runtime-structure bug, not client/server map-over parity, so it deserves its own issue and tests |
| | Client `effectiveMapOver` is already correct for these cases, so this branch doesn't need it |

Not recommended here. File it or do it as its own 26.0 branch.

### E. Larger expansion: one rank-sorted declared-type resolver (thermo D1) + `effectiveMapOver` reshape

| Pros | Cons |
| --- | --- |
| Removes the duplicate "which declared type wins" logic in `_effectiveMapOver` and `getCollectionTypeFromInput`, and adds server rank sorting | Only matters for multi-type `collection_types` inputs, which are outside #24218 |
| | It's a refactor, the right server answer for `["list:paired","paired"]` still needs checking, and it belongs on dev |

Not recommended for this branch. It's a dev follow-up.

### F. Larger expansion: shared client/server parity table

| Pros | Cons |
| --- | --- |
| Guards against all future drift | The issue explicitly defers it. It's new test infrastructure on both sides |
| | Clashes with the dev-era `collectionTypeDescription.test.ts` at merge-forward. Better done on dev |

Not recommended here.

### G. Fold into #24220 instead of a separate PR

| Pros | Cons |
| --- | --- |
| #24220 already carries the `canMapOver` commit. One PR means one review | The issue says to land this with or before #24220. A standalone parity fix is easier to review and backport |
| | #24220 doesn't carry the `collection_type_source` fix, so folding would need it moved over as well |

Not recommended. Keep these separate and coordinate rebases.
