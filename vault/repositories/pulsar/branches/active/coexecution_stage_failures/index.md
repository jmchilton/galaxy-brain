---
upstream_base_branch: master
parent_branch: coexecution_publish_running
child_branches: coexecution_dependency_dir_default
related_records:
  - pulsar/branches/coexecution_publish_running
  - pulsar/branches/coexecution_dependency_dir_default
  - pulsar/branches/coexecution_client_fixes
  - pulsar/branches/coexecutor_image_pycurl
  - pulsar/branches/coexecution_stage_out_failures
  - galaxy/branches/tes_task_state_polling
---
# Fail the TES task and tell Galaxy why when coexecution staging fails

- [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecution_publish_running...jmchilton:pulsar:coexecution_stage_failures?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_stage_failures)

## Status

Implemented at `954ab40` during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); verified with docker against a throwaway RabbitMQ and end to end in the demo (a stage-in failure fails the Galaxy job in 6-8 s with the error in its stderr: `runs/gaps/stage-in-failure/` in `~/projects/repositories/galaxy-wes-tes`).

No PR.

Fork CI for `954ab40` not checked yet. Pre-restack `37a1e6d` was red on one test because CI points `files_server()` at a standing external job files server; the test-only commit (now `954ab40`) fixes it, and since the 2026-11-14 restack every child carries it.

## Notes

- Commits (restacked 2026-11-14): `3dd2701` (non-zero exit from `pulsar-submit --no-wait` and `pulsar-finish` on failure) and `8d2e739` (the failed status carries the preprocessing error as `stderr`; it was written to a file nothing reads), `954ab40` (test fix for CI).
- The stage-out counterpart (the upload error in the `failed` status's `stderr`) is [`coexecution_stage_out_failures`](../coexecution_stage_out_failures/index.md).
- `pulsar-submit --wait` deliberately keeps exiting 0: Kubernetes Jobs replace failed pods (`backoffLimit` defaults to 6) and would rerun the job.
- Doesn't cherry-pick onto master alone: both commits touch `submit_util.py` and `test/submit_util_test.py` from `5e3de24`. With `5e3de24` it applies cleanly.
- The demo image is built from the stack tip, [`coexecution_stage_out_failures`](../coexecution_stage_out_failures/index.md).

## Review materials

- [Implementation](implementation_debrief.md)
- [Docker verification output](docker_verification/output.md), from [verify.sh](docker_verification/verify.sh)
