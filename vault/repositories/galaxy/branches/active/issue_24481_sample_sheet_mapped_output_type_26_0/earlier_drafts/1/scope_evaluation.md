Run via Claude Opus 5.5 at high effort.

# Scope evaluation: issue_24481_sample_sheet_mapped_output_type_26_0

**Recommendation: modest expansion (Scope B).** Generalize the demotion from "a leading `sample_sheet`" to "any `sample_sheet` rank that makes the composed type invalid". `map_over_collection_type` (and its client mirror `append`) should never return a type that fails `COLLECTION_TYPE_REGEX`. `Tree.multiply` should also drop column metadata from any inner tree whose level was demoted. Today the branch's own new code still produces `list:sample_sheet` for `sample_sheet x sample_sheet` and leaves `list x sample_sheet` as `list:sample_sheet`, with inner columns kept. That is the same bug class in the same function the branch rewrites, and the fix costs roughly 10-20 lines plus table rows in the existing tests. Keep #24226 out: it is a different function (`effective_collection_type`, which decides job layout, not output typing), is server-only and about compound `paired_or_unpaired`, and has its own queued plan. John tabled its sample_sheet half on 2026-10-17. Don't extend sample sheet nesting (`sample_sheet:list` as a valid type) on 26.0, and don't backport #22565's map-over guard here.

## Possible Decompositions

The branch is 214 insertions over 10 files. About 30 lines are library/client code; the rest are tests and a populator extension. It is small enough to land as one PR. Possible splits, in landing order:

1. **Baseline tests, then fix (the process default).** PR 1 is the three "Baseline tests" commits (`52bd957be70`, `b9be6681bfb`, `175dae42abf`): the `with_sample_sheet` populator extension, `test_map_paired_output_over_sample_sheet`, and the valid-composition and column-preservation cases. PR 2 is the fix commits (`1678b7a7ed5`, `bc2552c1950`) with the regression cases.
2. **Runtime vs editor.** PR 1 is the runtime fix: `map_over_collection_type`, `Tree.multiply` column handling, the structure/type-description unit tests, and the API tests. PR 2 is the editor consistency fixes: client `CollectionTypeDescription.append` plus vitest, and `WorkflowContentsManager._resolve_collection_type` plus the `test_modules.py` cases. PR 2 depends on PR 1 for `map_over_collection_type`.
3. **Option 1 combined with Option 2.** Baseline tests, then the runtime fix, then the editor fixes.

## Scopes considered

### A. As implemented: demote a leading sample_sheet

When composing a mapped output type, a leading `sample_sheet` that would be followed by anything other than a single `paired`, `record` or `paired_or_unpaired` becomes `list`, and its columns are dropped. This applies in `map_over_collection_type`, `Tree.multiply`, the subworkflow output type in `_resolve_collection_type`, and client `append`.

| Pros | Cons |
| --- | --- |
| - Fixes the issue's exact cases (`sample_sheet:list`, `sample_sheet:list:paired`) end to end, with an API regression test.<br>- Server runtime, subworkflow editor dict and client agree.<br>- Small, release-appropriate. It matches the issue_24303 normalize-to-list precedent. | - Unlinked cross products (`sample_sheet x sample_sheet`, `list x sample_sheet`) still produce invalid `list:sample_sheet`, and the inner trees keep their columns. The first comes straight out of the new code.<br>- The comment and helper name read like a general "make it valid" rule, but the rule only handles position 0. A reviewer may well point this out.<br>- Column metadata is dropped silently (a design choice, not a scope gap). |

### B. Recommended: make composition always produce a valid type

Same approach, generalized. If the composed type fails the regex and contains `sample_sheet` anywhere, normalize the offending ranks to `list`. In practice that means every non-leading `sample_sheet`, plus the leading one when it isn't followed by a single permitted suffix. `Tree.multiply` drops `columns_metadata`/`column_definitions` on any child tree whose level is demoted. The same rule goes into client `append`. Add the cross-product rows to the existing composition table and one structure/precreate case.

| Pros | Cons |
| --- | --- |
| - Closes the remaining invalid outputs in the function the branch already rewrites. "Composition never yields an invalid type" is easy to state and to test with a table.<br>- Removes the branch's own `sample_sheet x sample_sheet -> list:sample_sheet` result. It also covers a tool output of type `sample_sheet` mapped over a list, should one appear.<br>- Cheap: same files, same tests, same reviewer context. | - The non-leading cases are only reachable through unlinked (cross-product) batch inputs (`meta.py` `linked=False`). No tool in-tree declares a fixed `sample_sheet` output. Real-world impact is low.<br>- Inner-tree column stripping touches `Tree.multiply`/`clone` recursion, which is a bit more surface than the leading case.<br>- A slightly larger merge-forward overlap with the issue_24303 work in `type_description.py`. |

<details>
<summary>Why B over A</summary>

The scope-evaluation guidance favors fixing related bugs in touched code together, and favors the general rule over the specific case. Review 1 called the cross-product gap pre-existing and recommended only documenting it for a 26.0 target. Two facts weaken that. First, `sample_sheet x sample_sheet` used to produce `sample_sheet:sample_sheet` and now produces `list:sample_sheet` through the new demotion code, so the branch rewrote that output and still left it invalid. Second, the general rule needs no new mechanism: apply `_normalize_collection_type`-style replacement to every rank that breaks the regex, not just the first. A reviewer reading "sample_sheet can only be followed by ..." is likely to ask why `list:sample_sheet` is still produced.

Suggested shape (not prescriptive): split the composed type on `:`, replace `sample_sheet` with `list` at every index > 0, then apply the existing leading-rank check. In `Tree.multiply`, after building the children, any child `Tree` whose type no longer starts with `sample_sheet` (now an inner level) gets its columns cleared. `precreate_dataset_collection` reads only the tree's `columns_metadata`/`column_definitions`, so clearing them is enough.
</details>

### C. Contraction: runtime only

Drop the client `append` mirror and the `_resolve_collection_type` change, and fix only `map_over_collection_type`/`Tree.multiply`.

| Pros | Cons |
| --- | --- |
| - Smaller diff, no client change. | - The editor would keep showing `sample_sheet:list` for the subworkflow output and for tool outputs, while the runtime makes `list:list`. The editor would then accept connections into `sample_sheet` inputs that the runtime collection can't satisfy. That reintroduces the editor/runtime mismatch Review 1 flagged as should-fix.<br>- The client change is 6 lines. |

### D. Alternative design: make `sample_sheet:list` (etc.) a valid type and keep the columns

Extend `COLLECTION_TYPE_REGEX` and the sample sheet rank plugin so a sample sheet can wrap arbitrary nested collections, preserving the per-sample columns on the outer level.

| Pros | Cons |
| --- | --- |
| - No metadata loss. The issue's preparation debrief noted that columns arguably belong to the outer elements and could carry through. | - A feature, not a release fix: regex, client validation, the rank plugin, sample sheet workbook/conversion code, and the UI all assume the current set of suffixes.<br>- Belongs on `dev` with design discussion. It contradicts the issue_24303 normalize-to-list precedent.<br>- The PR text should mention this as the alternative upstream might prefer; that's all it needs here. |

### E. Fold in #24226 (effective map-over type for compound `paired_or_unpaired`)

Also fix `effective_collection_type`, which under-strips one rank when the mapped type ends in `:` plus the full `X:paired_or_unpaired` input type (server only; wrong job count).

| Pros | Cons |
| --- | --- |
| - Same file (`type_description.py`), same base (`release_26.0`), same "collection type algebra" reviewer.<br>- The queued fix is small, and a trial copy already passed the 86 dataset_collections unit tests. | - Different function and concern: input-side job layout, not output type composition. It shares no code path with the #24481 fix (`map_over_collection_type` vs `effective_collection_type`).<br>- Its subject is compound `paired_or_unpaired`, not sample sheets. The sample_sheet truncation half was tabled by John (don't backport #22565 to 26.0), so the overlap with this branch is gone.<br>- It has its own filed issue, plan and planned branch name (`issue_24226_effective_map_over_compound_26.0`). Bundling would make the PR "fixes #24481 and #24226" across two unrelated failure modes and complicate review and changelog.<br>- The fix trial changed sample_sheet-input results as a side effect. Mixing that into a sample-sheet output PR invites confusion about which change caused what. |

<details>
<summary>Why #24226 stays out</summary>

The "related bugs in touched code" argument applies to the touched function, and #24226 isn't in it. The branch doesn't modify `effective_collection_type`, its tests (`test_type_descriptions.py` rows for effective types, `get_structure` in `test_structure.py`) are separate cases, and the client side is already correct for #24226. Both fixes do land in one file on the same base, so whichever lands second gets a trivial rebase. Landing them back to back costs nothing. Bundling them gains nothing for reviewers and makes the PR harder to understand. If John prefers fewer PRs, #24226 could stack on this branch as a separate commit series, but a sibling PR is cleaner.
</details>

### F. Backport #22565's sample_sheet map-over guard to 26.0

Reject non-sample-sheet collections mapped over `sample_sheet*` inputs on 26.0, as dev does.

| Pros | Cons |
| --- | --- |
| - Removes the reachable sample_sheet truncation on 26.0 (#24226 family 1). | - Explicitly tabled by John (2026-10-17).<br>- It's input-side matching, unrelated to output type composition.<br>- It changes behavior users may rely on in a release branch. |

## Notes for the implementer if B is taken

- Add the cross-product rows to the `test_type_descriptions.py` composition table, and the matching vitest `append` cases: `sample_sheet x sample_sheet -> list:list`, `list x sample_sheet -> list:list`, `sample_sheet:paired x sample_sheet -> list:paired:list`. Add one `test_structure.py` precreate case that asserts the inner columns are gone.
- Update the comments to state the general rule.
- An API test for the unlinked cross product is optional; the unit coverage is enough given how rarely it's reachable.
