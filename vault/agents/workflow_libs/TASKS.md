```gb-tasks
- prompt: |
    gxformat2 0.29.1 is on PyPI. Create Galaxy branch gxformat2_0_29_1 off origin/dev bumping gxformat2: `pyproject.toml` floor and `lib/galaxy/dependencies/pinned-requirements.txt` pin (check other pins, e.g. `packages/*/setup.cfg`, via `git grep gxformat2`). Note any HISTORY changes affecting Galaxy (0.29.0 requires `class: GalaxyWorkflow` on Format2 workflows and strict mode rejects unknown output keys; 0.29.1 only fixes lint with contexts lacking `child()`). Hand off per GX_IMPLEMENTATION_HANDOFF.md.
  agent_dir: workflow_libs
  description: Follow-up to the gxformat2 0.29.1 release (supersedes the unlaunched 0.29.0 bump).
  status: recommended
  link: https://pypi.org/project/gxformat2/0.29.1/
```
