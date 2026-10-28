Fix 🎯 #24485 - collection output tests silently ignore `count`, `element_count` and `max` of 0.

Since 26.0, a tool or workflow test that asserts an empty output collection passes no matter what the collection holds. `verify_collection` checks the expected size by truthiness, so 0 is treated as "not set":

| Test assertion | Actual collection | Before | After |
| --- | --- | --- | --- |
| `<output_collection count="0">` (tool XML) | 1 element | passes 😬 | `expected to have 0 elements, but it had 1.` ✅ |
| `element_count: 0` (workflow / Planemo test YAML) | 1 element | passes 😬 | `expected to have 0 elements, but it had 1.` ✅ |
| `<output_collection max="0">` | 1 element | passes 😬 | `expected to have at most 0 elements, but it had 1.` ✅ |
| any of the above | empty | passes | passes |

Test authors are already working around it (proving emptiness through a derived dataset with `has_size: 0`, galaxyproject/foundry#712).

The fix compares `count`, `min` and `max` against `None`, as `release_25.1` did for `count` and as the nested element and discovered-dataset checks in the same module already do. ***This is a 26.0 regression (from `6178df3dcff`, which added `min`/`max` for test output collections), so the target is `release_26.0`; `release_25.1` is unaffected.***

***Expect some existing tool and workflow tests that assert 0 on non-empty collections to go red after this - those tests were wrong all along and would have failed on 25.1 too.***

## Risks

Risks are minimal - test verification gets stricter for one value (0) and returns to 25.1 behavior, so nothing locks Galaxy into a hard-to-change choice (a two-way door).

## Context

Builds on `6178df3dcff` (min/max for test output collections, 26.0). Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented; these three checks are the only places 0 is dropped.</summary>

- Re-checked sibling code on `release_26.0`: `verify_output` discovered-dataset checks, nested element checks, `TestCollectionOutputDef` parsing, `parser/xml.py`, test linters, XSD and `tool_util_models` all already handle 0 correctly.
- Fixing only `count` (the issue's headline) was rejected: it would leave the identical `max="0"` bug in the adjacent lines.
- Deferred to `dev`: a shared count/min/max helper across the three near-duplicate blocks, and a linter for contradictory bounds. Neither fixes a bug.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Kept the unit tests; moved two vacuous pass cases into the baseline commit.</summary>

- `test/unit/tool_util/test_verify_collection.py` calls the public `verify_collection` and asserts on the user-facing messages; the only stub is a no-op `verify_dataset`.
- `count="0"` and `max="0"` on an empty collection passed before the fix (the check was skipped), so they moved to the baseline commit as guards against over-correction.
- The fix commit's 3 new cases fail at their own assertions on `release_26.0` and pass with the fix.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found nothing.</summary>

- Reviewed `interactor.py`, the collection test-output parsers, and the workflow framework tests using `empty_list` / `filter_null`.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>None; the fix is three <code>x and</code> → <code>x is not None and</code> substitutions.</summary>

- History is already baseline tests, then fix.

</details>

## John's Checklist

<details><summary>Checklist Details</summary>

- [x] What does the user see when it fails? The test author gets `AssertionError: Output collection 'out': expected to have 0 elements, but it had 1.` (or `at most 0 elements`) instead of a silent pass.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They call `verify_collection` and match its messages.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `Baseline tests for verify_collection size checks` (12 cases) is green on `release_26.0`.
- [x] Are the comments free of excess archeology? Yes. The diff adds no comments.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/tool_util/test_verify_collection.py`: the `count=0`, `max=0` and `element_count=0` on one-element cases fail on `release_26.0` and pass with the fix; the other 12 cases pass on both.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
