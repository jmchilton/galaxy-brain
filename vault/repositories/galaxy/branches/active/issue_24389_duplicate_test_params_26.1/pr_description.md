Fix 🎯 #24389 - a tool test that gives the same param twice with different values silently runs with one of them, so it fails later as a confusing output mismatch.

The reported tools-iuc test listed two adapters inside one `<repeat><conditional>` (the cutadapt shape). Inside a repeat Galaxy kept the last value (at top level, the first), dropped the other without a word, and the test failed on its output. Today the `release_26.1` tool linter (what `planemo lint` runs) and the test loader both accept it:

```xml
<repeat name="adapters">
    <conditional name="adapter_source">
        <param name="adapter_source_list" value="user"/>
        <param name="adapter" value="AGATCGGAAGAGC"/>
        <param name="adapter" value="CTGTCTCTTATA"/>
    </conditional>
</repeat>
```

| | `TestsCaseValidation` lint (profile 25.1) | Test at load |
|---|---|---|
| Before | *(nothing)* | runs with `adapters_0\|adapter_source\|adapter = CTGTCTCTTATA` |
| After | `ERROR: Test 1: failed to validate test parameters against inputs - tests won't run on a modern Galaxy tool profile version. Validation errors are [Ambiguous test parameter (adapters_0\|adapter_source\|adapter) specified more than once with different values]` | errors with the same message |

This answers the issue's "linter or schema?" question with the linter that already exists. Conflicting duplicates of a qualified param (at top level, in a `<repeat>`, or in `<repeat><conditional>`) now go through the same ambiguity check Galaxy already applies to conflicting *unqualified* duplicates, and fail with `Ambiguous test parameter (<path>) specified more than once with different values`. It follows the existing profile split: a lint error and a load-time test error at profile ≥ 24.2; a lint warning below that.

***Identical duplicates are still accepted. Only params given twice with different values are rejected, so tools that repeat a param harmlessly keep working.***

***Below profile 24.2 nothing changes at runtime: the lint warns, and the test runs exactly as today.*** ***Only test parsing changes; running tools, the tool form and the tool XSD are untouched.***

***This does turn two IUC tool tests red at load on 26.1: sourmash sketch (profile 25.0) and isoformswitchanalyzer (profile 25.1). Both currently run with a silently dropped value.*** Three more (qiime make_emperor 18.01, hicexplorer hicAdjustMatrix 23.0, augustus 23.1) only get a lint warning. The fix for each is one line in tools-iuc: drop the duplicate, or give each value its own repeat instance.

**Also fixed: tools whose tests use `<edit_attributes>` lose all their tests.** The parser stored those children as raw lxml elements. Since #18560 (24.2), `Tool.parse_tests` JSON-serializes `ToolTestDescription.to_dict()`, which then raised (`TypeError: Object of type _Element is not JSON serializable`). The exception was logged, `Tool.tests` became `None`, `GET /api/tools/{id}/test_data` returned a 500 for that tool, and so `galaxy-tool-test` / `planemo test` couldn't fetch its tests. The tag is rare (no tools-iuc or Galaxy functional test tool uses it), but each tool that does loses every test. The children are now stored as plain dicts (`{"type": ..., "value": ...}`), the shape the test runner already reads.

<details><summary>Implementation</summary>

- `LegacyTestInputResolver.input_for` sends exact-name matches through the existing `_resolve_matching_inputs`, the same tolerance rule the unqualified fallbacks already use.
- `_inputs_as_dict` → `_inputs_by_name` keeps same-name inputs inside a repeat instance, so the resolver sees them instead of the dict dropping all but the last.
- Duplicates are compared by content (`_comparable_test_input`). The Galaxy-generated `_COMPOSITE_RENAMED_…` upload name (a uuid per param) is ignored, including inside collection elements, so identical `composite_data` duplicates still match. The prefix is now a named constant, `COMPOSITE_DATA_RENAME_PREFIX`.
- `test_case_validation` builds the test state inside its `try`, as dev does since #23600, so one bad test gives one per-test lint message instead of aborting validation for the whole tool.
- No XSD change: an `xs:unique` per test container rejects a working ≤ 24.1 idiom (outer repeat left out, same-name params filling successive instances), and the XSD can't be gated on profile.

</details>

<details><summary>Tests</summary>

- New `test/unit/tool_util/test_parameter_test_cases_duplicates.py`. The baseline commit adds tests that identical duplicates (top level, repeat, repeat > conditional, data params with `edit_attributes`/`composite_data` children) are tolerated, and they pass on the base.
- Conflicting duplicates are rejected through `case_state`, the lint and the test loader; below 24.2 the test still loads and runs; conflicting `edit_attributes` are rejected; identical composite collections are tolerated; `to_dict()` round-trips through JSON.
- `test_tool_linters.py`: the cutadapt shape gives exactly one `TestsCaseValidation` message per bad test, an error at 25.1 and a warning at 23.0.
- On the base lib, the new non-baseline tests fail at their own assertions (`DID NOT RAISE`, the missing lint message, and the `_Element` `TypeError` in `json.dumps`).

</details>

## Risks

This sets tool-test behavior for tool authors: from 26.1, tests with conflicting duplicate params at profile ≥ 24.2 error at load instead of running, and at least two IUC tools are affected.

<details><summary>Risk Details</summary>

- sourmash sketch and isoformswitchanalyzer tests go from "runs, possibly passing" to an error at load on a point release.
- The parsed `edit_attributes` shape changes from lxml elements to dicts. Only Galaxy's own parser and test runner read it, and the elements couldn't be serialized at all, so no API consumer could have received them.
- Below profile 24.2 the runtime still silently keeps the last value; the lint warning is the only signal there.
- The comparison ignores hand-written `edit_attributes` names that start with Galaxy's internal `_COMPOSITE_RENAMED_` prefix.
- Merging forward to dev conflicts in `case.py` (take dev's `test_case_validation`, keep the rest), `parser/util.py` and `test_tool_linters.py` (keep both sides).

</details>

<details><summary>Risk Review Advice</summary>

Decide whether erroring at load is right for a 26.1 point release, given the two IUC tools. The lint-only alternative needs a validation/runtime mode flag, and it would keep the silently wrong value at runtime. Then check that `_comparable_test_input` treats identical duplicates as equal, especially `composite_data` params and collections, so tools that repeat a param harmlessly aren't rejected by mistake.

</details>

## Context

Builds on 🔀 #22894, whose ambiguity check (`_resolve_matching_inputs`) already rejects conflicting unqualified duplicates, and mirrors the `test_case_validation` change from 🔀 #23600 (dev) for per-test lint messages. Alternative kept on 🌿[`issue_24389_duplicate_test_params_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24389_duplicate_test_params_26.1_alt_original_scope) - the duplicate fix without the parser change; it duck-types lxml elements vs dicts when comparing and leaves the `test_data` serialization bug. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented; every smaller or larger scope fails a concrete test.</summary>

- Round 1 expanded the scope to store `edit_attributes` as dicts. Round 2 recommends no further change.
- Rejected: XSD `xs:unique` (breaks a working ≤ 24.1 idiom, can't be profile-gated); raising on the legacy path below 24.2 (breaks old tools' tests); lint-only (needs a mode flag, keeps the wrong value at runtime); moving the generated composite rename out of `edit_attributes` (no bug fixed, changes upload code; a dev follow-up).
- Split options were recorded: the `edit_attributes` fix stands on its own and could target an older release.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression; new tests moved to their own module and the normalizer simplified.</summary>

- The branch's tests moved to `test_parameter_test_cases_duplicates.py`, so `test_parameter_test_cases.py` stays byte-identical to the base.
- The comparison helpers went from three functions to two, and defensive code for shapes the parser no longer emits was dropped.
- Deferred to dev: carry the generated composite rename outside `edit_attributes`, which deletes the prefix filter and `_comparable_collection`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All tests kept; one moved into the baseline commit because it passes on the base.</summary>

- All tests go through public entry points (`case_state`, `validate_test_cases_for_tool_source`, `parse_tool_test_descriptions`, `to_dict`, the `tests` lint module); no mocks.
- Red/green was checked by overwriting lib files in the worktree with each commit's version: each new test fails at its own behavior on the base, and the `try` move is covered.
- The JSON round trip stays a unit test: the bug is `to_dict`'s serialization contract, and an API test would need a new functional tool on a release branch.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding confirmed and fixed with a red-to-green test, one refuted.</summary>

- Confirmed: identical duplicate collection params with composite elements were rejected, because generated renames inside collection elements weren't ignored. The comparison now recurses into collections.
- Refuted: hand-written renames using Galaxy's internal `_COMPOSITE_RENAMED_` prefix are ignored. No real test does that, and filtering by position would depend on the parser's insertion order.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests lead; one pure refactor names the composite rename prefix.</summary>

- `f6d8ce3bcbb` adds identical-duplicate baseline tests that pass on the base; `07ba880404c` adds `COMPOSITE_DATA_RENAME_PREFIX` with no behavior change.
- The content comparison was folded into the fix commit, because without it the fix fails its own baseline tests.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? `TestsCaseValidation` "Test N: … Validation errors are [Ambiguous test parameter (<path>) specified more than once with different values]" - an error at profile ≥ 24.2 (the test also errors at load), a warning below (the test still runs with the last value).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
