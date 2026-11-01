Run via Claude Opus 5.5 at low effort.

# Test challenges debrief: issue_24350_has_line_matching_docs_26_1

This was a fresh pass after the re-scope. I re-ran everything and did not rely on earlier results. **No test changes were needed, and I made no commits.**

## Tests on the branch

Both tests are in `test/unit/tool_util/verify/test_asserts.py`. Only `f12e7955aec` ("Baseline tests") and its fixups `458d534990c` and `d686e7a4bf5` touch the file in the baseline series. `16cfad00004` then flips two cases in it.

- `test_has_line_matching_anchors_expression_to_whole_line` has 8 parametrized cases.
- `test_has_text_matching_searches_whole_output` has 2 cases.

## Challenges

- **Testing the implementation directly?** No. Each case calls the public `assert_has_line_matching` or `assert_has_text_matching` with an expression and an expected `n`. They pin down user-visible regex semantics, which is exactly what the docs describe, rather than the internal wrap string.
- **Silly or redundant?** No. Each case backs a specific doc claim: a bare prefix matches nothing, explicit anchors are redundant, grouped alternation works, ungrouped alternatives must each match a whole line, and `has_text_matching` is unanchored and not multiline. One case, `("I\t.*|II\t.*", 3)`, gives the same count under the old and new wrap. I kept it as the positive example of the form the docs recommend; the two flipped cases already pin down the fix.
- **Mocks, SimpleNamespace, or design changes?** None apply. These are pure functions on a string fixture, and the parametrization follows `writing_tests.md`.
- **Is there a better layer (API, integration, tool XML functional, E2E)?** No. These are semantics of a pure function, so a unit test is the cheapest and most precise layer. A functional tool test would add server cost and add no coverage. There is no UI, so no E2E test is needed.

## Baseline and fail-without-fix checks

I ran both checks in a temporary `git worktree` in the scratchpad, using the branch's `.venv`. I removed the worktree afterwards, and `git status` in the branch worktree is clean.

1. **Baseline cases pass on `origin/release_26.1`.** I took the test file at `39efe232c41`, which is the state after the baseline commit and all its fixups, before `16cfad00004`, and ran it against `origin/release_26.1` lib: **127 passed**.
2. **The flipped cases fail without `16cfad00004`.** I ran the HEAD test file against lib at `16cfad00004^`: **2 failed, 126 passed**. Both failures are the intended `AssertionError` from the count assertion, not import or fixture errors:
   - `[I\t|II\t-0]`: "Expected 0+-0 lines matching ... found 2"
   - `[I\t|\t5-0]`: "Expected 0+-0 lines matching ... found 3"
3. **At HEAD:** 128 passed.

I did not run codegen.
