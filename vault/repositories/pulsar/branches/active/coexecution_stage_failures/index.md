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

Implemented at `a3f8c72` during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); verified with docker against a throwaway RabbitMQ and end to end in the demo (a stage-in failure fails the Galaxy job in 6-8 s with the error in its stderr: `runs/gaps/stage-in-failure/` in `~/projects/repositories/galaxy-wes-tes`).

No PR.

Fork CI on `37a1e6d`: `pulsar` red, one test (`test_finish_output_staging_failure_...`) because CI points `files_server()` at a standing external job files server; fixed by the test-only commit `a3f8c72` (reproduced and verified locally with an external server). The children (`coexecution_dependency_dir_default`, `coexecution_client_fixes`, `coexecutor_image_pycurl`) still carry the old test and stay red until the stack is rebased; `coexecution_stage_out_failures` has the fix cherry-picked (`3b2cde8`).

## Notes

- Commits: `a3d83f6` (non-zero exit from `pulsar-submit --no-wait` and `pulsar-finish` on failure) and `37a1e6d` (the failed status carries the preprocessing error as `stderr`; it was written to a file nothing reads), `a3f8c72` (test fix for CI).
- The stage-out counterpart (the upload error in the `failed` status's `stderr`) is [`coexecution_stage_out_failures`](../coexecution_stage_out_failures/index.md).
- `pulsar-submit --wait` deliberately keeps exiting 0: Kubernetes Jobs replace failed pods (`backoffLimit` defaults to 6) and would rerun the job.
- Doesn't cherry-pick onto master alone: both commits touch `submit_util.py` and `test/submit_util_test.py` from `07051ab`. With `07051ab` it applies cleanly.
- Demo image from the stack tip: `wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64` (built from [`coexecutor_image_pycurl`](../coexecutor_image_pycurl/index.md)).

## Review materials

- [Implementation](implementation_debrief.md)
- [Docker verification output](docker_verification/output.md), from [verify.sh](docker_verification/verify.sh)
