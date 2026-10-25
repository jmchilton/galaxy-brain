# Thermo-nuclear review

The lib code has no blocking structural regression. One presumptive blocker fired: `test_parameter_test_cases.py` went from 850 to 1011 lines. I acted on it by folding the two copy-pasted data-param tool XMLs into one `DUPLICATE_DATA_TOOL_TEMPLATE`. That was fixed up into the Codex follow-up commit and brings the file to 1005 lines. The rest is waived or deferred to dev, listed below. New head: `77097faf349` (baseline `23d7dbe5c7d`, fix `74913630f85`, follow-up `77097faf349`). 153 passed, 1 skipped.

Not acted on:
- **`test_parameter_test_cases.py` is still over 1k (1005), waived for 26.1.** The extra lines are real tests for this change. Splitting a pre-existing test module on a release branch is churn, and squeezing lines out by reformatting would be gaming the rule. Dev follow-up: move the duplicate-param tests (the unqualified ones from 5a443294512 plus this branch's) into their own module.
- **`_comparable_test_input` normalizes a non-canonical parser shape. Deferred to dev.** `__parse_param_elem` (`parser/xml.py`) stores `edit_attributes` as a mix of raw XML Elements and one plain dict, and puts a generated UUID composite rename among the author's attributes. That's why case.py has to duck-type (`hasattr(edit, "attrib")`) and filter on xml.py's prefix. The shared `COMPOSITE_DATA_RENAME_PREFIX` contains the leak but doesn't remove it. The real fix is in the parser: store `dict(child.attrib)` and carry the generated rename separately. Then the normalizer goes away. I didn't do this on 26.1 because it changes parsed test output for every tool, and `galaxy-tool-util` has external consumers (planemo).
- **`test_case_validation` sets a placeholder before the `try`. Kept on purpose.** It mirrors dev's `262e080dfe0` exactly, which keeps the merge-forward conflict small.
- **`_repeat_inputs_to_array` groups by name and then flattens. Kept.** It reuses `visitor.repeat_inputs_to_array` unchanged. Swapping the nested comprehension for `chain.from_iterable` would only be cosmetic.
- **`test_tool_linters.py`:** already 2878 lines at base, so the 1k rule doesn't apply.

Extra correctness check: at profile 25.1, two identical `<param>` with `<collection>` children against a `data_collection` input are tolerated (`error=False`). So `_test_collection_def_dict` output doesn't hit the false-"Ambiguous" problem Codex found for `edit_attributes`.

<details><summary>Full review</summary>

**Scope:** `git diff df713519127..HEAD`: `parameters/case.py` (+40/-17), `parser/util.py` (+2), `parser/xml.py` (+1/-1), plus tests.

**Structural / code-judo**
- `input_for`: exact matches now go through the existing `_resolve_matching_inputs`. That's the right move. It reuses the same tolerance rule as the unqualified fallbacks instead of adding a new branch. No new special case.
- `_inputs_as_dict` → `_inputs_by_name`: the minimal change that stops last-wins dropping, and it keeps the canonical `visitor.repeat_inputs_to_array` (generic over the value type). A list-based repeat bucketer would duplicate visitor logic, so it isn't worth doing.
- `_comparable_test_input`: the one real design smell. It's a boundary normalizer that only exists because the parser emits a mixed, non-serializable shape with generated data inside the author's attributes. The code-judo fix makes the normalizer disappear: parser stores dicts, rename lives outside `edit_attributes`. That's the right home, but it's out of scope for a release fix (see above). On 26.1 the normalizer is small, private, documented in one line, and has tests on both sides (tolerated and rejected).

**Spaghetti:** none added. No new flags, modes or optional params. The `try` move in `test_case_validation` matches dev.

**Boundary / types:** `Tuple[Any, Dict[str, Any]]` follows from the loose `ToolSourceTestInputAttributes = Dict[str, Any]`. Tightening it belongs with the parser follow-up.

**File size:** `case.py` 706 (fine). `test_parameter_test_cases.py` 850→1011, now 1005 after the dedupe; waived as above. `test_tool_linters.py` was already over.

**Tests:** the two data-param tests copy-pasted a 14-line tool XML. Now there's one `{first}`/`{second}` template, matching the `DUPLICATE_QUALIFIED_TOOL_TEMPLATE` pattern. No assertions changed.

**Dev follow-ups**
1. Parser: `edit_attributes` as dicts; generated composite rename carried separately; then delete `_comparable_test_input`'s normalization.
2. Split the duplicate-param tests out of `test_parameter_test_cases.py`.

No security concerns.
</details>
