Fix 🎯 #23884 - the tool upgrade advisor warns about bare `structured_like` names at profile 18.01, but they only break at 26.0, where it has nothing to say.

Advisor output for `test/functional/tools/collection_paired_conditional_structured_like.xml` (`structured_like="input1"`, with `input1` inside conditional `cond`):

| Target | `dev` | This PR |
| --- | --- | --- |
| 24.2 | 💬 `18_01_consider_structured_like`: "must reference inputs in a fully qualified manner" (the tool works fine at 24.2) | no `structured_like` advice |
| 26.0 | ❌ `Target upgrade version is too new for this script` | ⛔ `26_0_fix_unqualified_structured_like`: *Output 'list_output' uses structured_like='input1', use the qualified name 'cond\|input1'.* |

💬 consider, ⛔ must_fix, ❌ advisor raises.

The runtime gate is `Version(profile) < Version("26.0")` in `tools/execute.py` (`sliced_input_collection_structure`): below 26.0 bare names keep resolving, and from 26.0 a mapped-over run fails with `Failed to find referenced collection in inputs.` The new advice fires for bare references that break at 26.0, plus partially qualified ones (`outer|input1`), which already fail on map-over at any profile - in both cases only for dataset inputs nested in conditionals or sections, outside repeats.

***This changes only the upgrade advisor's output; tool runtime behavior is untouched. The wrong `18_01_consider_structured_like` code is dropped.***

***Fixing the 26.0 half meant raising the advisor past 24.2, so this PR also adds 26.1 and 26.2 advice for every profile gate on `dev`. Without that, the advisor would still refuse any 26.1/26.2 tool or target.***

<details><summary>26.1 / 26.2 advice added</summary>

| Code | Level | Gate |
| --- | --- | --- |
| `26_1_fix_invalid_citation` | must_fix | invalid citations fail tool load (#22799) |
| `26_1_fix_empty_multiple_test_value` | must_fix | `value=""` on a multiple select test param (#22894) |
| `26_2_consider_optional_boolean_unset` | consider | optional boolean without `checked` starts unset (#23414) |
| `26_2_consider_tool_provided_metadata` | consider (niche) | `galaxy.json` only read when the tool opts in (#23404) |
| `26_2_consider_tabular_assertion_separator` | consider | `has_n_columns` without `sep` splits on the datatype delimiter (#23593) |

`latest_supported_version` is now 26.2. `validate_test_cases_for_tool_source` gains a `profile` kwarg so 24.2 and 26.1 advice validate at their own profile.

</details>

<details><summary>Advisor bugs fixed along the way (each red→green)</summary>

- 21.09 `from_work_dir` whitespace advice was added with code `""`, raising `KeyError`; now `21_09_fix_from_work_dir_whitespace`.
- `_find_all` ignored its xpath and always searched `.//data[@from_work_dir]`, so the 23.0 optional-text advice could never fire.
- Migrations whose `to_version` equals the tool's profile were not skipped (`<` → `<=`), so a 24.2 tool got 24.2 advice.
- 24.2 test-case validation ran at the hardcoded latest profile ("26.1") rather than 24.2, misattributing 26.1 failures to 24.2.

</details>

<details><summary>Shared code instead of copies</summary>

Three leading, behavior-preserving commits let the advisor reuse the linter and parser logic:

1. The output linter's input-reference walker moves to `linters/_util.py` (`InputReferences`), used by both the linter and the 26.0 advice.
2. `writes_galaxy_json()` in `linters/_util.py` replaces the output linter's inline check.
3. `tool_requests_provided_metadata()` / `output_uses_tool_provided_metadata()` move from a closure in `AbstractTool` to `parser/output_objects.py`, used by `AbstractTool` and the 26.2 advice.

</details>

## Risks

Mostly a two-way door: advice text and codes are easy to revise. The one compatibility change is the advice-code set.

<details><summary>Risk Details</summary>

- `18_01_consider_structured_like` is removed; anything keyed on that code (e.g. planemo output parsing) stops seeing it.
- Tools already at a profile no longer get that profile's advice (`<=` skip).
- `upgrade/` now imports from `linters/_util.py`, a layering leak until the walker moves to `parser/` (planned in #23891/#23902).
- `validate_test_cases_for_tool_source` has overlapping `use_latest_profile` and `profile` modes; `profile` wins when given.

</details>

<details><summary>Risk Review Advice</summary>

Check the 26.x advice messages match the behavior of the PRs they link, particularly the 26.0 "nested in a conditional or section, outside repeats, dataset inputs only" filter against `execute.py`. The three refactor commits should read as pure moves.

</details>

## Context

Builds on 🔀 #22432 (the 26.0 `structured_like` gate). Alternative kept on 🌿 [`upgrade_advice_structured_like_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/upgrade_advice_structured_like_alt_original_scope) - only the 26.0 `structured_like` fix, with `latest_supported_version` 26.0 and no 26.1/26.2 advice or advisor bug fixes. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep: covers both halves of the issue and every 26.x profile gate on <code>dev</code>.</summary>

- An earlier evaluation recommended expanding from the 26.0 fix to 26.1/26.2 advice; that's the current scope.
- Left out: advice for top-level names shadowed by nested inputs (rare, good follow-up), two-deep bare references (the linter already errors), deriving `use_latest_profile` from the advisor (touches callers outside the advisor), and moving the walker to `parser/` (planned elsewhere).
- Splits cleanly into refactor / 26.0 fix / bug fixes / 26.x advice if reviewers prefer smaller PRs.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve with one structural fix, applied: one shared "tool requests provided metadata" helper.</summary>

- Not acted on: the `linters._util` layer leak (planned move), overlapping `use_latest_profile`/`profile` modes, 26.0 using `findall` directly.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Dropped a test of a private helper and replaced a misnamed duplicate with a real 26.2 separator test.</summary>

- The `_find_all` xpath fix is covered behaviorally by the 26.2 boolean and `has_n_columns` tests.
- Remaining tests drive `advise_on_upgrade` on real tool XML and fail on `dev` at their own assertions.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three findings, all confirmed and fixed red→green.</summary>

- 24.2 advice validated test cases at the latest profile; now at 24.2.
- 26.0 advice ignored parameter type; now dataset inputs only, matching the linter.
- `galaxy.json` detection missed `configfile filename="galaxy.json"`; now shares the linter's helper.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Three behavior-preserving extractions lead; feature commits use the shared helpers from the start.</summary>

- Walker move, `writes_galaxy_json()`, `tool_requests_provided_metadata()`. Tests pass at each refactor commit.

</details>

## John's Checklist

<details><summary>Checklist Details</summary>

- [x] What does the user see when it fails? Upgrade advice naming the fix (e.g. "use the qualified name 'cond|input1'"), with a level and a PR link.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They run the advisor on real tool XML, with negatives for qualified names, repeats, non-dataset params and tools already at the target profile.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. Refactors lead; each fix carries its red→green test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
