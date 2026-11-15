Run via gpt-6.1-sol at high effort.

# Codex review: `coexecution_client_fixes`

Reviewed `git diff coexecution_dependency_dir_default...HEAD`, parent `e770845`, head `6792aa0` (`310d729` default staging image `0.15.0.0` to `0.15.0.2`; `6792aa0` TES `QUEUED` to `queued`, swapped TES client docstrings). Codex got the diff and full post-change files, plus `setup_handler.py`, `managers/util/tes.py`, `managers/status.py`, the Kubernetes, GCP and AWS Batch clients, the coexecutor Makefile, and the relevant parts of `client_test.py`, `galaxy_conf.rst`, `compatibility.yml` and `HISTORY.rst`. The prompt and output are in `/tmp/claude-1000/coexec-harden-codex-5/`. Claude Opus 5.5 also triaged the branch against the review focus.

## Codex findings

1. **P1: the default image is left out of remote-version inference.** REFUTED as a concrete failure. `LocalSetupHandler` (`pulsar/client/setup_handler.py:66`) infers the remote Pulsar version only from `destination_args["pulsar_container_image"]`. When that key is missing, the default image is used but the version source is reported as `client`. The divergence is real but Galaxy can't reach it: Galaxy's `COEXECUTION_DESTINATION_DEFAULTS` (`lib/galaxy/jobs/runners/pulsar.py:1308`) always sets `pulsar_container_image` for Kubernetes, TES and GCP destinations. Non-Galaxy callers don't read `pulsar_version`. It isn't a regression either, because the old default (`0.15.0.0`) wasn't a known tag. A fix would also need setup-handler construction reordered, because `BaseJobClient.__init__` builds the handler before the coexecution subclass sets `pulsar_container_image`. Codex's other point, that the membership test was trivial, was addressed by finding 2 below.

## Own triage (review focus)

2. **Trivial constant-vs-constant tests in the TES test file.** CONFIRMED, fixed in `fb304ef`. `test_default_staging_image_is_published` compared two module constants. It is now `test_coexecution_client_defaults_to_published_staging_image` in `test/client_test.py`, next to the staging-image version tests. It builds a client without `pulsar_container_image` and checks the image the client actually uses. The same commit drops the history comment ("0.15.0.0 was never pushed") from `pulsar/client/coexecution.py:17`; the test now enforces that the tag is published.
3. **Parallel TES state map duplicates an existing abstraction.** CONFIRMED, fixed in `77651c5`. `tes_state_is_complete` was a second map that had to agree with `tes_state_to_pulsar_status`, and both lacked `QUEUED`. It is removed. `raw_check_complete` (`pulsar/client/tes.py:130`) now uses `manager_status.is_job_done` on the mapped status, as the Kubernetes polling client does (`kubernetes.py:223`). The result is identical for every `TesState`, and an unknown state now logs a warning once instead of twice. The map-function unit test became `test_tes_poll_reports_queued_task_as_queued`, which drives `TesPollingCoexecutionJobClient.raw_check_complete` with a stub TES client returning a `QUEUED` task. Against the parent it fails with `failed`/`true`; with the fix it passes. The existing poll/cancel test no longer patches the removed function.
4. **TES `QUEUED` maps to `queued`, while GCP's `QUEUED` maps to `preprocessing`.** No change. `queued` matches the Pulsar status definition, and Galaxy's `_update_job_state_for_status` treats both as non-terminal and not running. The resulting `queued` then `preprocessing` order for TES `QUEUED` then `INITIALIZING` comes from the existing `INITIALIZING` mapping and has no visible effect.
5. **Pre-existing sibling problems outside this branch.** NEEDS-DECISION, possible follow-up branch or issue:
   - The GCP state maps (`pulsar/client/gcp.py:183-216`) map `SCHEDULED` to `complete`. They have no `SUCCEEDED`, so a successful GCP Batch job polls as `failed`.
   - `TesPollingCoexecutionJobClient` has no `full_status`, which the Kubernetes and GCP polling clients define.
   - Galaxy's TES and GCP runners use MQ, so stock Galaxy reaches none of these polling paths.
   - The implementation debrief's note that `aws_batch.py` has swapped docstrings is wrong; they are correct there.

## Commits added

- `fb304ef` Check the default staging image through a coexecution client
- `77651c5` Derive TES task completion from the Pulsar status it maps to

`pulsar/client/coexecution.py`, which `coexecution_compact_launch` also modifies: the only hunk touched here is removing the comment line above `PULSAR_CONTAINER_IMAGE` (line 17). The launch-encoding code is unchanged.

## Gate

- `make lint`: OK.
- `.venv/bin/isort --check pulsar test`: OK.
- `.venv/bin/pytest test/tes_test.py test/client_test.py test/client_k8s_test.py test/coexecution_manager_test.py`: 54 passed.
- `.venv/bin/mypy` on the touched files: no issues. `.venv/bin/mypy pulsar test` reports 1 error, in the untouched `pulsar/scripts/config.py:25` (`virtualenv = None`). It is environment-specific and unrelated to this branch.

Final head: `77651c5`.

READY WITH NOTES
