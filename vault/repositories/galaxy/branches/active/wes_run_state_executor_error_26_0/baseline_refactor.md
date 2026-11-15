Run via Claude Opus 5.5 at high effort.

One behavior-preserving commit, `525361a1b32` "WES: map invocation states to WES states in one helper", now sits on the parent head `67305c6d0a1`. It adds `_invocation_wes_state(invocation)` with the old mapping and routes `get_run_status`, `list_runs` (through its run-summary builder) and `get_run_log` through it. The EXECUTOR_ERROR commit is rebased on top as `ec656e83ae7`. Its tree is identical to the old head `eaa927c3cad` (`git diff eaa927c3cad ec656e83ae7` is empty), and its message is unchanged.

## What moved

The refactor commit holds only the three call-site replacements and the new helper, whose body is `GALAXY_TO_WES_STATE.get(invocation.state or "", State.UNKNOWN)`. That is the expression each call site used, so no endpoint's behavior changes.

The behavior commit's `services/wes.py` diff is now just the rule: `UNSUCCESSFUL_JOB_STATES`, the completed-with-failed-jobs branch inside the helper, and the `joinedload(WorkflowInvocation.completion)` in `list_runs`. Docs, the three API tests and the unit query test stay in that commit, because all of them depend on the new rule.

## Why it is worth a commit on a release branch

- It makes the behavior commit reviewable as the rule change, with no call-site noise.
- It holds whichever rule John chooses. The branch is parked on decision D3 (narrow EXECUTOR_ERROR to errored workflow outputs or paused runs). Any rule that looks beyond `invocation.state` needs this one place to live, so the refactor commit stays valid if the behavior commit is reworked or dropped.
- The risk is negligible. It is a pure extraction in one module, and the parent's existing tests cover it.

## Considered and not done

- **Splitting out the `list_runs` query reformat.** Wrapping the one-line query in parentheses only matters because the behavior commit adds `.options(joinedload(...))`. Without the joinedload, black would put it back on one line, so it has no standalone form.
- **Moving `UNSUCCESSFUL_JOB_STATES` into the refactor commit.** Nothing on the baseline would use it. It is part of the rule.
- **Anything in parent code.** Parent commits are untouched.

## Verification

Refactor commit `525361a1b32`:
- `black`, `isort`, `flake8`, `ruff check` and `mypy` on `services/wes.py`: clean. (`ruff format --check` reports differences, but it does so on the parent file too. Galaxy formats with black and isort per `tox.ini`.)
- API tests, one per pytest invocation, one for each call site: `test_wes_state_mapping` (run status), `test_wes_list_runs` (run summary) and `test_wes_get_run` (run log). All passed.

Behavior commit `ec656e83ae7`:
- `black`, `isort`, `flake8`, `ruff check` and `mypy` on `services/wes.py`, `test_wes.py` and `test_wes_service_queries.py`: clean.
- `PYTHONPATH=lib pytest test/unit/webapps/test_wes_service_queries.py`: passed.
- API tests, one per invocation: `test_wes_state_mapping_failed_job`, `test_wes_state_mapping_failed_job_in_subworkflow`, `test_wes_state_mapping_paused_job` and `test_wes_state_mapping`. All passed.

The branch was restructured locally and not pushed. The coordinator needs to force-push it over `eaa927c3cad`.

## Parent findings

None.
