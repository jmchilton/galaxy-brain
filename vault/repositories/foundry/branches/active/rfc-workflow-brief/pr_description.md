Toward 🎯 #563 - land the Workflow Brief pipelines and the Direct Build / Plan & Build route split on `main`.

#565 already put the Workflow Brief schema and Markdown schemas on `main`. The pipelines that produce and consume a brief, and the site changes that present them, have only lived on `rfc/workflow-brief` since then. This PR brings them over.

## What lands

- **Plan pipelines.** PAPER, INTERVIEW and NEXTFLOW → WORKFLOW BRIEF. Each stops for expert review and edit, and can return a valid blocked brief.
- **Build-from-plan pipeline.** WORKFLOW BRIEF → GALAXY, with its own `workflow-brief-to-galaxy-{interface,data-flow,template,test-plan}` Molds.
- **Direct routes unchanged.** PAPER → GALAXY and INTERVIEW → GALAXY keep running the `freeform-summary-to-galaxy-*` Molds, as on `main`. ***The brief is a route you choose, not a step added to the existing pipelines.***
- **Journey taxonomy.** A required `journey/*` tag on every pipeline (`direct-build`, `plan`, `build-from-plan`, `existing-workflow`). It ships as a minor release of `@galaxy-foundry/gxwf-foundry-note-schema`.
- **Site.** The landing page's source × target matrix becomes a route chooser grouped by journey. Usage and the pipelines catalog group by journey too.

<details><summary>Merging main</summary>

`main` is merged in (`4086a999`). Pattern notes, `cwl-to-galaxy` and `harness-pipelines` take `main`'s wording; `paper-to-galaxy` keeps the direct-path paragraph on top of `main`'s body. The journey layout picks up `main`'s Antigravity support: harness rows show the Antigravity command, and their command column widens to 31rem to fit it. Casts, pipeline assemblies, Dashboard, Index and README are regenerated.

</details>

## Context

Builds on 🔀 #565, 🔀 #567 and 🔀 #605. Toward 🎯 #3 (landing route chooser).

## Risks

The one-way piece is the required journey tag in the published note-schema package: other repositories' pipeline notes need one before they upgrade.

<details><summary>Risk Details</summary>

- Freeform-summary and Workflow Brief Galaxy design Molds are parallel families, so a shared pattern or research edit must be recast into both.
- No agent-driven brief run has been executed end to end yet; the brief harness gates (review, preflight, hash preservation) are instructions, not an enforcement engine.

</details>

## Validation

All CI gates pass locally after the merge, `check-generated`, `check-casts`, `check-verify` and `check-assemble-pipelines` included. Usage harness commands fit without scrolling at 1400, 1000 and 961px; at 390px they scroll inside their box.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
