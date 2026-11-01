# Normal review 2 (after re-scope)

**Acted on** (commit `25e8710ad19`):

- Removed the API assertion on inner `column_definitions`, which could never fail because nested element objects never include that field.
- Removed the `when_values` copy in `_demote_sample_sheets`, which had no effect.
- Added a unit case for the `UninitializedTree` path (`list` × an `UninitializedTree` of type `sample_sheet`).
- Clarified that the demotion helpers apply only to an invalid composed type.

**Not acted on:**

- **Job-created inner collections from `type_source` outputs.** A batched step whose `type_source` input is an unmapped sample sheet can still produce `sample_sheet` children under a `list:list` parent. The cause is in per-job `create_collection`, not in mapping composition, and it is `type_source` resolution territory (#24303/#24308). It is recorded as a known limitation, and the scope claim is narrowed accordingly. Unverified by test.
- **Demoted `record` levels lose `fields`.** `multiply` already dropped `fields` before this branch, and nothing consumes them here.
- **Editor accepts a `list:list` connection for a `multiple="true\"` data input mapped over a sample sheet.** This is `terminals.ts:484`. It now matches runtime `can_match_type`; noted for the PR text.

<details>
<summary>Full review</summary>

# Review 2 (raw, post re-scope): issue_24481_sample_sheet_mapped_output_type_26_0

Run via Claude Opus 5.5. Reviewed `git diff upstream/release_26.0...HEAD`, focusing on the re-scope commit `cc76cb4b921`.

## Verification performed

- HEAD: `test/unit/data/dataset_collections/` + `test/unit/workflows/test_modules.py`: 194 passed. Vitest `src/components/Workflow/Editor/modules/`: 96 passed (node 22.20.0). ruff, black, isort clean on changed Python files; mypy clean on `structure.py` and `type_description.py`.
- Fail-on-HEAD~1: reverse-applied only the re-scope commit's source changes (`lib/galaxy/model`, `collectionTypeDescription.ts`) with `git diff | git apply -R`, ran the tests, restored. 6 new Python cases fail (2 `test_multiply_by_unlinked_sample_sheet_demotes_inner_sample_sheets`, 4 new cross-product rows in `test_multiply_sample_sheet_by_invalid_suffix_demotes_to_list`); vitest "demotes every sample_sheet rank to list" fails. Every new case is a real regression test. Worktree left clean.
- API tests not run (per instructions).
- In-process probes (HEAD):
  - `list(2) x sample_sheet:paired_or_unpaired` Tree: `list:list:paired_or_unpaired`; inner levels retyped `list:paired_or_unpaired`, grandchildren keep `paired_or_unpaired` and their children; columns dropped.
  - `list x sample_sheet:record` (fields set): demoted level `list:record` loses `fields` on its description; inner `record` keeps them.
  - `sample_sheet Tree x UninitializedTree(sample_sheet:paired)`: `list:list:paired`, children `UninitializedTree(list:paired)`, outer columns dropped.
  - `UninitializedTree(list) x sample_sheet:record`: `list:list:record`.
  - `map_over_collection_type`: `sample_sheet:paired x sample_sheet -> list:paired:list`, `sample_sheet x list:sample_sheet:paired -> list:list:list:paired`, `list x foo -> list:foo` (unchanged invalid passthrough).
  - Performance: `Tree(list 2000).multiply(Tree(list 500))` (1M nodes), best of 3: 2.51s HEAD vs 2.70s HEAD~1, so noise and no regression. The extra per-level list comprehension and an O(1) substring check per child are negligible.

## Correctness

- Full demotion is the minimal fix. Any composition that puts a `sample_sheet` rank at a non-leading position, or follows a leading one with more than one permitted rank, can't keep the outer `sample_sheet` (an inner `sample_sheet` becomes `list`, and `sample_sheet:list...` is invalid). So "replace every rank" never demotes a rank that could have stayed. Demotion only runs when the regex fails, so valid `sample_sheet:{paired,record,paired_or_unpaired}` is untouched.
- The server (`type_description.py:213-216`, `:219-227`) and client (`collectionTypeDescription.ts:85-90`, `:109-112`) match: same regex (identical literal), same rule, same trigger.
- Running `COLLECTION_TYPE_REGEX.match` on every composition is fine. The regex is precompiled and anchored, and the strings are short. Compositions that are invalid for other reasons (unknown rank) pass through unchanged, as before.
- `_normalize_collection_type` is no longer used for composition. It is still used correctly for matching (`has_subcollections_of_type`, `can_match_type`, `effective_collection_type`), where only a leading `sample_sheet` can occur in a valid stored type. It is not a leftover.
- `Tree.multiply` (`structure.py:172-184`): columns are kept only when the result still starts with `sample_sheet`. In that branch the children can't contain `sample_sheet` (the suffix is a single paired/record/paired_or_unpaired), so skipping `_demote_sample_sheets` there is correct. In the other branch `self.columns_metadata` is dropped, which can only be non-empty when `self` is a sample sheet, so nothing legitimate is lost.
- `_demote_sample_sheets` (`structure.py:199-216`): it keeps children order, identifiers and nested `paired_or_unpaired` structure, and handles `UninitializedTree` and `Leaf`. The re-walk at each recursion level short-circuits on `"sample_sheet" not in collection_type`, so the cost is linear.
- `precreate_dataset_collection` (`managers/collections.py:126-178`) reads only `structure.collection_type_description`, `column_definitions` and `columns_metadata`, so retyping the tree is enough for precreated levels.

## Findings

### Must-fix

None.

### Should-fix

1. **The job-created inner collection can still be `sample_sheet` under a demoted `list:list` parent (unverified).** See `lib/galaxy/tools/actions/__init__.py:1150-1185` (`create_collection`) and `structure.py:236-244` (`tool_output_to_structure`). Take a tool whose output uses `type_source` (e.g. test tool `collection_type_source`), batched over a list via a data input, with the `type_source` input receiving a non-mapped sample sheet. The implicit HDCA type is now `list:sample_sheet -> list:list`, and the structure tree is retyped. But each job's `create_collection` computes its own type from the source input (`sample_sheet`) and assigns it as `dataset_collection_elements[name].child_collection`, replacing the precreated `list` child. The result is a `list:list` HDCA whose children are `sample_sheet` DCs. Before the re-scope the parent was `list:sample_sheet`: invalid, but consistent with its children. The scope evaluation claims scope B "also covers a tool output of type sample_sheet mapped over a list". The structure and type layer cover that case, but the job-created child collection doesn't. Options:
   - (a) In `create_collection`, when `self.dataset_collection_elements is not None`, demote the type (`demote_sample_sheet_ranks`) and don't carry columns.
   - (b) Treat this as a known limitation in the debrief/PR and drop the claim.

   I didn't verify this end to end. An API test with `collection_type_source` (header batched over a list, `input_collect` = sample sheet) would settle it. The path is rare: no in-tree tool fixes a `sample_sheet` output, and the sample sheet has to reach `type_source`/`structured_like` unmapped.

2. **One API assertion is vacuous.** `lib/galaxy_test/api/test_tool_execute.py` (`test_unlinked_map_over_list_and_sample_sheet`, the `inner.get("column_definitions") is None` line). Nested element `object` dicts don't serialize `column_definitions` (`managers/collections_util.py` `dictify_element_reference` emits `collection_type`/`populated`/elements only), so that check always passes. The `columns`-is-None check on inner elements is meaningful (`columns` is in `DatasetCollectionElement.dict_element_visible_keys`). Drop the vacuous line, or fetch the inner collection directly if the definitions should be pinned. The top-level `details.get("column_definitions")` checks in the other test are fine, because the HDCA serializer includes the key.

### Nits

3. `structure.py:215`: `when_values=structure.when_values` is effectively dead. Demoted children come from `Leaf.multiply -> other.clone()` or `Tree.multiply`, and neither preserves `when_values` (probed: an input with `when_values=[True, False]` comes out `None`). That's harmless. Either drop the argument or leave it as defensive, but don't present it as meaningful.
4. `structure.py:207-209`: the demoted description is built without `fields`, so a demoted `sample_sheet:record` level becomes `list:record` with `fields=None`. Before, the cloned tree kept the original description. `Tree.multiply`'s own `new_collection_type` already drops `fields` (pre-existing), and precreate doesn't read them, so there's no observable effect found. Mention it only if a record-fields consumer of structure trees turns up.
5. `test_structure.py`: no case exercises `_demote_sample_sheets` on an `UninitializedTree` child (`children_known=False` branch, `structure.py:210-211`), e.g. `Tree(sample_sheet).multiply(UninitializedTree("sample_sheet:paired"))` or `Tree(list).multiply(UninitializedTree("sample_sheet"))`. That's the path a tool output of type `sample_sheet` takes. The probe shows it works. A one-row addition to `test_multiply_by_unlinked_sample_sheet_demotes_inner_sample_sheets` would pin it.
6. Editor behavior change worth a line in the PR: `terminals.ts:484` (`new CollectionTypeDescription("list").append(this.mapOver)` for `multiple="true"` data inputs) now yields `list:list` instead of `list:sample_sheet` when the step is mapped over a sample sheet. So a `list:list` output can now connect there, where it previously could not. Runtime `can_match_type` normalizes the leading `sample_sheet` to `list`, so this looks like a correct alignment, not a regression. No vitest pins it.
7. `type_description.py:219-227` and `collectionTypeDescription.ts:79-90`: the docstrings say "Replace every sample_sheet rank". It's worth stating the caller's contract there (called only when the composed type is invalid), since the bare helper would also demote a valid leading `sample_sheet:paired`. A rename (e.g. `demote_all_sample_sheet_ranks`) is optional.

## Not issues

- Redundancy: `map_over_collection_type` demotes the type string, while `_demote_sample_sheets` retypes the nested trees. These are separate concerns, not duplicate logic, and both use the one `demote_sample_sheet_ranks` helper.
- Circular import `structure.py -> type_description.py`: the latter imports only `registry`, so it's fine.
- `managers/workflows.py:1482` now routes through `map_over_collection_type`, so the subworkflow editor dict gets the generalized rule for free.

</details>
