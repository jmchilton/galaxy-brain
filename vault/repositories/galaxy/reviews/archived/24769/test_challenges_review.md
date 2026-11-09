# Test challenges review: #24769

- Profile: `gx_test_challenger`
- Model: Opus 5.5
- Effort: low
- Reviewed commit: `b4d1c730ac79`

The new unit test is at the right layer, uses no mocks, and catches the regressions the PR claims. Details and mutation results: [test_challenges_debrief.md](test_challenges_debrief.md).

## P3 1: New test does not cover restoring from the backup

The bug's harm happens in the restore branch, which replaces `$dir` with `_$dir` on rerun. The new test stops once `_configs` is created, and no other test references this template. Replacing the restore branch with a no-op still passes the test's steps and assertions (replayed in a scratch script, since the worktree has no `.venv`).

Extend the test: after the final assertion, empty `configs/registry.xml`, rerun `_run_prepare_dirs`, and assert `configs` matches its pre-damage tree. Broaden the test name to fit.
