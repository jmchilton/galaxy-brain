# Normal review 1 (post-implementation)

Acted on: the subworkflow editor type composition in `WorkflowContentsManager._resolve_collection_type` now uses `map_over_collection_type` (with baseline and regression cases in `test/unit/workflows/test_modules.py`); the list-output API test now asserts sample sheet columns are absent; the demotion comments now say they apply to a *leading* sample_sheet only.

Not acted on:
- Cross products (unlinked batch inputs) such as `list x sample_sheet` or `sample_sheet x sample_sheet` still compose `list:sample_sheet` with nested column metadata. Pre-existing and not made worse; recorded as a known limitation / follow-up rather than widening a 26.0 fix.
- `object.__new__(DatasetCollectionManager)` in the structure tests: acceptable; the method does not use `self` state and the issue's reproduction uses the same idiom.
- Already-passing parametrized cases in the fix commit's type-description test: harmless, kept as context next to the regression cases.
- `log.debug` on dropped columns: not added; the decision is recorded in the branch debrief / PR instead.
- `terminals.test.ts` editor test: optional; `append` unit tests cover the logic.
- Merge-forward collision with the issue_24303 work in `type_description.py`: noted for the branch manager.

<details>
<summary>Full review</summary>

# Review 1 (raw): issue_24481_sample_sheet_mapped_output_type_26_0

Reviewed `git diff upstream/release_26.0...HEAD` (52bd957be70, b9be6681bfb, 1678b7a7ed5).

## Verification performed

- HEAD: `test_structure.py`, `test_type_descriptions.py`, `test_matching.py` pass (49). Client
  `collectionTypeDescription.test.ts` + `terminals.test.ts` pass (91) under node 22.20.0.
- Baseline check: extracted the tree at 52bd957be70 (lib identical to base, since the baseline
  commit only touches tests/populators) and ran HEAD's `test_structure.py` and
  `test_type_descriptions.py` against it. Baseline tests pass; all 9 new regression cases fail
  (5 type_description demotion cases, 3 structure demotion cases, unlinked-list case). So the
  baseline tests are real baselines and the regression tests do catch the bug.
- API tests not run (per instructions).
- Probed compositions in-process (HEAD):
  - `sample_sheet:record x list -> list:record:list` (valid), `sample_sheet:paired_or_unpaired x list -> list:paired_or_unpaired:list` (valid).
  - `sample_sheet x sample_sheet -> list:sample_sheet` (INVALID; was `sample_sheet:sample_sheet`, also invalid).
  - `list x sample_sheet -> list:sample_sheet` (INVALID, unchanged, pre-existing).
  - `Tree(list).multiply(Tree(sample_sheet))` / `Tree(sample_sheet).multiply(Tree(sample_sheet))`: outer type
    `list:sample_sheet`, inner children keep `sample_sheet` type and their column_definitions.

## Findings

### Should-fix

1. **Unpatched server-side composition in the subworkflow editor path** -
   `lib/galaxy/managers/workflows.py:1481`:
   `collection_type = f"{map_over}:{step_data_output['collection_type']}"`
   in `_resolve_collection_type` (used for subworkflow step outputs in the editor dict). A tool
   with a `list` output inside a subworkflow, mapped over a `sample_sheet` subworkflow input,
   still reports `sample_sheet:list` as the subworkflow output type to the outer editor. The client
   then treats it as starting with `sample_sheet` (terminals.ts:626-631 asymmetry guard), so the
   editor can accept connections into `sample_sheet` inputs that the runtime `list:list` will not
   satisfy. One-line fix: use `map_over_collection_type(map_over, step_data_output["collection_type"])`
   (or the factory multiply). Existing tests for `_resolve_collection_type` / `get_step_map_over`
   are in `test/unit/workflows/test_modules.py`; a small case there would pin it. This is exactly the
   "server/client consistency" class the fix targets, so it belongs in this branch.

2. **Demotion only handles a leading `sample_sheet`; cross products still yield invalid types** -
   `lib/galaxy/model/dataset_collections/type_description.py:213-217`,
   `lib/galaxy/model/dataset_collections/structure.py:171-178`. With unlinked (cross-product)
   batch inputs (`matching.py:79-86`), `sample_sheet x sample_sheet` now gives `list:sample_sheet`
   and `list x sample_sheet` gives `list:sample_sheet`; inner children are cloned sample_sheet Trees
   that keep their columns, and `precreate_dataset_collection` will create nested `sample_sheet`
   collections under a `list:sample_sheet` parent. Pre-existing and arguably out of the issue's
   scope (the issue is about fixed nested outputs), and the branch does not make it worse in
   validity terms, but the comment "sample_sheet can only be followed by..." plus the
   `_normalize_collection_type` call reads as a general fix. Either (a) note it explicitly as a known
   limitation in the debrief/PR text and file a follow-up, or (b) cheaply reject/normalize any
   non-leading `sample_sheet` rank. I would go with (a) for a 26.0 target. Also worth noting:
   tools whose output type is `sample_sheet` mapped over a list (`list:sample_sheet`) are the same
   pre-existing class.

### Nits / minor

3. `lib/galaxy_test/api/test_tool_execute.py` (`test_map_list_output_over_sample_sheet`): asserts
   type, populated state and identifiers but not that `column_definitions` is absent/None and element
   `columns` are None on the demoted collection - the API-visible half of the "drop columns"
   decision. One extra assert would pin it end-to-end (unit test covers it in precreate only).
4. `test/unit/data/dataset_collections/test_structure.py` `_precreate` uses
   `object.__new__(DatasetCollectionManager)` to call `precreate_dataset_collection` without an app.
   Works because the method does not touch `self` for this path, but it is fragile if that method
   ever uses `self.model`/`self.app`. Acceptable; a comment already explains it.
5. `test_type_descriptions.py` parametrization mixes baseline-valid cases
   (`sample_sheet:paired` etc., `list:list`) into the fix commit. They pass on base; harmless, but by
   the "Baseline tests" convention they could have lived in the baseline commit. Not worth a rebase.
6. Data loss is silent: demotion drops column_definitions/columns with no log or user-visible note.
   Defensible (a list cannot carry them, the issue left this open), but a `log.debug` or a mention in
   the PR text helps reviewers understand the trade-off. Consider whether upstream would prefer the
   alternative (extending sample_sheet nesting) - flag the decision clearly in the PR.
7. Merge-forward: sibling branch issue_24303 (26.2) adds `for_prefixed_collection_type` with its own
   sample_sheet normalization in the same module; expect a nearby-hunk interaction in
   `type_description.py` when merging 26.0 forward. Not a code problem, just coordinate.
8. Terminals-level editor test: optional. The `append` unit tests cover the string algebra; a
   `terminals.test.ts` case (tool with a `list` output mapped over a `sample_sheet` input should not be
   connectable into a downstream `sample_sheet` input, and a downstream `list` data input should map
   with mapOver `list`) would pin the observable editor behavior change. Nice-to-have, not required.

## Correctness notes (no action)

- Server rule (`startswith("sample_sheet") and regex fails -> replace leading sample_sheet with list`)
  and client rule (`collectionTypeDescription.ts:96-101`) are identical and both reuse the same
  regex. Valid compositions (`sample_sheet:{paired,record,paired_or_unpaired}`) are untouched.
- `Tree.multiply` keys column retention on the resulting type, which is the right coupling; the
  leaf case (`other_structure.is_leaf -> clone`) keeps columns. `UninitializedTree.multiply` has no
  columns and just composes via the fixed `multiply`.
- Other consumers: `precreate_dataset_collection` (managers/collections.py:141-167) only reads
  `structure.column_definitions/columns_metadata`, so dropping them on the Tree is sufficient.
  `_structure_for_output` default_identifier_source and subworkflow mapping go through the same
  `multiply`. No other server composition found except workflows.py:1481 (finding 1).
- Client `_effectiveCollectionTypes` (terminals.ts:615) and `_otherCollectionType` (terminals.ts:366)
  now see `list:...` instead of `sample_sheet:...`; `canMatch`/`canMapOver` normalize anyway, and
  downstream `effectiveMapOver` now yields `list`, matching the runtime collection. This is a
  correctness improvement.

</details>
