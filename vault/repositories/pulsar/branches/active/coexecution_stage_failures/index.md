---
upstream_base_branch: master
pr: 579
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

- [PR #579](https://github.com/galaxyproject/pulsar/pull/579)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_stage_failures)

## Status

Hardened 2026-11-15 at `1302eea` (restacked onto `coexecution_publish_running` `1a741aa`): Codex review (no findings) and thermo-nuclear review (the preprocessing error now lives in the `preprocessing_failed` marker and `StatefulManagerProxy.stderr_contents` appends it, folded into `f2789fc`; unused `--wait` status dropped).

Draft PR [#579](https://github.com/galaxyproject/pulsar/pull/579) opened 2026-11-15, stacked on #578.

CI for `1302eea` (2026-11-15): unrelated only so far. The `pulsar` workflow is green and the framework `dev` jobs were still running; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- Commits (2026-11-15): `8dff9bd` (non-zero exit from `pulsar-submit --no-wait` and `pulsar-finish` on failure), `f2789fc` (the failed status carries the preprocessing error as `stderr`, via the `preprocessing_failed` marker's message), `ac3a883` (test fix for CI), `1302eea` (drop unused `--wait` status).
- The stage-out counterpart (the upload error in the `failed` status's `stderr`) is [`coexecution_stage_out_failures`](../coexecution_stage_out_failures/index.md).
- `pulsar-submit --wait` deliberately keeps exiting 0: Kubernetes Jobs replace failed pods (`backoffLimit` defaults to 6) and would rerun the job.
- Doesn't cherry-pick onto master alone: it touches `submit_util.py` and `test/submit_util_test.py` from #578.
- The demo image is built from the stack tip, [`coexecution_stage_out_failures`](../coexecution_stage_out_failures/index.md).

## Review materials

- [Implementation](implementation_debrief.md)
- [Docker verification output](docker_verification/output.md), from [verify.sh](docker_verification/verify.sh)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
