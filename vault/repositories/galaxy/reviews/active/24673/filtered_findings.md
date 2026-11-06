# Filtered findings: #24673

No reviewer's P-labeled finding was filtered. These caveats from `initial_review.md` and the performance debrief stayed out of `verified_review.md`. Experiments and what was checked: [verification/caveat_notes.md](verification/caveat_notes.md).

- Undetected hang through `_next_hid`: reproduced on PostgreSQL, but filtered because no production path to the required uncommitted `history` row update was found (triggers, row locks and `history` writers checked).
- Deadlock reaches single-output jobs: reproduced, but filtered because the failure is loud and the PR accepts this risk; only the description's "several outputs" scope is too narrow.
- Deadlock recovery takes a second pass: partly reproduced, filtered because the job still fails rather than sticking.
- Job finish takes the lock in `ExpressionTool.exec_after_process`: not run, filtered because it only waits and reading found no cycle.
- Tags depend on the ordering: not run, filtered as pre-existing and cosmetic.
