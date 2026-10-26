# foundry#726 — debug-galaxy-workflow-output has no surface for a workflow import rejection

[Issue](https://github.com/galaxyproject/foundry/issues/726) · [branch](../../../branches/active/issue-726-import-rejection-surface/index.md)

Labels `roadmap/off`, `priority/mvp`, `agent/implement`. Raised by the ncbi/egapx `/test-pipeline nextflow-to-galaxy` run: Galaxy 26.1.2.dev0 500'd on `POST /api/workflows/upload` (`IntegrityError`); phase 13 improvised surface, evidence location and bisection.

## Findings

- Foundry-owned Mold/eval gap (debug-galaxy-workflow-output step 1, run-workflow-test handoff vocabulary); the Galaxy 500 itself is a separate upstream defect, not fixed here.
- Root cause verified: Mold step 1 lists only post-invocation surfaces; planemo 0.75.47 imports in `install_workflows()` outside `execute()`, so no structured report on import failure.
- Branch polished, waiting on John's final review; PR body in the branch record's `pr_description.md`.
