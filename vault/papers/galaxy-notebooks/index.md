---
type: paper
title: "Galaxy Notebooks: Reproducible Communication and Narrative-Driven Workflow Extraction"
short_title: "Galaxy Notebooks"
tags:
  - paper
  - galaxy/client
  - galaxy/api
  - galaxy/workflows
status: draft
paper_stage: manuscript
paper_kind: methods
target_venue: "Genome Research"
central_claim: "Galaxy Notebooks make the communication of an analysis reproducible by turning a documented history into the report, interface, and provenance-aware extraction surface for a reusable workflow."
related_projects:
  - "[[history_markdown]]"
created: 2026-05-17
revised: 2026-05-20
revision: 3
ai_generated: false
summary: "Paper workspace for Galaxy Notebooks as reproducible analysis communication and notebook-driven workflow extraction."
---

# Galaxy Notebooks

## Working Claim

Galaxy histories already make computation inspectable. Galaxy Notebooks add a durable narrative layer that can travel with that computation: a documented history can define the outputs that matter, seed a workflow report, and drive graph-backed workflow extraction.

## Current Emphasis

The paper should not center on "pages have chat." Chat is one authoring path. The publishable claim is that the communication of an analysis becomes versioned, attributable, and coupled to the provenance graph.

## Target Ladder

Aim high but maintain a credible retreat path. Draft once at the highest target's length; fallbacks are trim operations on that draft, not rewrites.

**Primary — Genome Research, Methods/Resource, ~6000–8000 words.** Same Planemo-precedent playbook as the gxwf paper. The history-as-narrative artifact is novel enough on its own; empirical weight comes from worked examples of documented histories driving workflow extraction (3–5 vignettes covering solo human, human+in-app AI, external agent via API). A PhD contributor bringing a real lab analysis as a vignette materially strengthens this — the more concrete the science behind even one vignette, the better.

**Fallback 1 — Bioinformatics Original Paper, ~5000 words.** Trim from the GR draft: drop one of the three usage-mode vignettes; collapse "page extraction → workflow report" into a single section instead of two; demote architectural detail (Pages backend, model-sharing with Reports) to a paragraph; tighten the reproducibility motivation prose.

**Fallback 2 — Bioinformatics Application Note, ~2000 words.** One usage vignette, no architectural detail, focus on the history→notebook→workflow path as a single contribution. Loses the "communication infrastructure" framing; reduces to "Galaxy now supports markdown notebooks on histories." Submit only if the higher venues won't land in time.

**Off-ladder alternatives.** F1000Research (open peer review, fast) or JOSS (software-only) if the paper needs to exist for citation purposes faster than traditional review allows. PLoS Computational Biology if a strong reproducibility-policy angle emerges in revision.

## Workspace

- [outline](./outline/)
- [evidence](./evidence/)
- [figures](./figures/)
- [demo](./demo/)
- [glossary](./glossary/)
- [tasks](./tasks/)
- [manuscript](./manuscript/)
- [references](./references/)
