# rfc/workflow-brief

PR: [galaxyproject/foundry#682](https://github.com/galaxyproject/foundry/pull/682) → `main`, merged 2026-10-15 (`b2cdd98b`). Toward #563. Opened 2026-10-14 at John's request to track landing the branch.

- Description: [pr_description.md](pr_description.md).
- Carries #567 and #605 (see [#605 notes](../fix-restore-direct-paper-interview/index.md)). #565 already merged to `main` from this branch.
- At opening: 16 ahead, 101 behind `main`. Trial merge conflicts: 12 source files (README, three Galaxy pattern notes, paper/cwl pipeline indexes, `RunPipelines.astro`, landing and usage pages) plus 42 casts and generated Dashboard/Index/harness-pipelines.

- Worktree: `~/projects/worktrees/foundry/branch/workflow-brief-pipelines` (reused from #605), on local `rfc/workflow-brief`.

## Merged main (2026-10-15)

- John asked for a rebase; chose merge instead (rebase would flatten the #567/#605 merges and need a force-push). `4086a999`, pushed; 0 behind.
- Hand-merge: patterns, `cwl-to-galaxy` and `harness-pipelines` #8 take `main`'s wording; `paper-to-galaxy` = branch's direct-path paragraph + `main`'s body, minus the trailing "composed alternative" line `main` dropped.
- Antigravity (#593) folded into the journey layout: `PipelineHarnessList` gets the third command line. It overflowed 4 rows by up to 22px at 1400, so the command column went from `minmax(29rem, …)` to `31rem`. No overflow at 1400/1000/961; at 390 commands scroll inside `pre`, and the page overflow there is the known header issue.
- Casts, assemblies, Dashboard/Index/README regenerated after `npm run packages-build` (the stale build broke `make casts`).
- All 17 local CI gates pass. `packages-test` timed out once on the nf-core/rnaseq integration test (8.9s vs 5s), then passed on rerun; that test doesn't touch this branch.
- [pr_description.md](pr_description.md) updated (banner dropped, merge notes, Validation) and applied to #682 at John's request.

## Merged (2026-10-15)

- John merged #682 (`b2cdd98b`). GitHub CI green beforehand (`test`, `changeset`).
- The note-schema minor (required `journey/*` tag) rides the open Changesets release PR #561; it publishes when #561 merges.

## Follow-ups

- Release: merge #561 when ready; check it lists `gxwf-foundry-note-schema` minor.
- `foundry-pattern` snapshots this repo's `meta_tags.yml`/`kinds.json` (`site/src/data/instances/galaxy-workflow-foundry/`); its copy has no `journey` facet. Refresh it.
- #563 (Workflow Plan): the pipelines it asked for are on `main`. Decide close vs keep open until a real brief run.
- First real agent-driven brief run (PAPER/NEXTFLOW → BRIEF → GALAXY); nothing has run end to end yet.
- #3: decide whether the `PipelineRoutes` chooser covers it or the hero fan widget is still wanted.
- Cleanup: origin branches `rfc/workflow-brief`, `rfc/workflow-brief-pipelines`, `fix/restore-direct-paper-interview`; the `workflow-brief-pipelines` worktree.
- Carried from #605: landing header overflows ~40px at 390px; freeform/brief Mold family merge after real runs.
