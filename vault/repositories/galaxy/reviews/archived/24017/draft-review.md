# Draft GitHub review — not posted

Proposed event: **APPROVE**

Reviewed `358de494610a2873cf134a697ba248824a7fa231`. The shared listing key, rebuild locking, invalidation, and per-image ordering look sound. I ran 29 focused resolver/mulled utility tests and independent checks for concurrent readers, shared invalidation at an unchanged mtime, hash separation, mid-build directory changes, weak-reference lifetime, and explicit-resolver selection. No correctness blockers found.

One non-blocking suggestion: add deterministic regressions for simultaneous readers performing only one listing and invalidating one resolver refreshing another when the mtime stays unchanged. The new registry test currently covers sequential readers and mtime-driven refresh; both extra cases passed independent checks.

## Risks

Risks are low: this is a reversible internal cache change with no API or persisted-data contract change (a two-way door). Local verification covered resolution behavior; I did not independently benchmark CVMFS memory use. The existing default-registry test could not complete its external involucro/Quay downloads in the local environment.
