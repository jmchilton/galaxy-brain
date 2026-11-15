---
upstream_base_branch: master
parent_branch: coexecution_client_fixes
child_branches: coexecution_compact_launch
related_records:
  - pulsar/branches/coexecution_client_fixes
  - pulsar/branches/coexecutor_image_pycurl
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecution_compact_launch
---
# Report stage-out failures, fail directory outputs, publish terminal status before shutdown

- [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecution_client_fixes...jmchilton:pulsar:coexecution_stage_out_failures?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_stage_out_failures)

## Status

Implemented at `20b6460` (restacked 2026-11-14 from `53f91f1`/`3b2cde8`; same tree as `3b2cde8`) during stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); verified with docker against a throwaway RabbitMQ, and end to end through stock Galaxy v26.1.2 on Funnel and TESK in the demo (`runs/gaps/stage-out-failure-53f91f1/`, `runs/gaps/cancel-finished-task-tesk-fixed/fail-job-*`, IWC QC PASS in `runs/2026-11-14-9da1c5702ebec70c/` and `runs/2026-11-14-46d0cd030901e24d/` in `~/projects/repositories/galaxy-wes-tes`).

No PR.

Fork CI for `20b6460` not checked yet.

## Notes

- Three independent commits, one per finding from the demo's gap test 4 and code reading: `eafab6c` (stage-out error in the `failed` status's `stderr`), `edb84a6` (shutdown waits for a reported terminal status to be published), `20b6460` (an output file written as a directory fails the job). Pre-restack: `6038976`, `90600e8`, `53f91f1`.
- A missing output is deliberately unchanged: a local Galaxy runner with default config also ends green with a 0-byte dataset.
- The demo now builds `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460` from this tip. Pre-restack image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1`, id `sha256:9314ab4dfc7509e79ade1ebbb288c739f1be7ec058be2d859a43f6ce9b264676`, built 2026-11-14 18:27 UTC, local only. The demo's default staging image since 2026-11-14 20:30 UTC (demo commit `c64ad17`). In the demo, the job's stderr now names the stage-out error (`Pulsar failed to stage outputs: Connection refused ...`) and a directory output fails the job (`... is a directory, not a file`); the `90600e8` race wasn't provoked.
- None of the three commits cherry-picks onto master alone: all touch `test/submit_util_test.py`, which the stack adds (`5e3de24`).

## Review materials

- [Implementation](implementation_debrief.md)
- [Docker verification output](docker_verification/output.md), from [verify.sh](docker_verification/verify.sh)
