# invocation_no_add_to_history_false_26.1

Status: `branches_implemented_needs_ci`. Base: `release_26.1` at `d405ebc1f4c`. Created 2026-10-15 at John's request.

Backport of the two server fixes from [invocation_no_add_to_history_false](../invocation_no_add_to_history_false/index.md) (26.2): honor explicit `no_add_to_history: false`/`null`, and accept a `null`/`{}` `ds_map` next to `inputs`. The bugs date to 2024 and are exposed by the published 26.1.1 api-client types. The generator and schema-description commits stay on 26.2 only.

Commits: `3ed01f6e317` (cherry-pick of `9e160f5cbde`; the test-file conflict pulled in 26.2-only neighboring tests, resolved by keeping only `test_run_no_add_to_history`), `9ef7c304d7c` (clean cherry-pick of `33be985c49e`). Diff vs base: `run_request.py` +2/-2, `test_workflows.py` +52.

Local API: `test_run_no_add_to_history` and `test_run_inputs_with_ds_map`, 8 passed on `release_26.1`. Fork CI pending.

Worktree: `~/projects/worktrees/galaxy/branch/invocation_no_add_to_history_false_26.1` (created with `git worktree add`, `.venv` symlinked to the main clone's).
