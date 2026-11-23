# Filtered findings: #24687

- **thermo_review P3 1 (redundant pager wrapper and `align`, `v-model` to retire `onPageChange`):** re-litigates the one-way binding the description calls out. The wrappers also predate the PR, and the description says the surrounding layout is unchanged.
- **thermo_review P3 2, "a shared pager is a natural place to fix" the missing reset:** disproved. The index belongs to each parent, so the reset stays in `ToolExecutionJobs` (P2 2). The rest of that finding is kept as P3 2.
- **thermo_review P3 3 (scoped CSS instead of utility classes), as a separate finding:** nit that matches the sibling `ToolSuccess` style. It is resolved by the `JobPager` extraction (P3 2).
- **gx_test_challenger P2 3, `ZipImportSummary` shrink case (60 to 30 items):** not reachable. The summary is only mounted on its wizard step and the selection changes on another step, so the probe's prop change has no user route. The upload page case is kept as P2 1.
