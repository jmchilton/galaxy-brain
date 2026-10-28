Run via Claude Opus at high effort.

# Retarget to release_26.2

John approved retargeting from `dev` to `release_26.2` on 2026-10-28. The rebase was clean, the patches are unchanged, and every rerun test and static check passed. The new head is `a812cad3`, force-pushed with lease to `jmchilton` (it replaced `48aa65fb`).

## Rebase

- `git rebase --onto origin/release_26.2 fd43a3c6` applied all 3 commits with no conflicts, onto `origin/release_26.2` at `0902830b`.
- `git range-diff` reports all 3 patches as identical (`=`):
  - `4d0140f9` became `8d8a842b` (Collapse cwl_style scalar and scalar-list branches into one predicate).
  - `b6f94767` became `57c30924` (Let staging leave parameter input values unstaged).
  - `48aa65fb` became `a812cad3` (Use parameter_input_keys in WorkflowPopulator cwl_style staging).
- The diff against `origin/release_26.2` is still 4 files, 60 insertions and 17 deletions.
- Restore point: local branch `backup/staging_workflow_parameter_lists_pre_retarget_26_2` at `48aa65fb`.

## Tests (at `a812cad3`, run one at a time)

| Test | Result |
|---|---|
| Unit: `test/unit/tool_util/test_cwl_util.py` + `test_staging.py` | 25 passed |
| Framework workflows: `multiple_text`, `multiple_integer_into_data_column` | 2 passed, on one server |
| API: `test_workflows.py::TestWorkflowsApi::test_run_subworkflow_with_boolean_parameter_in_when_condition`, with the `run_tests.sh -api` tool conf | 1 passed |

The DB-migrated-ahead problem didn't come up. The test harness uses a temporary sqlite DB, and the worktree's `database/` holds only `info.txt`, so nothing was moved.

## Check branch (GX_PROCESS_CHECK_BRANCH)

- **Format:** `make format` (isort + black) changed nothing. `ruff`, `black --check` and `isort --check-only` are clean on the 4 changed files.
- **mypy:** I ran it on the 4 changed files from `lib/`, the way `make mypy` does (`cd lib`), and on a temporary `origin/release_26.2` worktree.
  - Both report the same single unrelated error, in a `tool_shed` templates module. The branch adds no errors.
  - The run from the worktree root gave misleading results (755 vs 754 errors). The new test function was flagged as untyped, but only because, run from the root, the module names (`lib.galaxy...`, `test.unit...`) miss the per-module sections in `mypy.ini`. Those sections exempt tests and legacy modules from the global `disallow_untyped_defs = True` that 26.2 sets. When run from `lib/`, it is clean.

No fixes were needed.

## Follow-ups for the coordinator

- The branch record `index.md` still has `upstream_base_branch: dev`, and its Open PR compare link points at `dev`. Both should become `release_26.2`.
- The planemo#1744 dependency note ("first release after 26.2") should change to 26.2, per the scope evaluation.
- Fork CI on `a812cad3` hasn't been checked yet.
