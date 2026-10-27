# pulsar #541 — SIGKILL skips Docker cleanup on cancellation

[Issue](https://github.com/galaxyproject/pulsar/issues/541) · Open, unassigned. Checked 2026-10-11.

The report describes psutil's SIGKILL-only process-tree cancellation skipping the job script's EXIT cleanup and leaving Docker containers running. Its non-Docker reproduction uses an EXIT marker. The non-psutil path already sends SIGTERM before SIGKILL.

Next: reproduce with the actual kill helper, add a behavioral cancellation test, then implement TERM-first cancellation with a bounded grace period. Coordinate the mirrored Galaxy kill helper; use the Galaxy implementation handoff if Galaxy code changes. Related cleanup problem: [#542](https://github.com/galaxyproject/pulsar/issues/542). No implementation started in this sweep.

## Implementation (2026-10-27)

Claimed on branch [term-first-cancellation](../../../branches/active/term-first-cancellation/index.md), based on fetched master `00a9e8c`. Confirmed missing EXIT marker on base; TERM-first implementation and forced-kill tests pass. Focused cancellation and manager tests: 16 passed. Lint passes. Reviews and Galaxy-copy coordination remain in progress.
