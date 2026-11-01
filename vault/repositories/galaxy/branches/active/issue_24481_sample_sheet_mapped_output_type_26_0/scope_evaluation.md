Run via Claude Opus 5.5 at high effort.

# Scope evaluation (second, post re-scope): issue_24481_sample_sheet_mapped_output_type_26_0

**Recommendation: small expansion (Scope B+).** Keep the re-scoped rule (demote every `sample_sheet` rank of an invalid composed type) and extend it to the one remaining place a mapped execution makes a collection type: `OutputCollections.create_collection` in `lib/galaxy/tools/actions/__init__.py`. When a job runs inside a map-over (`self.dataset_collection_elements is not None`), apply `demote_sample_sheet_ranks` to the type it is about to create. A child of an implicit collection is never the outermost rank, so a `sample_sheet` there is always invalid. That makes the rule exact, and it is independent of the pending #24308 `type_source` decision. This closes the limitation in review 2. It also removes a new inconsistency that this branch introduces: before the branch, a `type_source` output batched over a list with an unmapped sample sheet source produced an invalid but self-consistent `list:sample_sheet` HDCA. Now it produces a `list:list` HDCA whose job-created children are `sample_sheet` collections. The fix is about 2-3 lines plus one API test using the existing `collection_type_source` test tool (header batched over a list, `input_collect` = a sample sheet). If that test shows the path is unreachable, ship as implemented (Scope B). Keep #24226, #24308's general `type_source` rule, sample sheet nesting as a valid type, and the #22565 guard backport out.

## Possible Decompositions

The branch is 290 insertions over 10 files: about 75 lines of library/client code, the rest tests and a populator extension. It is small enough to land as one PR. Possible splits, in landing order (commits from `git log upstream/release_26.0..HEAD`):

1. **Baseline tests, then fix (process default).** PR 1: the "Baseline tests" commits `52bd957be70`, `b9be6681bfb` and `175dae42abf` (the `with_sample_sheet` populator, valid-composition and column-preservation cases). PR 2: everything else (`1678b7a7ed5`, `bc2552c1950`, `381ea4573e1`, `cc76cb4b921`, `25e8710ad19`, plus the B+ commit if taken).
2. **Runtime vs editor.** PR 1 is the runtime fix: `map_over_collection_type` and `demote_sample_sheet_ranks`, `Tree.multiply` and `_demote_sample_sheets`, the B+ `create_collection` change, and the unit and API tests. PR 2 is editor consistency: client `append` and `demoteSampleSheetRanks` plus vitest, and the `_resolve_collection_type` routing in `managers/workflows.py` plus the `test_modules.py` cases. PR 2 depends on PR 1's helper.
3. **Leading vs nested.** PR 1 is the original scope (alt `_alt_original_scope` at `381ea4573e1`, leading `sample_sheet` only). PR 2 is the generalization to nested ranks (`cc76cb4b921`, `25e8710ad19`, B+). The history already splits this way, but PR 2 would rewrite PR 1's helpers. That costs more review than it saves.

## Scopes considered

### A. Original scope: demote a leading sample_sheet only (alt branch)

Only a leading `sample_sheet` followed by an invalid suffix becomes `list`, and its columns are dropped. Kept as `issue_24481_sample_sheet_mapped_output_type_26_0_alt_original_scope`.

| Pros | Cons |
| --- | --- |
| - Smallest diff; covers the issue's literal cases (`sample_sheet:list`, `sample_sheet:list:paired`). | - Unlinked cross products still give invalid `list:sample_sheet`, and `sample_sheet x sample_sheet` gives it from the new code itself.<br>- The general-sounding comment covers only position 0. The first evaluation's reasons still stand, and the expansion has since landed and been reviewed cleanly. Going back would discard verified work. |

### B. As implemented: demote every sample_sheet rank of an invalid composed type

`map_over_collection_type` and the client `append` demote every `sample_sheet` rank when the composed type fails `COLLECTION_TYPE_REGEX`. `Tree.multiply` keeps columns only when the result still starts with `sample_sheet`, and otherwise retypes the nested sample sheet trees (including `UninitializedTree`) as lists without columns. The subworkflow output type goes through the same helper.

| Pros | Cons |
| --- | --- |
| - "Composition never yields an invalid sample_sheet type" is one rule, tested by a table on both server and client.<br>- Review 2 found no must-fix issues. Each new case fails on the prior code. Performance is unchanged.<br>- Server, client and subworkflow editor dict agree. | - The rule stops at precreation. Job-time `create_collection` for `type_source` outputs still makes `sample_sheet` children under a demoted `list:list` parent (review 2, unverified).<br>- That mismatch is new in this branch. Before, parent and children agreed, though the parent's type was invalid. A reviewer who reads "never yields an invalid type" may test exactly this.<br>- Demoted `record` levels lose `fields`. This was already true before the branch and has no consumer. |

### B+. Recommended: B plus demotion of job-created children in mapped executions

In `create_collection`, when `self.dataset_collection_elements is not None` (the job is one slice of a map-over), pass the resolved `collection_type` through `demote_sample_sheet_ranks` before `create_dataset_collection`. Add an API test: `collection_type_source` with `header` batched over a list and `input_collect` = a sample sheet. Assert that the implicit HDCA is `list:list` and that each element's `object.collection_type` is `list`.

| Pros | Cons |
| --- | --- |
| - Applies the branch's rule in the last place that creates mapped types, so the HDCA and its children agree.<br>- Exact and decision-free. A mapped child is never the outermost rank, so a `sample_sheet` child type is always invalid there. It doesn't depend on how #24308 resolves `type_source`.<br>- Also covers any fixed `type="sample_sheet"` or discovered output mapped over a list, should one appear.<br>- Small: 2-3 lines in one function, one API test with an existing test tool.<br>- Turns review 2's "unverified" concern into a tested fact either way. | - Touches `tools/actions/__init__.py`, a file outside the branch's current diff. `type_source` work on #24303 (26.2) and #24308 may touch it later, which means a small merge-forward overlap.<br>- Rare path: it needs a multi-input tool where one input is batched and an unmapped sample sheet feeds `type_source`.<br>- Needs an API test run, which costs more than a unit test.<br>- If a sample sheet's columns were carried into element kwds here, they would need dropping too. From the code, discovered/identifier-built elements carry no columns, but the test should confirm. |

<details>
<summary>Why B+ over B, and why it is not #24308</summary>

#24308 is about *which* type a `type_source` output takes when precreation and job time disagree (declared vs concrete subcollection type). That needs a decision, and it targets newer branches. B+ makes no such choice. It keeps the job-time resolution exactly as it is and only applies the validity rule this branch already established. A `sample_sheet` rank below a mapped parent is invalid whatever type #24308 settles on. So B+ finishes this branch's rule rather than starting the `type_source` work.

The scope guidance favors fixing related bugs in touched code together. More importantly, B creates this mismatch. Review 2 noted that before the re-scope the parent was `list:sample_sheet`: invalid, but consistent with its children. Leaving the branch's new inconsistency to a different issue's follow-up is the kind of narrow scoping reviewers push back on.

The shape below is a suggestion, not a requirement:

```python
if self.dataset_collection_elements is not None:
    collection_type = demote_sample_sheet_ranks(collection_type)
```

Put it just before `create_dataset_collection`. A first-rank `sample_sheet` is still demoted because, in a mapped slice, it is not first in the implicit type. If the API test shows the children are already `list` (for example, because something else retypes them), drop B+ and record the limitation as disproven.
</details>

### C. Contraction: runtime only, drop editor changes

Keep the server composition and `Tree.multiply` changes. Drop client `append` and `_resolve_collection_type`.

| Pros | Cons |
| --- | --- |
| - Smaller diff, no client change. | - The editor would show `sample_sheet:list` or `list:sample_sheet` while the runtime makes `list:list`, which reintroduces the mismatch review 1 flagged as should-fix.<br>- The client change is about 20 lines and is already tested. |

### D. Make `sample_sheet:list` and nested sample sheets valid types, keeping columns

Extend `COLLECTION_TYPE_REGEX` and the sample sheet plugin so sample sheets can wrap arbitrary collections or sit below a list.

| Pros | Cons |
| --- | --- |
| - No column loss. | - A feature for `dev` with design discussion: regex, client validation, rank plugin, workbook code and UI all assume the current suffixes.<br>- Contradicts the issue_24303 normalize-to-list precedent. Mention it in the PR text as the alternative only. |

### E. Fold in the general `type_source` resolution rule (#24308) or `type_prefix` (#24303)

Make mapped `type_source` outputs take one shared resolution rule at precreation and at job time.

| Pros | Cons |
| --- | --- |
| - Would fix the B limitation as a side effect, along with the `paired_or_unpaired` divergences. | - #24308 sits in `needs_decision` (declared vs concrete subcollection type, interacting with open PR #24227). #24303 targets `release_26.2`.<br>- A behavior decision that is unrelated to sample sheets would block a 26.0 fix. B+ gets the sample sheet part without it. |

### F. Fold in #24226 (effective map-over type for compound `paired_or_unpaired`)

| Pros | Cons |
| --- | --- |
| - Same file (`type_description.py`) and base. | - A different function (`effective_collection_type`, input-side job layout) with no shared code path and its own queued plan. Its sample sheet half was tabled by John. The first evaluation's reasoning still holds. Keep it as a sibling PR. |

### G. Backport #22565's sample_sheet map-over guard to 26.0

| Pros | Cons |
| --- | --- |
| - Removes input-side sample sheet truncation on 26.0. | - Tabled by John (2026-10-17). It is about input matching, not output typing, and it changes release-branch behavior. |

## Notes if B+ is taken

- Import `demote_sample_sheet_ranks` into `tools/actions/__init__.py` (`type_description` has no heavy imports).
- Check in the API test that the job completes and that discovered datasets land in `list` children. Also check that `columns` is absent on the elements.
- Update `implementation_rescope_debrief.md`'s "Remaining limitation" and the PR text accordingly. Keep the `terminals.ts:484` editor alignment note from review 2 for the PR text.
