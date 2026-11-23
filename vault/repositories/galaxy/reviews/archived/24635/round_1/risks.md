<!-- gx_risk_assessment via Opus 5.5 (claude-opus-5-5) at low effort; reviewed commit 9ee89b52d9 (delta from 64dad7223ea) -->
The new commit lowers the risk a little and changes no contract. The container check moves out of command building into `JobWrapper.prepare`, next to the execution-role recheck, and raises `InsufficientPermissionsException` instead of a runner-private error. The option name, entry grammar and restrictive default, which are the one-way-door concerns from the last round, are unchanged.

<details><summary>Risk Details</summary>

- The check now runs once per job in `prepare`, before the command line is built. It covers every runner that prepares through `BaseJobRunner.prepare_job` or Pulsar's `job_wrapper.prepare`, so there is no longer a runner-specific error to catch. This removes the risk of a runner path that builds commands without catching `ContainerNotAllowedError`.
- The behavior change: on Pulsar, an `InsufficientPermissionsException` raised at prepare time now fails the job directly through `job_wrapper.fail` and skips `fail_job` resubmission rules. This also applies to the owner-role recheck from #24607. Before, a revoked role on Pulsar went through `fail_job` and could be resubmitted. Admins who rely on resubmission for those failures would see a change, but resubmitting would fail the same way, so the impact is small. Pulsar now matches the base runner's handling.
- Pulsar's `ParameterValueError` still goes through `fail_job` (only its log message changed), so on Pulsar the two "rejected while preparing" exceptions are now handled differently.
- The integration test `test_user_defined_tool_container_allowlist.py` (77 lines) was removed and replaced by unit tests in `test_job_wrapper_user_tool.py` and `test_pulsar_runner.py`. End-to-end coverage that a disallowed container fails a real job is now thinner on a release branch.
- It still checks declared containers, not resolved ones, and still only for `tool_type == "user_defined"`. This is unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that skipping resubmission for prepare-time permission failures on Pulsar, including #24607's role recheck, is intended and acceptable for release_26.2. Decide whether losing the integration test is acceptable or whether one job-level test should stay. The release-target and default-restrictiveness questions from round 0 remain open.

</details>
