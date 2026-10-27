# pulsar #541 — SIGKILL skips Docker cleanup on cancellation

[Issue](https://github.com/galaxyproject/pulsar/issues/541) · Open, unassigned. Checked 2026-10-11.

The report describes psutil's SIGKILL-only process-tree cancellation skipping the job script's EXIT cleanup and leaving Docker containers running. Its non-Docker reproduction uses an EXIT marker. The non-psutil path already sends SIGTERM before SIGKILL.

Implemented on [term-first-cancellation](../../../branches/active/term-first-cancellation/index.md), pushed to the fork and polished for final review. Matching Galaxy branch is also pushed. Real Docker/InteractiveTool validation remains unperformed; this change proves shell cleanup. Related independent cleanup problem: [#542](https://github.com/galaxyproject/pulsar/issues/542).

## Implementation (2026-10-27)

Claimed on branch [term-first-cancellation](../../../branches/active/term-first-cancellation/index.md), based on fetched master `00a9e8c`. Confirmed missing EXIT marker on base; TERM-first implementation and forced-kill tests pass. Focused cancellation and manager tests: 20 passed. Lint passes. Normal review, hardening, and polishing completed. Pulsar head `d87e08f`; fork CI queued. Galaxy mirror `pulsar-term-first-cancellation` at `c20d1f345ce`, nine tests and changed-file lint/format pass.
