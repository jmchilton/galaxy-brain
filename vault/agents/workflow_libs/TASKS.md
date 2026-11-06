```gb-tasks
- prompt: |
    gxformat2 0.29.1 is on PyPI. Create Galaxy branch gxformat2_0_29_1 off origin/dev bumping gxformat2: `pyproject.toml` floor and `lib/galaxy/dependencies/pinned-requirements.txt` pin (check other pins, e.g. `packages/*/setup.cfg`, via `git grep gxformat2`). Note any HISTORY changes affecting Galaxy (0.29.0 requires `class: GalaxyWorkflow` on Format2 workflows and strict mode rejects unknown output keys; 0.29.1 only fixes lint with contexts lacking `child()`). Hand off per GX_IMPLEMENTATION_HANDOFF.md.
  agent_dir: workflow_libs
  description: Follow-up to the gxformat2 0.29.1 release (supersedes the unlaunched 0.29.0 bump).
  status: recommended
  link: https://pypi.org/project/gxformat2/0.29.1/
- prompt: Run ./WORK_HORSE.md on jmchilton/galaxy-tool-util-ts#215
  agent_dir: workflow_libs
  link: https://github.com/jmchilton/galaxy-tool-util-ts/issues/215
  description: |
    🐴 `gxwf draft-next-step` work items omit the edges around `TODO_*` ports: in-ports report no source and out-ports don't name consuming steps, so a reader can't tell a rename from a topology change. Proposes annotating both sides, plus making `draft-validate` reject a `TODO_*` input with no source or default. The strings sync from gxformat2 `draft.py`, so wording changes there first.
  status: idea
  suggested_by: _shared/PROJECT_SUGGESTED_TASKS.md#Work New Issues
- prompt: Run ./WORK_HORSE.md on jmchilton/galaxy-tool-util-ts#216
  agent_dir: workflow_libs
  link: https://github.com/jmchilton/galaxy-tool-util-ts/issues/216
  description: |
    🐴 `gxwf draft-validate --concrete --json` reports `ok: false` and `1 error` while every `*_errors` array is empty; the failure sits only at `concrete.tool_state.results[].errors`, and `tool_state` and `connection_report` number the same step differently. Proposes an additive step `label` and a top-level `concrete_errors` array across report models and both step walkers.
  status: idea
  suggested_by: _shared/PROJECT_SUGGESTED_TASKS.md#Work New Issues
- prompt: Run ./WORK_HORSE.md on galaxyproject/gxformat2#266
  agent_dir: workflow_libs
  link: https://github.com/galaxyproject/gxformat2/issues/266
  description: |
    🌱 numeric min/max semantic gaps (non-numeric inputs, min > max); next: red declarative tests + `_semantic_validators` fix.
  status: idea
  suggested_by: _shared/PROJECT_SUGGESTED_TASKS.md#Starter Issues
```
