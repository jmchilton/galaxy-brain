# Implementation debrief: `issue_23900_rename_single_pass`

Fixes [#23900](https://github.com/galaxyproject/galaxy/issues/23900). Originally stacked on `issue_23896_rename_input_segments`; that merged as #23918 on 2026-10-05, so the branch now sits directly on `dev`. Commits: `50890cc4099` (the fix) and `477027c4f71` (review follow-ups). Pushed to `jmchilton`.

## Change

- `lib/galaxy/job_execution/actions/post.py`: the cursor `while` loop becomes `RENAME_INPUT_REFERENCE_PATTERN.sub(resolve, new_name)` with regex `#\{([^}]*)\}`. The body of `resolve` is the old loop body, unchanged: lookup, segment fallback, then the `basename`/`upper`/`lower` operations.
- Dropped the `TODO: Replace all matching code with regex` comment and the "support multiple #{name}" suggestion, since both are done now. Reworded the stale "if statement" comment.
- Unit tests:
  - the 5 bug rows from the issue;
  - re-expansion rows (inserted values are now left literal);
  - parity rows for unclosed `#{`, nested `#{a#{b}}` (→ `}`), whitespace with and without operations, `#{}`, and repeated placeholders;
  - a new test for the `${...}` `replacement_dict` pass.
- API test: the parent's template is reversed to `#{input1}#{fastq_input1 | basename} suffix`, so it now covers both fixes at once.

## Verification

- Red, unit: 8 rows fail on `dev`'s `post.py` (6 skip rows, including `#{}#{a}`, and 2 re-expansion rows; re-checked 2026-10-06); every parity row passed.
- Red, API: with the old `post.py`, a real workflow run named the output `#{fastq_input1 | basename} suffix`.
- Green: 43 unit tests in `test/unit/job_execution/`, and both API tests `test_run_rename_ignores_partial_input_segments[_on_mapped_collection]` (run together locally). ruff, black, isort and pre-commit are clean, and mypy shows nothing in the changed files.
- Review subagent: nothing blocking. It compared old and new on 16 edge cases plus 200k random templates. Every difference was the skip or an inserted value containing `#` or `}`. Its minor findings (test ids, gaps, comment, constant name) are applied.
- Fork CI not seen yet.

## Left out

- The `${...}` `replacement_dict` pass still runs over inserted values, so an input named `foo${k}` gets expanded. That was true before, and the issue scopes it out. Folding it into the same single pass would make a small follow-up.
- `resolve` is still a closure. The reviewer suggested moving it to a module-level `_resolve_input_reference`; I skipped that to keep the diff small.
- The worktree `.venv` is a symlink to `~/projects/repositories/galaxy/.venv` (gitignored).
