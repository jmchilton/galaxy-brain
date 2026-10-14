Follow-up to 🔀 #567 - keep Workflow Brief planning opt-in and make every build route visible on the site.

#567 made a Workflow Brief mandatory inside PAPER → GALAXY and INTERVIEW → GALAXY. This restores those direct routes and presents the brief as a deliberate Plan & Build choice. ***Workflow Brief isn't removed or weakened. It becomes a route you choose, not a step forced into two existing pipelines.***

| Before: landing page | After: landing page |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jmchilton/foundry/pr-605-screenshots/before-landing-matrix.png" width="480"> | <img src="https://raw.githubusercontent.com/jmchilton/foundry/pr-605-screenshots/after-landing-routes.png?v=2" width="480"> |

The old source × target matrix had no slot for INTERVIEW → GALAXY, the three source-to-brief planners, WORKFLOW BRIEF → GALAXY or the existing-workflow routes. The new chooser shows every route, grouped by what the user is trying to do. ***Direct Build isn't unattended. It can still pause for expert input or stop on blockers.***

<details><summary>Usage page: runnable harnesses grouped by journey</summary>

| Before | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jmchilton/foundry/pr-605-screenshots/before-usage-run.png" width="420"> | <img src="https://raw.githubusercontent.com/jmchilton/foundry/pr-605-screenshots/after-usage-run.png?v=2" width="420"> |

</details>

<details><summary>Pipelines catalog with a Journey column, and the landing chooser at phone width</summary>

<img src="https://raw.githubusercontent.com/jmchilton/foundry/pr-605-screenshots/after-pipelines-catalog.png?v=2" width="720">

<img src="https://raw.githubusercontent.com/jmchilton/foundry/pr-605-screenshots/after-landing-routes-mobile.png?v=2" width="300">

</details>

## What changes

- **Direct routes restored.** PAPER → GALAXY and INTERVIEW → GALAXY run `freeform-summary-to-galaxy-{interface,data-flow,template,test-plan}` again. The four restored Mold directories are byte-identical to `main`. INTERVIEW → GALAXY returns to `reviewed`, matching `main`. The paper guidance `main` added since #567 branched is carried forward.
- **Plan & Build stays explicit.** PAPER/INTERVIEW/NEXTFLOW → WORKFLOW BRIEF, then WORKFLOW BRIEF → GALAXY, keep their expert-review boundary unchanged.
- **Journey taxonomy.** A new `journey` tag facet (`direct-build`, `plan`, `build-from-plan`, `existing-workflow`). Every pipeline carries exactly one, enforced by the pipeline note schema.
- **Site.** `PipelineRoutes` replaces `PipelineMatrix` on the landing page (toward #3). Usage groups runnable harnesses by journey. The catalog gains a Journey column and scrolls horizontally on narrow screens. Route and run panels share grouping through `site/src/lib/pipeline-journeys.ts`.
- **Cross-links.** Schema notes, patterns, research, CLI guidance and Mold companions link both the direct and the brief-driven Molds.

<details><summary>Kept in mind</summary>

- Freeform-summary and Workflow Brief Galaxy design Molds are now parallel families, as with the existing Nextflow and CWL `*-summary-to-galaxy-*` families. A change to a shared pattern or research note must be recast into both.
- Current `main` has further edits to the paper and CWL pipeline files, so merging it into this branch reports content conflicts. Keep the paper guidance included here and regenerate conflicted cast or assembly outputs from their source notes.

</details>

## Context

Builds on 🔀 #565 and 🔀 #567 and targets `rfc/workflow-brief`. Toward 🎯 #3.

## Risks

The one-way piece is the journey taxonomy: every pipeline now needs exactly one `journey/*` tag, and that rule lives in `@galaxy-foundry/gxwf-foundry-note-schema`.

<details><summary>Risk Details</summary>

- The pipeline schema now rejects pipeline notes without exactly one `journey/*` tag. The changeset ships this as a minor release of `@galaxy-foundry/gxwf-foundry-note-schema`, so other repositories' pipeline notes need a journey tag before they upgrade.
- `journey/existing-workflow` overlaps the existing `lifecycle` facet and `source/galaxy`.
- The journey list in `pipeline-journeys.ts` mirrors `meta_tags.yml`. A test keeps them aligned.
- The site changes themselves are two-way and easy to revise.

</details>

<details><summary>Risk Review Advice</summary>

Review the four journey values as the public vocabulary for routes. Check that the landing and Usage copy don't imply Direct Build skips expert involvement.

</details>

## Validation

- Root suite: 28 files, 402 tests pass. Package suites pass, and so do package tarball smoke installs.
- Content validation: 271 files, 0 errors.
- Production site build: 454 pages.
- Packages typecheck/build/lint, root typecheck, format, lint, generated docs, kinds, casts, verification, pipeline assemblies and fixtures: no drift or failures.
- `pnpm changeset status --since=origin/rfc/workflow-brief` passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
