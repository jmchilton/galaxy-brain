# cwl_fixes_5

Status: `branches_implemented_needs_ci`. Base: `dev`.

Collects CWL validation, typing, output-path and job-document fixes.

[Tracking history](tracking_history.md)

Decision: choose the PR split after replaying subworkflow mapping and running conformance tests.

## TICK — 2026-10-11

Current head has successful CWL conformance and Integration CWL Docker, but API and Python lint runs failed. Logs are no longer available (HTTP 410); failures cannot be diagnosed as unrelated. Retain needs CI.

## TICK — 2026-10-12

Current fork tip `96af0310d25a595ff3da02523b38516474892c5a` has substantial conflicts with dev across 79 paths, including workflow UI/runtime, CWL parser/representation and schema changes, and many modified/deleted CI workflows. No mechanical rebase attempted. Earlier current-head API/lint failures still lack downloadable logs; needs CI and the documented PR-split decision remain.
