---
type: paper
title: "Format 2 and gxwf: Human- and Agent-Writable Galaxy Workflows"
short_title: "Format 2/gxwf"
tags:
  - paper
  - galaxy/workflows
  - galaxy/tools
  - galaxy/api
status: draft
paper_stage: drafting
paper_kind: methods
target_venue: "Genome Research"
central_claim: "Format 2 makes Galaxy workflows concise and writable by humans and agents; gxwf makes that authoring surface credible by validating workflow structure, tool parameters, select values, conditionals, and collection connections against ToolShed schemas."
related_projects:
  - "[[workflow_state]]"
created: 2026-05-17
revised: 2026-05-20
revision: 5
ai_generated: false
summary: "Paper workspace for Format 2 (Galaxy's writable workflow format), gxformat2 library, and gxwf schema-aware validation/CLI/browser/VS Code authoring stack."
---

# Format 2 / gxformat2 / gxwf

## Working Claim

Galaxy workflows are no longer only GUI-authored runtime artifacts. Through Format 2 workflows and schema-aware validation, they become concise, text-editable, statically checkable documents that humans, IDEs, CI systems, and agents can author safely.

## Current Emphasis

This should be the most concrete near-term paper: Format 2 as Galaxy's human-writable workflow representation, gxformat2 as the library for working with that representation, and gxwf as the validation and authoring stack that makes the representation practical.

The central contrast is not "Galaxy has validation and others do not." The contrast is depth: other systems validate real structure at the workflow or language level, while Galaxy can validate scientific tool invocations because ToolShed metadata exposes typed parameter schemas for community tools.

## Workspace

- [manuscript](./manuscript/) — the draft
- [tasks](./tasks/) — polish TODO list maintained alongside the draft
- [glossary](./glossary/) — internal authoring reference; terminology contract between drafts (not cited in the paper)

## Target Ladder

Aim high but maintain a credible retreat path. Draft once at the highest target's length; fallbacks are trim operations on that draft, not rewrites.

**Primary — Genome Research, Methods/Resource, ~6000–8000 words.** Modeled on the Planemo paper (Bray et al., GR 2023). Depth-of-validation enabled by ToolShed schemas + the multi-surface authoring stack. Ecosystem footprint (ToolShed tool count, IWC corpus, VS Code/browser reach) carries the empirical weight biology would in a discovery paper. Strengthened materially if a PhD contributor lands one biological re-validation vignette (e.g. "of N published Galaxy workflows we re-checked, M had silent parameter drift").

**Fallback 1 — Bioinformatics Original Paper, ~5000 words.** Comfortable fit, fast turnaround, IF roughly half of GR but reputable. Trim from the GR draft: tighten Implementation by collapsing per-package detail into a single architecture paragraph; demote either `gxwf-ui` or the VS Code extension to a one-paragraph mention (keep whichever is more shipped at submission time); shrink the competitive table to four rows; cut historical/Format 2 motivation prose.

**Fallback 2 — Bioinformatics Application Note, ~2000 words, 2 pages.** Guaranteed-fit floor. Trim aggressively: one authoring surface only (VS Code), one validation depth example, no competitive table, IWC numbers as a single sentence. Loses the "stack" story; reduces to "schema-aware Galaxy workflow validation lib + CLI." Use only if GR/Bioinformatics-OP timelines slip past the GCC2026 talk.

**Off-ladder alternatives.** BMC Bioinformatics (open access, IF lower but workflow-friendly) or JOSS (software-only, near-guaranteed but lower prestige) if reviewer fatigue at the primary venues becomes blocking.
