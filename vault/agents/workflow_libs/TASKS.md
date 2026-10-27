```gb-tasks
- prompt: Run ./REVIEW.md on galaxyproject/gxformat2#277
  agent_dir: workflow_libs
  link: https://github.com/galaxyproject/gxformat2/pull/277
  description: |
    🔎 Reject unknown keys on workflow outputs under strict validation (richard-burhans; fixes #276, drops dict fallback from Process.outputs, +1 negative fixture).
  status: recommended
  suggested_by: workflow_libs/SUGGESTED_TASKS.md#Review New PRs
- prompt: Run ./WORK_HORSE.md on jmchilton/galaxy-tool-util-ts#210
  agent_dir: workflow_libs
  link: https://github.com/jmchilton/galaxy-tool-util-ts/issues/210
  description: |
    🐴 validate-tests --workflow cross-check ignores collection shape and datatype. Unassigned, opened since 2026-10-26.
  status: idea
  suggested_by: workflow_libs/SUGGESTED_TASKS.md#Work New Issues
```
