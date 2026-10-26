# Implementation debrief

Content-only fix for #726 on `issue-726-import-rejection-surface` (base `origin/main` `f48c01b6`).

- debug-galaxy-workflow-output: import rejection surface first in step 1; new step 2 (evidence: import response, terminal log, server-log traceback when logged) and step 3 (synthetic-variant bisection vs passing control; route upstream vs content). Eval property + two scenarios.
- run-workflow-test: `workflow-import-rejected` modality, `fail` not `not-run` (content/server defect; permission or missing-tool refusals stay `not-run`), two new next surfaces, ids-absent capture. Coverage-gap entry instead of a scenario case (no observed fixture committed).
- planemo-workflow-test-architecture: "Workflow Import Failures" section verified against planemo 0.75.47 source.
- Casts and Dashboard regenerated.

Red evidence: the ncbi/egapx run (not automatable; content change). Local gate: `make -k check` green except machine-only `check-vendored` and `validate-roadmap` (#672 live-GitHub roadmap state, untouched here).

Cross-branch: `issue-730-udt-run-recipe` edits the same run-workflow-test steps (renumbers, also revision 8) and the planemo note — second to land needs rebase + recast. Its "missing built-in tool fails import → not-run" is consistent with this branch's not-run/fail line.
