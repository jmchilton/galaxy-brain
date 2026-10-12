# JobsTable — batch 64

Both original cases and two exact row-order assertions remain. The oldest-first fixture continues to prove the component's default newest-first sort, and clicking Last Update continues to prove the reversed order. Real GTable rendering is retained; UtcDate and JobDetails retain their existing stubs.

Native inferred mounting removes the object cast. Automatic unmount now releases both wrappers even if an assertion fails. The click uses a required header lookup keyed to update_time instead of assuming it is the second header and suppressing undefined with a non-null assertion. Existing local mount and rendered-row helpers already express the setup and observation clearly; no new shared helper or guidance is needed.

Author shuffled seed 640101 passes two cases before and after. Default coverage is identical across 234 files/416 covered source locations. Explicit actual GTable/GAlert/GLink coverage is identical across three files/160 locations. Both comparisons lose and add zero statement/function/branch-arm locations. File ESLint, Prettier and repository hooks using the explicit absolute configuration pass; integrated full types belong to the driver. No production or supporting edits.

Originator commit: `8ee6e666403` (full SHA supplied to driver). Worker: `/private/tmp/galaxy-readability64-jobs`.
