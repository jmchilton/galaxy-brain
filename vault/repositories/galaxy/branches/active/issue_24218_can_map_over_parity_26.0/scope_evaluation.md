# Scope evaluation (second, after re-scope): issue_24218_can_map_over_parity_26.0

**Recommendation: keep.** The branch now covers the issue's rows (`0e9a619bda4`), the `collection_type_source` regression the fix would otherwise cause (`d45d2fdb3bc`), and the `:` boundary on the compound `X:paired_or_unpaired` check that the first evaluation asked for (`d29206dcd71`, client and server). That fills the touched predicate (`canMapOver` / `has_subcollections_of_type`): 0 disagreements over 7744 pairs, and every flip is true -> false. The remaining nearby bugs are in the *effective map-over type* functions (`effectiveMapOver` / `effective_collection_type`), which this branch doesn't touch. They're a different predicate with their own test surface. One of them is newly found and realistic (`sample_sheet` truncation, below), and it's worth a separate 26.0 branch. It doesn't clear the second-evaluation bar for parking this one.

## Possible Decompositions

6 files, +120 / -41 (about 70 source lines, the rest tests). Whether to split is John's call.

1. **Baseline tests** (`3e3b6d75e8b`): pins the `canMapOver` cases that already agree. Can land first or alone.
2. **`canMapOver` parity** (`0e9a619bda4`): the issue fix. #24220 carries the same commit, so whichever lands second drops its copy.
3. **`collection_type_source` resolution** (`d45d2fdb3bc`): must land with or right after 2. Without it, 2 regresses `list -> list:paired_or_unpaired` source resolution to "any".
4. **`:` boundary, client + server** (`d29206dcd71`): depends on 2. Could be its own small 26.0 PR. `..._alt_original_scope` is 1-3 without it.

Natural splits: {1}, {2+3}, {4}. Or a single PR with all four.

## Scopes considered

### A. As implemented: parity + source resolution + `:` boundary (recommended)

Client `canMapOver` mirrors the server rule order. `getCollectionTypeFromInput` resolves in server order. Both sides require a rank-aligned suffix in the compound branch.

| Pros | Cons |
| --- | --- |
| Fixes every row in the issue, and the reviews found no `canMapOver`/`canMatch` disagreements left | First server change on the branch. It's one line, a no-op for in-tree tools, and only turns true into false |
| Closes the related bug on the rewritten line (the first evaluation's ask) without leaving parity | Client `effectiveMapOver` can still return `""` for some pairs `canMapOver` accepts (see H) |
| Small diff, net-negative client source. Codex, normal, re-scope and thermo reviews found nothing to act on | |

### B. Contract to `alt_original_scope` (drop the server boundary)

| Pros | Cons |
| --- | --- |
| Client-only on a release branch | Leaves a known `""` map-over for `paired:paired_or_unpaired` inputs on both sides |
| The alt branch already exists if John prefers it | Goes against the first evaluation and the process default |

Not recommended. Keep the alt as an option only.

### C. Contract to `canMapOver` only (drop `d45d2fdb3bc` too)

The branch would cause the `list -> list:paired_or_unpaired` source regression. Not recommended (same reasoning as the first evaluation).

### D. Expand: server `effective_collection_type` compound ordering

The peel-off runs before the plain suffix strip. For example, `list:list:paired_or_unpaired` over `list:paired_or_unpaired` gives `list:list` when it should be `list`. Used by `structure.py`.

| Pros | Cons |
| --- | --- |
| A real server bug, and its pairs are realistic | Different function and test surface from the predicate this branch fixes. The client already gets these right |
| | Needs runtime/structure tests (API level), which is a bigger review ask than this branch |

Follow-up. Best combined with H in its own 26.0 branch, "effective map-over type parity".

### H. Expand: `sample_sheet` truncation in effective type (newly found)

Both client `effectiveMapOver` and server `effective_collection_type` strip a suffix by the *unnormalized* input type's length. So a map-over of a `sample_sheet` input gives a truncated or empty effective type on **both** sides: `list:list` over `sample_sheet` gives `""`, `list:list:list` gives `"l"`, `list:paired:list` gives `"lis"`, and `list:list:paired` over `sample_sheet:paired` gives `""`. The client also returns `""` for `list:list:paired_or_unpaired` over `sample_sheet:paired_or_unpaired`, where the server returns `list:list` (it should be `list`, per D).

| Pros | Cons |
| --- | --- |
| Same `""` 💥 symptom as the issue, and the input shapes are realistic (`sample_sheet` inputs exist in-tree) | The parity harness misses most of these because the two sides agree. It's a correctness bug, not a parity bug |
| Small fix (strip by normalized length, or by rank count) | Untouched functions on both sides. It needs its own red-to-green tests and probably an API-level map-over test over a sample sheet |
| | Expanding would park this READY-quality branch for a separate bug |

Follow-up, high priority. File it with D as a 26.0 branch.

<details>
<summary>Evidence</summary>

From the re-scope parity harness output (`py_new.json`, server at HEAD): `list:list|sample_sheet -> [True, '', ...]`, `list:list:list|sample_sheet -> 'l'`, `list:paired:list|sample_sheet -> 'lis'`, `list:list:paired|sample_sheet:paired -> ''`. Client `cmp_new.txt` lists 89 effective-type disagreements, all of them existing before this branch. 62 of them have an empty client result, but most involve `record` or a non-innermost `paired_or_unpaired`. The realistic ones are the 6 `list:`/`paired:`-higher-rank rows (D) and the `sample_sheet:paired_or_unpaired` rows (H). The `sample_sheet` rows that agree on `""` don't show up as disagreements at all.

</details>

### I. Expand: client guard rejecting an empty/invalid `effectiveMapOver` in `_effectiveMapOver`

The issue's "Why" names the `NULL_COLLECTION_TYPE_DESCRIPTION`-only check. A rank-0 guard would hide every remaining `""` result.

| Pros | Cons |
| --- | --- |
| Defensive, about 1 line | Wrong for H: `list:list` over `sample_sheet` is a valid map-over (it should be `list`), so the guard would reject good connections instead of fixing the type |
| | Client-only, and it diverges from the server |

Not recommended. Fix the effective type instead (H).

### E / F. Shared rank-sorted declared-type resolver (thermo F1/F4), shared client/server parity table (F2)

Multi-type `collection_types` only, or new test infrastructure on both sides. No in-tree tool hits them, and they'd add to the merge-forward conflict. Dev follow-ups, same reasoning as the first evaluation.

### G. Fold into #24220

#24220 doesn't carry `d45d2fdb3bc` or `d29206dcd71`, and the issue says to land this with or before #24220. Keep them separate.

## Follow-ups

1. **26.0 branch: effective map-over type fixes (D + H).** Server `effective_collection_type` compound ordering. `sample_sheet` normalized-length truncation in both `effectiveMapOver` and `effective_collection_type`. Add effective-type cases to the unit tests on both sides.
2. **Dev:** a shared JSON parity table (`canMapOver` / `canMatch` / effective type) consumed by vitest and pytest (F2). It would have caught H only if it pinned expected values, not just client/server agreement.
3. **Dev:** one rank-sorted declared-type resolver on `InputCollectionTerminal`, used by `_effectiveMapOver` and `getCollectionTypeFromInput` (F1).
4. **Dev:** server `create_collection` should check `direct_match` before `can_map_over`, with the client changed in the same commit (F4).
5. **Dev:** drop `CollectionTypeDescription._endsWith` in favor of native `endsWith` (F3).
6. Optional: link `collection_semantics.yml` examples to the new terminal tests.
