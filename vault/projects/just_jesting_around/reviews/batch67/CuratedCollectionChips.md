# CuratedCollectionChips readability iteration 67

Originator: `00cd1586be900abe0315a85beef8120f347cd0a2`, pinned base `1aefd1948d079abfc2d179f62c4d07a323b8daa0`.

Preserved all five cases, 12 assertions, collection values/order, active-selection fixtures and geometry assumptions. The unchanged collection literal now uses the existing API schema type. Mount options use inferred Vue Test Utils props/global plugins. Positive content/action lookups use `get`; original presence/absence assertions remain intact. Automatic unmount runs before prototype geometry-spy restoration, including assertion-failure paths.

Seed 670101 passed five cases. Default V8 comparison: 14 files, 121 covered statement/function/branch-arm locations identical. Explicit actual shared UI comparison (`GButton`, `GTooltip`): two files, 54 locations identical. No lost locations. File ESLint, Prettier and explicit absolute-config pre-commit hooks passed. Full integrated client types are driver-owned.

Evidence: `/private/tmp/readability67-chips-{before,after}/coverage-final.json`, corresponding `-ui` directories and logs; `/private/tmp/readability67-chips-hooks.log`. No new guidance or shared helper is justified by this local change.
