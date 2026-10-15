# cwl_fixes_5

Status: `branches_implemented_needs_ci`. Base: `dev`.

Collects CWL validation, typing, output-path and job-document fixes.

[Tracking history](tracking_history.md)

Decision: choose the PR split after replaying subworkflow mapping and running conformance tests.

## TICK — 2026-10-11

Current head has successful CWL conformance and Integration CWL Docker, but API and Python lint runs failed. Logs are no longer available (HTTP 410); failures cannot be diagnosed as unrelated. Retain needs CI.

## TICK — 2026-10-12

Current fork tip `96af0310d25a595ff3da02523b38516474892c5a` has substantial conflicts with dev across 79 paths, including workflow UI/runtime, CWL parser/representation and schema changes, and many modified/deleted CI workflows. No mechanical rebase attempted. Earlier current-head API/lint failures still lack downloadable logs; needs CI and the documented PR-split decision remain.

## GOOD_MORNING — 2026-10-13

Current fork head `96af0310d25a595ff3da02523b38516474892c5a` conflicts with `origin/dev` in 79 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `CONFLICT (modify/delete): .github/workflows/bioblend.yaml` · `CONFLICT (modify/delete): .github/workflows/build_client.yaml` · `CONFLICT (modify/delete): .github/workflows/build_container_image.yaml` · `CONFLICT (modify/delete): .github/workflows/check_test_class_names.yaml` · `CONFLICT (modify/delete): .github/workflows/client-unit.yaml` · `CONFLICT (modify/delete): .github/workflows/codeql-analysis.yml` · `CONFLICT (modify/delete): .github/workflows/converter_tests.yaml` · `.github/workflows/cwl_conformance.yaml` · `CONFLICT (modify/delete): .github/workflows/db_indexes.yaml` · `CONFLICT (modify/delete): .github/workflows/dependencies.yaml`
