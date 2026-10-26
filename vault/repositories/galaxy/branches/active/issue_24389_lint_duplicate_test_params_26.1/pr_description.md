Fix 🎯 #24389 - `planemo lint` now reports a tool test that gives the same param twice with different values, instead of saying nothing.

The reported tools-iuc test listed two adapters inside one `<repeat><conditional>` (the cutadapt shape). Galaxy keeps one value and drops the other without saying anything: the last inside a repeat, the first at top level. The test then fails on its output. Today the `release_26.1` tool linter (what `planemo lint` runs) accepts it:

```xml
<repeat name="adapters">
    <conditional name="adapter_source">
        <param name="adapter_source_list" value="user"/>
        <param name="adapter" value="AGATCGGAAGAGC"/>
        <param name="adapter" value="CTGTCTCTTATA"/>
    </conditional>
</repeat>
```

| | `TestsCaseValidation` lint (profile 25.1) |
|---|---|
| Before | *(nothing)* |
| After | `ERROR: Test 1: failed to validate test parameters against inputs - tests won't run on a modern Galaxy tool profile version. Validation errors are [Ambiguous test parameter (adapters_0\|adapter_source\|adapter) specified more than once with different values]` |

This answers the issue's "linter or schema?" question with the linter that already exists. Conflicting duplicates of a qualified param (at top level, in a `<repeat>`, or in `<repeat><conditional>`) now go through the ambiguity check Galaxy already applies to conflicting *unqualified* duplicates. It follows the existing profile split: a lint error at profile ≥ 24.2, a warning below.

***Only the lint changes. Every tool test loads and runs exactly as it does today, with the same value it uses today.*** Rejecting these tests at load moves to the 26.2 follow-up, 🌿[`issue_24389_reject_duplicate_test_params_26.2`](https://github.com/jmchilton/galaxy/tree/issue_24389_reject_duplicate_test_params_26.2), so tool authors get the warning in 26.1 first and IUC CI sees the stricter behavior with 26.2.

***Identical duplicates still pass the lint. It only flags a param given twice with different values, so tools that repeat a param harmlessly are not affected.***

The new lint flags five tools-iuc tools: sourmash sketch (25.0) and isoformswitchanalyzer (25.1) get errors; qiime make_emperor (18.01), hicexplorer hicAdjustMatrix (23.0) and augustus (23.1) get warnings. Each fix is one line in tools-iuc: drop the duplicate, or give each value its own repeat instance.

**Also fixed: tools whose tests use `<edit_attributes>` lose all their tests.** The parser stored those children as raw lxml elements. Since #18560 (24.2), `Tool.parse_tests` JSON-serializes `ToolTestDescription.to_dict()`, and that raised `TypeError: Object of type _Element is not JSON serializable`. The exception was logged and `Tool.tests` became `None`. `GET /api/tools/{id}/test_data` then returned a 500 for that tool, so `galaxy-tool-test` and `planemo test` couldn't fetch its tests. The tag is rare (no tools-iuc or Galaxy functional test tool uses it), but each tool that does loses every test. The children are now stored as plain dicts (`{"type": ..., "value": ...}`), the shape the test runner already reads. ***It belongs here because the lint compares duplicate data params by their `edit_attributes`, which needs the dict shape; on its own it fixes a bug present since 24.2.***

<details><summary>Implementation</summary>

- `test_case_state` takes `reject_conflicting_duplicates` (default off). `test_case_validation`, which backs the lint, turns it on. Test loading (`verify/parse.py`) leaves it off.
- On: `LegacyTestInputResolver.input_for` sends exact-name matches through the existing `_resolve_matching_inputs`, the tolerance rule the unqualified fallbacks already use. `_inputs_as_dict` → `_inputs_by_name` keeps same-name inputs inside a repeat instance, so the resolver sees all of them.
- Off: the resolver takes the first exact match, and a repeat instance keeps the last same-name input, as before.
- Duplicates are compared by content (`_comparable_test_input`). The Galaxy-generated `_COMPOSITE_RENAMED_…` upload name (a new uuid per param) is ignored, including inside collection elements, so identical `composite_data` duplicates still match. The prefix is now a named constant, `COMPOSITE_DATA_RENAME_PREFIX`.
- `test_case_validation` builds the test state inside its `try`, as dev does since #23600, so one bad test gives one lint message for that test instead of aborting validation for the whole tool.
- No XSD change: an `xs:unique` per test container would reject a working ≤ 24.1 idiom (the outer repeat left out, with same-name params filling successive instances), and the XSD can't be gated on profile.

</details>

<details><summary>Tests</summary>

- New `test/unit/tool_util/test_parameter_test_cases_duplicates.py`. The baseline commit adds tests that identical duplicates (top level, repeat, repeat > conditional, and data params with `edit_attributes`/`composite_data` children) are tolerated. They pass on the base.
- Conflicting duplicates are rejected through `case_state(..., reject_conflicting_duplicates=True)` and the lint, including conflicting `edit_attributes`.
- The same tests still load, with no error and the value they used before: the first at top level, the last in a repeat. That holds at profile 25.1 and below 24.2.
- Identical composite collections are tolerated, and `to_dict()` round-trips through JSON.
- `test_tool_linters.py`: the cutadapt shape gives exactly one `TestsCaseValidation` message per bad test, an error at 25.1 and a warning at 23.0.

</details>

## Risks

Low. It adds lint output for tool authors; test parsing at load keeps its behavior apart from the `edit_attributes` shape.

<details><summary>Risk Details</summary>

- `planemo lint` turns red (an error at profile ≥ 24.2) for tools-iuc sourmash sketch and isoformswitchanalyzer. Their tests keep running.
- The parsed `edit_attributes` shape changes from lxml elements to dicts. Only Galaxy's own parser and test runner read it, and the elements couldn't be serialized at all, so no API consumer could have received them.
- At runtime, conflicting duplicates still run with the value that was kept, until the 26.2 follow-up.
- The comparison ignores hand-written `edit_attributes` names that start with Galaxy's internal `_COMPOSITE_RENAMED_` prefix.
- Merging forward conflicts in `case.py` (take the forward branch's `test_case_validation`, keep the rest), `parser/util.py` and `test_tool_linters.py` (keep both sides).

</details>

<details><summary>Risk Review Advice</summary>

Check that loading leaves values unchanged with the flag off (top level keeps the first value, a repeat instance the last), and that `_comparable_test_input` treats identical duplicates as equal, especially `composite_data` params and collections, so tools that repeat a param harmlessly aren't flagged by mistake.

</details>

## Context

Replaces 🔀 #24450, split on review: lint and the `edit_attributes` fix here, rejecting the tests at load on 26.2. Builds on 🔀 #22894, whose ambiguity check (`_resolve_matching_inputs`) already rejects conflicting unqualified duplicates, and mirrors the `test_case_validation` change from 🔀 #23600 (dev) for per-test lint messages. Followed by 🌿[`issue_24389_reject_duplicate_test_params_26.2`](https://github.com/jmchilton/galaxy/tree/issue_24389_reject_duplicate_test_params_26.2), which rejects these tests at load. Alternative kept on 🌿[`issue_24389_duplicate_test_params_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24389_duplicate_test_params_26.1_alt_original_scope): the duplicate fix without the parser change, which duck-types lxml elements vs dicts when comparing and leaves the `test_data` serialization bug. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Split on review: lint-only on 26.1, rejection at load on 26.2.</summary>

- The first evaluation kept lint and rejection at load together. It rejected lint-only because that needs a lint-vs-load mode flag and keeps the wrong value at runtime. Splitting removes both objections: the flag lives only on 26.1, and 26.2 deletes it.
- Kept: storing `edit_attributes` as dicts. It is a standalone 26.1 bug fix, and the comparison relies on it.
- Rejected: XSD `xs:unique` (breaks a working ≤ 24.1 idiom, can't be profile-gated); moving the generated composite rename out of `edit_attributes` (fixes no bug and changes upload code; left for dev).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; new tests moved to their own module and the normalizer simplified.</summary>

- The branch's tests are in `test_parameter_test_cases_duplicates.py`, so `test_parameter_test_cases.py` stays byte-identical to the base.
- The comparison helpers went from three functions to two, and defensive code for shapes the parser no longer emits was dropped.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All tests go through public entry points; the lint and JSON tests fail on the base.</summary>

- The tests use `case_state`, `validate_test_cases_for_tool_source`, `parse_tool_test_descriptions`, `to_dict` and the `tests` lint module, with no mocks.
- The load tests pin the value each placement used before this branch, so they pass on the base by design.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding confirmed and fixed with a red-to-green test, one refuted.</summary>

- Confirmed: identical duplicate collection params with composite elements were rejected, because generated renames inside collection elements weren't ignored. The comparison now recurses into collections.
- Refuted: ignoring hand-written renames that use Galaxy's internal `_COMPOSITE_RENAMED_` prefix. No real test does that, and filtering by position would depend on the parser's insertion order.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests lead; one pure refactor names the composite rename prefix.</summary>

- The first commit adds identical-duplicate baseline tests that pass on the base. The second adds `COMPOSITE_DATA_RENAME_PREFIX` with no behavior change.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A `TestsCaseValidation` message: "Test N: … Validation errors are [Ambiguous test parameter (\<path\>) specified more than once with different values]". It is an error at profile ≥ 24.2 and a warning below. The test itself still runs as before.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
