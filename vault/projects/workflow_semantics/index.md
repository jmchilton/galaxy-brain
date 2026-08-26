---
type: project
title: "Workflow Semantics"
tags:
  - project
  - galaxy/workflows
status: draft
created: 2026-08-25
revised: 2026-08-26
revision: 2
ai_generated: true
github_issue: 22200
summary: "Formalizing Galaxy workflow evaluation semantics into a CI-validated documentation artifact, per issue #22200."
---

# Workflow Semantics

Tracking issue: [galaxyproject/galaxy#22200](https://github.com/galaxyproject/galaxy/issues/22200)
— asks for an *actionable* workflow-semantics artifact modelled on
`collection_semantics.yml`: prose → examples → concrete test references, so the
workflow editor, workflow runtime, tool runtime, and CLI validation can all be
checked against one source of truth. See also [[collection_semantics]], the
precedent this imitates.

Notes moved here 2026-08-25 from untracked markdown in the
`workflow_semantics` galaxy worktree; progress is tracked in this vault from now on.

## Where things stand

| | |
|---|---|
| First attempt | PR #22217 — closed 2026-03-23, ~1 day old (see status doc §2) |
| Open PR | [#23369](https://github.com/galaxyproject/galaxy/pull/23369) — reviewed 2026-08-26 and **split in two**; see the review-state note |
| Landed PJA fixes | #23328 / #23330 / #23334 |
| The real deliverable | still ahead — `workflow_semantics.yml` + CI-validated linkage (status doc §5, PR-B) |

## Current notes

- **`WORKFLOW_SEMANTICS_STATUS.md`** — the master document. Status capture,
  re-review of the original branch against dev, per-artifact verdicts, the
  recommended PR plan (PR-B..PR-F), the duplicate-detection results, and the
  open questions. Start here; everything else is input to it.
- **`workflow_semantics_facts.yml`** — the 140-record fact corpus (118 with a
  `test:` ref, 22 code-analysis-only). Byte-identical to the [public gist](https://gist.github.com/jmchilton/6f6dc82eacaececdc76367569ccb2a5b)
  linked from #22200. This is what PR-B seeds from — filtered to facts whose
  refs still resolve on dev, with line anchors replaced by symbol anchors
  (93% of line anchors rotted in five months; 0% of named-test refs did).
- **`SUBCOLLECTION_WHEN_REVIEW_STATE.md`** — mvdbeek's 2026-08-26 review of #23369, the
  two branches it was split into, what was verified locally, and the seven open items.
- **`PR_UNCONDITIONAL_WHEN_VALUES_DESCRIPTION.md`** — description for the first half:
  the all-`None` collapse, the framework test, the unconditional docs. Branch
  `subworkflow_mapping_per_step_semantics`.
- **`PR_WHEN_ALIGNMENT_DESCRIPTION.md`** — description for the second half: the
  `is_aligned_with` guard, API + unit tests, conditional docs. Branch
  `subworkflow_mapping_when_alignment`, stacked on the first.
- **`WF_SEMANTICS_FACT_QUESTIONS.md`** — the Q1–Q21 question set plus §2's extra
  fact records. **Read with the status doc's §3.8 corrections in hand:** Q1, Q18
  and Q19 are wrong, Q6 was the one genuinely unanswered question, and §2's 15
  `- test:` records duplicate lines 412–500 of the facts YAML.
- **`RESEARCH_GAPS_HIGH_PRIORITY.md`** — Q1 (job failure propagation), Q2 (pause
  step deps), Q14 (scheduling iteration state). Q1's "Path 2" answer here is the
  highest-value known error; §3.8 has the corrected three-path account.
- **`RESEARCH_GAPS_MEDIUM_PRIORITY.md`** — Q12 (format_source), Q13 (timeout job
  cleanup), Q16 (nested error tracing), Q19 (job cache invalidation), Q20 (nested
  PJA substitution). Q19 is incomplete per §3.8.
- **`COMPONENT_GALAXY_WORKFLOW_EXPRESSION_CONTEXT.md`** — reference on how
  `when` / `value_from` expressions are evaluated (CWL JS via `cwl_utils`,
  `cwlNodeEngine.js` globals, Galaxy↔CWL type conversion).

## old_plans/

Superseded — kept for provenance, not for following.

- **`MEDIUM_PRIORITY_TEST_PLAN.md`** — 4 tests from the medium-priority gaps.
  Written, then mostly dropped or folded into existing fixtures by the
  duplicate-detection pass (status doc §5, PR-E).
- **`NULL_CHAIN_AND_MAPPING_COMBINATION_TESTS.md`** — test plan for Q4 (null
  propagation chains) and Q10 (subworkflow mapping combination). Same fate: Q10's
  file survives as PR-D, the null-chain files fold into `filter_null.gxwf.yml`.
- **`SUBCOLLECTION_WHEN_PR_DESCRIPTION.md`** — the combined description as posted on
  #23369, before the split. Superseded by the two descriptions above.
- **`WHEN_SUBCOLLECTION_ISSUE.md`** — 2026-08-23 session handoff for the
  subworkflow/`when` collection-mapping bug. Superseded by PR #23369; its cited
  HEAD (`950bd75e`) is stale.
