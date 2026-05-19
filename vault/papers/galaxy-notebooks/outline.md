# Outline

## One-Sentence Version

Galaxy Notebooks turn a documented Galaxy history into a reproducible communication artifact: narrative, outputs, provenance graph, and extracted workflow report stay connected.

## Reader

Bioinformatics readers who know Galaxy histories and workflows but do not yet see documentation as part of the reproducibility surface.

## Proposed Structure

1. Problem: histories preserve execution but not communicative intent.
2. Design: history-attached notebooks reuse Galaxy Pages, revisions, sharing, and API.
3. Authoring modes: human solo, human plus in-app agent, external agent via API.
4. Narrative-to-workflow: notebook references identify meaningful outputs; graph walk recovers provenance.
5. Graph confirmation: users review the extracted structure visually, not from a flat job list.
6. Report continuity: the notebook seeds the extracted workflow report.
7. Evaluation: implementation scope, tests, demo scenario, and extraction prototype.

## Do Not Let This Become

- A generic "AI chat in Galaxy" paper.
- A Pages refactor paper.
- A workflow extraction paper that forgets the notebook narrative.
