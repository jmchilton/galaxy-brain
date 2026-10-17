# Implementation debrief

**STATUS: READY.** Base `release_26.1` (`b2b1e1deeee`). Head `e36468c480a`, 4 commits, pushed to `jmchilton`. The previous debrief is in `earlier_drafts/3/`.

What changed in this revision, at John's request:
- Dropped `test_subworkflow_expression_json_parameter_replacement`, since all 3 framework tests cover the same line. This was amended into the last commit.
- Wrote `pr_description.md` and `pr_titles.md`. They include a "Why adding a test feature to 26.1" section: the key lets the fix's tests be framework workflow tests, not duplicated API tests, and a key added only on dev couldn't serve a 26.1 fix.

The commits are unchanged otherwise:
1. `d388358d4a9` Collection `metadata: {name:}` in the test format.
2. `2de8ea4cc72` Helper move.
3. `d4668d93486` The fix, plus the 3 framework tests.
4. `e36468c480a` The pre-read, plus 1 unit test.

Tests: 122 workflow unit tests pass. The framework tests are unchanged since the last red/green run: all red with `run.py` reverted, all green at head.

New finding: the forward merge to 26.2/dev now conflicts in 4 files (`_models.py` move, typing, schema). That's recorded in the PR Risk Review Advice and in index.md.

Open for John: the heading wording, "Why adding…" vs "Why add…".
