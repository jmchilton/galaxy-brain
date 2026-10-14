# rfc/workflow-brief

PR: [galaxyproject/foundry#682](https://github.com/galaxyproject/foundry/pull/682) (draft) → `main`. Toward #563. Opened 2026-10-14 at John's request to track landing the branch.

- Description: [pr_description.md](pr_description.md).
- Carries #567 and #605 (see [#605 notes](../fix-restore-direct-paper-interview/index.md)). #565 already merged to `main` from this branch.
- At opening: 16 ahead, 101 behind `main`. Trial merge conflicts: 12 source files (README, three Galaxy pattern notes, paper/cwl pipeline indexes, `RunPipelines.astro`, landing and usage pages) plus 42 casts and generated Dashboard/Index/harness-pipelines.

## Next

- Merge `main` into the branch; hand-merge sources, regenerate the rest; run all CI gates.
- Then update the description's Validation section and mark ready.
