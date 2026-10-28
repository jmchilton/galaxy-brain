```gb-tasks
- prompt: |
    gxformat2 0.29.0 is on PyPI. Create Galaxy branch gxformat2_0_29_0 off origin/dev bumping gxformat2: `pyproject.toml` floor and `lib/galaxy/dependencies/pinned-requirements.txt` pin (check other pins, e.g. `packages/*/setup.cfg`, via `git grep gxformat2`). Note any HISTORY changes affecting Galaxy (0.29.0 requires `class: GalaxyWorkflow` on Format2 workflows and strict mode rejects unknown output keys). Hand off per GX_IMPLEMENTATION_HANDOFF.md.
  agent_dir: workflow_libs
  description: Follow-up to the gxformat2 0.29.0 release.
  status: recommended
  link: https://pypi.org/project/gxformat2/0.29.0/
```
