# #24635 round 1 — default review

Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) · model Opus 5.5 · effort medium · reviewed `9ee89b52d9` (delta from round 0 `64dad7223ea`: "Reject disallowed containers next to the execution role recheck").

## Verdict

The new commit does what the round-0 P3 asked. The check now sits in `MinimalJobWrapper.prepare` next to the #24607 role recheck and raises `InsufficientPermissionsException`. `ContainerNotAllowedError` is gone, and `BaseJobRunner.prepare_job` already fails that exception directly. Every non-Pulsar runner (local, cli/drmaa/pbs, condor/htcondor, k8s, aws, chronos, godocker, gcp_batch, tasks) calls `prepare_job` -> `prepare()` before `_find_container`, so they reject before resolving. One ordering gap remains on Pulsar, described below. A detail for the coordinator is in a private note.

## Findings

### P2 1: Pulsar `remote_container_handling` resolves the container before `prepare()` rejects it

`PulsarJobRunner.__prepare_job` calls `self._find_container(job_wrapper)` for `remote_container_handling` destinations *before* `job_wrapper.prepare(**prepare_kwds)` (pulsar.py ~L584-599). At `64dad7223ea` the allowlist check was at the top of `_find_container`, so on this path it ran before any resolution. Now resolution runs first, using the declared container of a tool that is about to be refused. If resolution raises (e.g. a resolver cannot fetch the disallowed image), the job goes through the generic `except Exception` -> `fail_or_resubmit` path. It is then resubmitted or failed with a generic error rather than the allowlist message. The new unit test `test_rejected_job_fails_without_resubmission` changed `destination_params` from `{"remote_container_handling": True}` to `{}`, so this path is no longer exercised.

Fix: move the `if remote_container_handling: remote_container = self._find_container(job_wrapper)` block below the successful `prepare()` (nothing in `prepare_kwds` depends on it). Restore `remote_container_handling: True` in the test and give the runner a `_find_container` that fails if called.

### P3 1: The prepare-time check re-implements the manager's allowlist check inline

`MinimalJobWrapper.prepare` builds the rejection message itself. That copies `DynamicToolManager.ensure_container_allowed` (the same text, raised as `RequestParameterInvalidException`). The role recheck right above it delegates to `dynamic_tool_manager.ensure_can_use_unprivileged_tool(job.user)`. Applying the same pattern, e.g. a `dynamic_tool_manager.ensure_tool_containers_allowed(tool)` that raises `InsufficientPermissionsException`, would keep one message and one rule next to its sibling. This sharpens round-0 P2 1, which the move did not resolve.

## Notes (no action)

- Pulsar no-resubmit change: the new `except InsufficientPermissionsException` covers only what `prepare()` raises. In the `prepare()` path the only sources are the role recheck (`managers/tools.py:125`) and this container check. Both are deterministic, and the change brings Pulsar in line with `BaseJobRunner.prepare_job`, which already failed them directly. The role recheck no longer resubmits on Pulsar either, which is the right behaviour. `ParameterValueError` and other exceptions still go through `fail_job` as before. The early `return` skips the outer `fail_or_resubmit`, so the job is not failed twice. `job_wrapper.fail(..., exception=False)` matches the base runner.
- Test coverage of the deleted unit file (`test/unit/app/jobs/test_user_defined_tool_container_allowlist.py`, 77 lines): its three cases (disallowed raises, allowed proceeds, non-user tools skipped) are replaced by three cases in `test_job_wrapper_user_tool.py` on the existing wrapper harness. The case "resolved container differs from declared" is no longer tested, but the check no longer touches resolution, so that case is moot. The integration test `test_job_of_stored_tool_with_disallowed_container_fails` still covers the end-to-end local-runner message in `misc_info`. No net loss, apart from the Pulsar remote path in P2 1.
- `TaskWrapper.prepare` overrides `prepare` and does not run either recheck. Parallelized user-defined tools are not a real path, so this is not flagged.

## Round-0 verified findings at `9ee89b52d9`

| Round 0 | Status |
|---|---|
| P2 1 duplicated allowlist check/message (manager vs runner) | Still applies: the duplicate moved to `jobs/__init__.py` (see P3 1 above) |
| P2 2 job-time guard tested via heavy `BaseJobRunner` mocks | Mostly resolved: tests now use the existing `JobWrapper` test harness. Allowed and non-user-tool cases are still unit-only |
| P2 3 Pulsar refusal path lacks integration coverage | Still applies (unit test only, and remote-container path now untested) |
| P2 4 `_store_tool_row` copy-pasted between integration files | Still applies (untouched) |
| P3 1 rejection placed/handled differently from #24607 role recheck | Resolved by this commit |
| P3 2 linter `.strip()` hides whitespace | Still applies (untouched) |
| P3 3 workflow import of disallowed user tool untested | Still applies (untouched) |
| P3 4 `biocontainer_tag_built` hardcodes quay.io | Still applies (untouched) |
| P3 5 `ContainerAllowlist` two "entries" attributes | Still applies (untouched) |

Review branch `pr_24635_review_0` commits `ededf3cc033` (edits the now-deleted unit file) will conflict, and `c8239cf7070` (Pulsar integration test written against the old refusal arm) may need rework against the new head.
