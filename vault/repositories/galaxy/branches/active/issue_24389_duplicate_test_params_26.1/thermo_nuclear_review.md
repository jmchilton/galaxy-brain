# Thermo-nuclear review (round 2, after re-scope)

No structural regression in lib. One presumptive blocker fired again and is now fixed: `test_parameter_test_cases.py` had grown 850 → 1049 lines. I acted on two things:

1. **Moved the branch's new tests to `test/unit/tool_util/test_parameter_test_cases_duplicates.py` (215 lines).** This is a new last commit, `f8761cc62c4`. `test_parameter_test_cases.py` is now byte-identical to base, at 850 lines. Only tests this branch adds moved. The pre-existing unqualified-duplicate tests stayed put, so no base code moved. That answers round 1's "release-branch churn" objection, and a new module should merge forward to dev with fewer conflicts. The test count is unchanged: 155 passed, 1 skipped, both before and after the move. `raw_xml_tool_source` is imported from `.test_parameter_test_cases`, following `test_parameter_convert.py`'s existing import of `tool_source_for`. Intermediate commits still grow the old file (baseline 956, peak 1049 at `50717f7c63e`); only the final commit brings it back to base.
2. **Collapsed the normalizer from 3 functions to 2.** This was folded into `50717f7c63e`, the composite-collections commit. `_comparable_attributes` existed only to be shared by the input path and the collection-leaf path. A collection leaf is already a `ToolSourceTestInput` (from `__parse_param_elem`), so the leaf now calls `_comparable_test_input` directly and the attribute logic is inlined there. That leaves one recursion: input → collection → element input/collection. I also dropped defensive code for shapes the parser no longer emits:
   - the `str(...)` cast: since the re-scope, edit values are always strings
   - the `isinstance(..., dict)` collection guard: XML `collection` is always a dict

   Red checks were redone in the worktree with temporary edits, then `git checkout HEAD --`, and `git status` was clean afterwards:
   - disabling the collection recursion fails `test_duplicate_identical_composite_collection_test_param_is_tolerated`
   - disabling the `edit_attributes` filter fails that test plus `..._with_children_is_tolerated[composite_data]`

New head `f8761cc62c4`. The baseline `2a2ff57e989` is still first. 4 suites: 155 passed, 1 skipped. mypy on `case.py` is clean. The one remaining error, a redundant cast in `convert.py`, is pre-existing and not in this diff.

Not acted on:
- **The normalizer still filters on xml.py's generated-name prefix.** This is the real code-judo move, deferred to dev: carry the generated composite rename outside `edit_attributes`, for example as a separate parsed field that the upload path applies first. Then `_comparable_test_input` loses its filtering and `_comparable_collection` disappears. Out of scope on 26.1 because it changes upload logic and parsed test output for external consumers. Round 1's call still holds.
- **The placeholder before the `try` in `test_case_validation`. Kept.** It still mirrors dev's `262e080dfe0`.
- **`_inputs_by_name` plus the flatten in `_repeat_inputs_to_array`. Kept.** It reuses `visitor.repeat_inputs_to_array` unchanged, and the alternative is a bespoke bucketer.
- **YAML collections (JSON shape, no `element_definition`) look like a `KeyError` risk in `_comparable_collection`. Not reachable.** YAML `parse_tests_to_dict` validates test inputs as a mapping, so a list-form YAML test with a duplicate name fails before reaching `case.py`. I checked this with a scratch YAML tool. Dict-form inputs can't duplicate. So I added no guard.
- **`xml.py` is 1728 lines and `test_tool_linters.py` was already over 1k at base.** The 1k rule doesn't apply to either.

<details><summary>Full review</summary>

**Scope:** `git diff df713519127..HEAD`: `parameters/case.py`, `parser/util.py` (+2), `parser/xml.py` (+3/-2), plus tests.

**Structural / code-judo**
- `input_for`: exact matches go through the existing `_resolve_matching_inputs`, so there's one tolerance rule for all four match tiers. No new branch type. Good.
- `_inputs_as_dict` → `_inputs_by_name`: this is the minimal change that ends last-wins dropping. The flatten comprehension is the price of reusing the generic visitor helper, and that's worth it.
- Parser `edit_attributes` → `dict(child.attrib)` (the re-scope) was the right move. It removed the Element/dict duck typing and fixed `to_dict()` serialization.
- Comparison normalizer: after the Codex round-2 fix it had grown to three mutually aware helpers. The leaf branch was rebuilding `{**definition, "attributes": ...}`, which re-derived what `_comparable_test_input` already does. Fixed as above. I rejected a generic dict/list scrubber (drop any `{"type": "name", "value": "_COMPOSITE_RENAMED_..."}` anywhere). It's shorter, but it hides the data shape, which rule 4 flags.

**Spaghetti:** none. No flags, modes or optional params added. The normalizer is private and only reached when there are 2+ matching inputs.

**Boundary / types:** `ToolSourceTestInputAttributes = Dict[str, Any]` keeps the comparison loosely typed. `comparable: Any` in `_comparable_collection` reflects the two element kinds (collection dict vs input tuple). Tightening this belongs with the dev parser follow-up.

**File size:** `case.py` 719. `test_parameter_test_cases.py` back to 850 (base). The new module is 215.

**Dev follow-ups**
1. Parser: carry the generated composite rename outside `edit_attributes`, then delete the prefix filter and `_comparable_collection`.
2. Optional: move the pre-existing unqualified-duplicate tests (from `5a443294512`) into `test_parameter_test_cases_duplicates.py` alongside these.

No security concerns.
</details>
