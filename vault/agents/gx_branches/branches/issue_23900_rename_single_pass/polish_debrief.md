# issue_23900_rename_single_pass polish debrief (2026-10-06)

Polished at `477027c4f71`. No branch changes were needed.

## CI
- Fork CI on `477027c4f71` was mostly queued. There were two reds, both unrelated:
  - the fork-only release script;
  - Test Galaxy packages (3.14), an `ImportError` for `AuthMissingParameter` from a new `social_core` release.

## Checklist (GENERAL + WORKFLOW_RELATED)
Every item passed. The subagent compared old and new `_gen_new_name` by running them, including a 200k-template fuzz. Differences were the skip, or inserted values containing `#` or `}`.
- The debrief was stale: the parent #23918 has merged, so the SHAs and red counts are now updated.
- Red check, re-run against `dev`'s `post.py`: 8 rows fail (6 skip, including `#{}#{a}`, and 2 re-expansion). The description said 7 at first and has been corrected.

## Strengthening (one round)
Applied to the description only:
- The scope sentence was wrong. `#{a} x` is a single-placeholder template that changes, so it now names the two real cases.
- Added a legend under the table.
- Motivation: since #23918, references that used to match mid-word now render `""`, which makes the skip more likely. The reordered API test is that case.

## Left over (questions for John)
- Whitespace: `#{ a }` with no operations renders `""`, on `dev` and here, and IWC VGP5 is affected. Queued as `gx_issues/to_file/rename_reference_whitespace.md` (John, 2026-10-06).
- The `${...}` pass still expands inserted values. The issue scopes this out.
- `resolve` stays a closure.
