# cwl_fixes_5

Status: `branches_implemented_needs_ci`. Base: `dev`.

Collects CWL validation, typing, output-path and job-document fixes.

[Tracking history](tracking_history.md)

Decision: choose the PR split after replaying subworkflow mapping and running conformance tests.

## TICK — 2026-10-11

Current head has successful CWL conformance and Integration CWL Docker, but API and Python lint runs failed. Logs are no longer available (HTTP 410); failures cannot be diagnosed as unrelated. Retain needs CI.
