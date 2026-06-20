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
paper_stage: drafting
paper_kind: methods
target_venue: "Genome Research"
central_claim: "Galaxy Notebooks make the communication of an analysis reproducible by turning a documented history into the report, interface, and provenance-aware extraction surface for a reusable workflow."
related_projects:
  - "[[history_markdown]]"
authors:
  - name: John Chilton
  - name: Marius van den Beek
  - name: Dannon Baker
  - name: Ahmed Hamid Awan
  - name: Anton Nekrutenko
created: 2026-05-17
revised: 2026-06-20
revision: 5
ai_generated: false
summary: "Paper workspace for Galaxy Notebooks as reproducible analysis communication and notebook-driven workflow extraction."
---

# Galaxy Notebooks

## Working Claim

Galaxy histories already make computation inspectable. Galaxy Notebooks add a durable narrative layer that can travel with that computation: a documented history can define the outputs that matter, seed a workflow report, and drive graph-backed workflow extraction.

## Current Emphasis

The paper should not center on "pages have chat." Chat is one authoring path. The publishable claim is that the communication of an analysis becomes versioned, attributable, and coupled to the provenance graph.

## Target

**Genome Research, Methods/Resource, ~6000–8000 words.** Same Planemo-precedent playbook as the gxwf paper. The history-as-narrative artifact is novel enough on its own; empirical weight comes from the three worked extraction vignettes (mobile resistome, differential ATAC-seq, differential ChIP) — documented histories driving workflow extraction across a clean byte-identical baseline, a richer notebook-to-results workflow, and a topological limit resolved by splitting. The three authoring modes (solo human, human + in-app AI, external agent via API) are the user model, not the empirical centerpiece; agent authoring is shown as an authoring path, not benchmarked. A real lab analysis contributed by a domain researcher would strengthen breadth further.

## Workspace

- [outline](../outline/)
- [evidence](../evidence/)
- [figures](../figures/)
- [demo](../demo/)
- [glossary](../glossary/)
- [tasks](../tasks/)
- [manuscript](../manuscript/)
- [supporting information](../supporting-information/)
