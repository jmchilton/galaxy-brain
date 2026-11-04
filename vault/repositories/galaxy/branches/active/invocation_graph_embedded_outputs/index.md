---
upstream_base_branch: dev
parent_branch: invocation_graph_embedded_workflow_outputs
related_records:
  - galaxy/branches/invocation_graph_output_previews
  - galaxy/branches/invocation_graph_embedded_workflow_outputs
---

# Invocation graph: show steps as their preferred output

- [Open PR](https://github.com/jmchilton/galaxy/compare/invocation_graph_embedded_workflow_outputs...invocation_graph_embedded_outputs?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs)

## Status

Code changed after polish, for deck polish: `b29dbd61b9c` labels a step shown as its preferred output and carries stage 2's compact tables, image sizing and halos (snapshot since polishing: "commits: 0 same, 7 rebased, 1 changed, 1 new, 0 dropped; hunks: 58 carried, 7 changed, 3 new, 2 dropped"), still ready for John's final review ([PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md), [checklist](pr_checklist.md), [polish debrief](polish_debrief.md), [implementation debrief](implementation_debrief.md); [screenshots](screenshots/) with [index](screenshot_debrief.md), [layout measurements](layout_measurements.md), [deck](presentation/slides.md)).

No PR.

Fork CI has not run on `b29dbd61b9c`; locally the invocation graph and editor-star Playwright tests (11), the graph vitest suites and vue-tsc pass.

## Decisions

- Stage 3 of the [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) standing branch, stacked on stage 2 (`invocation_graph_embedded_workflow_outputs`). It targets dev: a new feature plus new step metadata. The original spike is kept as `invocation_graph_embedded_outputs_spike` (`3e4312f7c1d`).
- Nudge only, never a full re-layout. If nudging can't keep the layout recognizable, drop stage 2 (John, requirements session 2026-10-20).
- "Annotated outputs" means workflow outputs (John, 2026-10-20).
- Proposed for John in the [hardening debrief](earlier_drafts/1/implementation_debrief.md) (stage 3 hardening, 2026-11-04):
  - Steps are shown as their preferred output in embed mode only, against the invoked workflow version.
  - The field is stored in `WorkflowStep.config`, with no migration.
  - Only tool steps can name one. The value is type-checked but not checked against the tool's outputs.
  - The step is drawn as a static snapshot shared with stage 2's cards, which replaces its state text.
  - The preview is 8.5rem tall (5.25rem for collections), with no cap; since the deck polish that includes a one-line label naming the output.
  - A grown step is exactly a card's width (260px at any root font size, taken from the TS constant).
  - The size a step grew from is a deliberate underestimate.
  - Backward edges are a known limitation.
- gxformat2 support for `preferred_output` is a follow-up in gxformat2, not this branch.
- Deck polish (2026-11-04, [deck review](presentation/deck_review.md) P3): a grown step is labelled with its workflow output's label, or else the output's name, inside its existing height. Left for John: P11, showing the outline star only on hover or selection.
- Worktree: `~/projects/worktrees/galaxy/branch/invocation_graph_embedded_outputs`.

## History

- [Spike debrief](spike_debrief.md), [rebase on stage 1](rebase_on_stage1_debrief.md), [rebase on stage 2](rebase_on_stage2_debrief.md), [initial implementation debrief](initial_implementation_debrief.md).
- Requirements: queued issue draft [invocation_graph_embedded_outputs](../../../issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md). Project: [invocation_graph_embedded_outputs](../../../../../projects/invocation_graph_embedded_outputs/index.md) (spike screenshots).
