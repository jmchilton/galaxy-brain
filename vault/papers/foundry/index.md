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
target_venue: "Genome Research"
central_claim: "The Galaxy Workflow Foundry improves agentic workflow construction by compiling curated, schema-typed workflow knowledge into portable skills with explicit provenance instead of relying on runtime retrieval alone."
related_projects:
  - "[[workflow_state]]"
authors:
  - name: John Chilton
    orcid: https://orcid.org/0000-0002-6794-0756
    confirmed: true
  - name: Marius van den Beek
    orcid: https://orcid.org/0000-0002-9676-7032
    confirmed: false
  - name: Anton Nekrutenko
    orcid: https://orcid.org/0000-0002-5987-8032
    confirmed: false
created: 2026-05-17
revised: 2026-06-20
revision: 5
ai_generated: false
summary: "Paper workspace for Foundry as a provenance-bearing knowledge-to-skill compiler for Galaxy workflow authoring agents."
---

# Galaxy Workflow Foundry

## Working Claim

Runtime retrieval is not enough for schema-bound workflow construction. Foundry treats skills as compiled artifacts from a curated knowledge base, with schemas and provenance making the generated instructions inspectable and auditable.

## Current Emphasis

This is the most speculative paper. It needs a concrete case study before it becomes a conventional software manuscript. The demonstrated path is **construction from intent** (`interview-to-galaxy`); cross-source conversion is architecturally supported but not yet exercised end-to-end. Because the construction path supplies no demonstrated biological application, the working venue has been pulled back from Genome Biology (see Target Ladder).

## Target Ladder

Aim high but maintain a credible retreat path. Draft once at the highest realistic target's length; fallbacks are trim operations on that draft, not rewrites. **Pulled back one rung (2026-06):** the demonstrated path is construction-from-intent with no biological-application story, so the working primary is Genome Research, not Genome Biology.

**Working primary — Genome Research, Methods/Resource, ~6000–8000 words.** Infrastructure-with-applied-validation framing, with Planemo precedent at the venue. Carries the construction case study (`gxwf`- and `planemo`-validated, provenance-traced) plus the failure-comparison vignette against an unguided-agent baseline. Does not require demonstrated biological discovery — the contribution is the compiler/typed-draft/provenance machinery, validated on a real construction task.

**Aspirational — Genome Biology, Method/Software article, ~6000–8000 words.** *Gated on capability the project does not have today.* Genome Biology's Software section expects demonstrated biological application; that needs at least 2 worked case studies on real published pipelines (recovered signal, parameter-drift caught, reproducibility delta) — which means the conversion paths working end-to-end, not just construction-from-intent. Keep the door open only if a PhD-contributor lands a real conversion + biology result; do not plan the draft around it.

**Fallback 2 — Bioinformatics Original Paper, ~5000 words.** Trim from the higher draft: one case study instead of N, schema-as-contract pattern compressed to one section, drop comparison-to-runtime-retrieval framing, treat Molds as a single concept rather than a typology. Loses the "compiler" framing's depth; reduces to "agent-authoring pipeline for Galaxy workflows backed by gxwf validation."

**Fallback 3 — Bioinformatics Application Note, ~2000 words.** Single case study, single Mold pipeline, scaffolding-level description only. Submit only as a citation-availability artifact while a longer version is in revision elsewhere; not a credible standalone home for this contribution.

**Off-ladder alternatives.** Nature Methods is *possible* if a case study uncovers a publishable methodological error or recovers a non-trivial biological result; do not plan for this, but leave the door open if a PhD contribution lands one. PLOS Computational Biology if the agent-authoring framing becomes the dominant story.

## Workspace

- [outline](../outline/)
- [evidence](../evidence/)
- [figures](../figures/)
- [case-study](../case-study/)
- [manuscript](../manuscript/)
