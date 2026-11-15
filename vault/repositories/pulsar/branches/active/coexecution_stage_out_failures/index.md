---
upstream_base_branch: master
pr: 582
parent_branch: coexecution_client_fixes
child_branches: coexecution_compact_launch
related_records:
  - pulsar/branches/coexecution_client_fixes
  - pulsar/branches/coexecutor_image_pycurl
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecution_compact_launch
---
# Report stage-out failures, fail directory outputs, publish terminal status before shutdown

- [PR #582](https://github.com/galaxyproject/pulsar/pull/582)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_stage_out_failures)

## Status

Hardened 2026-11-15 at `24006de` (restacked onto `coexecution_client_fixes` `77651c5`, adapting `e53af76` to the parent's failure-message markers): Codex review (two bugs fixed: live stdout dropped the stage-out error, recovery bypassed the publication wait; empty output directories left open) and thermo-nuclear review (four cleanups, outcome publication in its own method).

Draft PR [#582](https://github.com/galaxyproject/pulsar/pull/582) opened 2026-11-15, stacked on #581.

CI for `24006de` (2026-11-15, settled): unrelated only. Everything else green; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- Commits (2026-11-15): `e53af76` (stage-out error in the `failed` status's `stderr`), `0f19d22` (shutdown waits for a reported terminal status to be published), `bcc3538` (an output file written as a directory fails the job), `f5c10d9` and `bc2d155` (Codex fixes), `9b83475`, `05dc6ea`, `a38474d`, `24006de` (thermo cleanups). Pre-restack: `eafab6c`, `edb84a6`, `20b6460`.
- Open decision: an empty directory at an output path still reads as a missing output (the outputs listing has files only).
- A missing output is deliberately unchanged: a local Galaxy runner with default config also ends green with a 0-byte dataset.
- The demo now builds `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460` from this tip. Pre-restack image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1`, id `sha256:9314ab4dfc7509e79ade1ebbb288c739f1be7ec058be2d859a43f6ce9b264676`, built 2026-11-14 18:27 UTC, local only. The demo's default staging image since 2026-11-14 20:30 UTC (demo commit `c64ad17`). In the demo, the job's stderr now names the stage-out error (`Pulsar failed to stage outputs: Connection refused ...`) and a directory output fails the job (`... is a directory, not a file`); the `90600e8` race wasn't provoked.
- Doesn't cherry-pick onto master alone: it needs `test/submit_util_test.py` (#578) and the failure-message markers (#579).

## Review materials

- [Implementation](implementation_debrief.md)
- [Docker verification output](docker_verification/output.md), from [verify.sh](docker_verification/verify.sh)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
