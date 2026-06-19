---
type: paper
title: "Galaxy Workflow Foundry: Compiling Curated Workflow Knowledge into Provenanced Agent Skills"
short_title: "Foundry"
tags:
  - paper
  - galaxy/workflows
  - galaxy/tools
status: draft
paper_stage: drafting
paper_kind: methods
target_venue: "Genome Biology"
central_claim: "The Galaxy Workflow Foundry improves agentic workflow construction by compiling curated, schema-typed workflow knowledge into portable skills with explicit provenance instead of relying on runtime retrieval alone."
related_projects:
  - "[[workflow_state]]"
created: 2026-05-17
revised: 2026-06-19
revision: 3
ai_generated: false
summary: "Paper workspace for Foundry as a provenance-bearing knowledge-to-skill compiler for Galaxy workflow authoring agents."
---

# Galaxy Workflow Foundry

## Working Claim

Runtime retrieval is not enough for schema-bound workflow construction. Foundry treats skills as compiled artifacts from a curated knowledge base, with schemas and provenance making the generated instructions inspectable and auditable.

## Current Emphasis

This is the most speculative paper. It needs concrete case studies before it becomes a conventional software manuscript.

## Target Ladder

Aim high but maintain a credible retreat path. Draft once at the highest target's length; fallbacks are trim operations on that draft, not rewrites.

**Primary — Genome Biology, Method/Software article, ~6000–8000 words.** Foundry is the one paper in this set with a credible biological angle: each case study is a real published pipeline (paper-to-Galaxy, Nextflow-to-Galaxy, CWL-to-Galaxy) converted and re-validated. Genome Biology's Software section explicitly expects demonstrated application — Foundry can supply it because every Mold produces a checkable artifact tied to a real upstream pipeline. Aim higher *here*, not at gxwf, because this is the paper whose contribution can credibly earn the venue. Requires at least 2 worked case studies with biological context (recovered signal, parameter-drift caught, reproducibility delta) — PhD contributors carry the weight here.

**Fallback 1 — Genome Research, Methods/Resource, ~6000–8000 words.** If reviewers push back on biological discovery being insufficient for Genome Biology's Software section, GR is the natural step down with Planemo precedent. Same case studies, retarget the framing from "biology enabled" to "infrastructure with applied validation." Minimal prose surgery, no length cut.

**Fallback 2 — Bioinformatics Original Paper, ~5000 words.** Trim from the higher draft: one case study instead of N, schema-as-contract pattern compressed to one section, drop comparison-to-runtime-retrieval framing, treat Molds as a single concept rather than a typology. Loses the "compiler" framing's depth; reduces to "agent-authoring pipeline for Galaxy workflows backed by gxwf validation."

**Fallback 3 — Bioinformatics Application Note, ~2000 words.** Single case study, single Mold pipeline, scaffolding-level description only. Submit only as a citation-availability artifact while a longer version is in revision elsewhere; not a credible standalone home for this contribution.

**Off-ladder alternatives.** Nature Methods is *possible* if a case study uncovers a publishable methodological error or recovers a non-trivial biological result; do not plan for this, but leave the door open if a PhD contribution lands one. PLOS Computational Biology if the agent-authoring framing becomes the dominant story.

## Workspace

- [outline](../outline/)
- [evidence](../evidence/)
- [figures](../figures/)
- [case-study](../case-study/)
- [manuscript](../manuscript/)
