Fix 🎯 #24389 - a tool test that gives the same param twice with different values now errors at load instead of silently running with one of them.

On 26.1 the lint already flags these tests. 🌿[`issue_24389_lint_duplicate_test_params_26.1`](https://github.com/jmchilton/galaxy/tree/issue_24389_lint_duplicate_test_params_26.1) reports `Ambiguous test parameter (<path>) specified more than once with different values`. Test loading still keeps one value without a word: the first at top level, the last inside a repeat. The test then fails later as a confusing output mismatch (the cutadapt shape in the issue). This PR removes that split. Loading uses the same check as the lint.

***This targets `release_26.2`. 26.1 stays lint-only, as asked in the review of #24450. Until the 26.1 branch merges forward, this branch is stacked on it.***

| Test with a conflicting duplicate | 26.1 | This PR |
|---|---|---|
| Profile ≥ 24.2 | lint error; test runs with one value dropped | lint error; ***test errors at load with the same message*** |
| Profile < 24.2 | lint warning; test runs with the last value | unchanged |

***This turns two tools-iuc tests red at load: sourmash sketch (profile 25.0) and isoformswitchanalyzer (25.1). Both currently run with a silently dropped value, and the 26.1 lint already flags them.*** The fix for each is one line in tools-iuc: drop the duplicate, or give each value its own repeat instance. Tools that only get the lint warning (qiime make_emperor 18.01, hicexplorer hicAdjustMatrix 23.0, augustus 23.1) are not affected.

***Identical duplicates still load. Only params given twice with different values are rejected.***

<details><summary>Implementation</summary>

- Removes `reject_conflicting_duplicates` from `test_case_state` and `LegacyTestInputResolver`. Exact-name matches always go through `_resolve_matching_inputs`, and repeat instances keep every same-name input for the resolver to check.
- Test loading (`verify/parse.py`) already turns a `case_state` exception into an errored test at profile ≥ 24.2, and below that into a test that still runs through the legacy inputs. No change there.

</details>

<details><summary>Tests</summary>

- `test_parameter_test_cases_duplicates.py`: conflicting duplicates (top level, repeat, repeat > conditional, `edit_attributes`) are rejected by `case_state`, the lint and the test loader. At profile 23.0 the test still loads, runs with the last value, and gives the ambiguity as its `request_unavailable_reason`.

</details>

## Risks

This changes tool-test behavior for tool authors: from 26.2, tests with conflicting duplicate params at profile ≥ 24.2 error at load instead of running.

<details><summary>Risk Details</summary>

- sourmash sketch and isoformswitchanalyzer go from "runs, possibly passing" to an error at load, unless tools-iuc fixes them first. The 26.1 lint has been flagging them since the lint PR.
- `release_26.2` adds `_qualify_test_inputs` to `verify/parse.py`, which rewrites *unqualified* duplicate names to successive repeat instances before `case_state`. The behavior here is verified on the 26.1 code; it should hold for the qualified names in the issue, and the tests get re-run after the rebase onto `release_26.2`.
- Below profile 24.2 the runtime still keeps the last value without a word; the lint warning is the only signal there.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether erroring at load is right for 26.2. The alternative is to keep it lint-only, which leaves the silently wrong value at runtime.

</details>

## Context

Follow-up to 🌿[`issue_24389_lint_duplicate_test_params_26.1`](https://github.com/jmchilton/galaxy/tree/issue_24389_lint_duplicate_test_params_26.1), which adds the lint and the `reject_conflicting_duplicates` flag this PR removes. It is stacked on that branch until it merges forward to `release_26.2`. Replaces part of 🔀 #24450, split on review so the change in test behavior lands in a minor release. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The test errors at load with "Ambiguous test parameter (\<path\>) specified more than once with different values", the same text as the `TestsCaseValidation` lint.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A, one commit on top of the 26.1 branch.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
