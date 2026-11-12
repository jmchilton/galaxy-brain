---
related_records:
  - foundry/issues/784
  - foundry/issues/796
  - foundry/branches/issue-798-nextflow-scope-decisions
---

# #798 nextflow-to-galaxy: multi-path pipelines (Sarek) collapse to one path without surfacing the alternatives

[Issue](https://github.com/galaxyproject/foundry/issues/798). Labels: `roadmap/off`, `priority/mvp`, `work/in-progress`. Branch [`issue-798-nextflow-scope-decisions`](../../../branches/active/issue-798-nextflow-scope-decisions/index.md), stacked on #818; no PR yet. Triaged 2026-11-11 against `origin/main` `8cbb5f22`, together with #784 ([record](../../wip/784/index.md)).

## Labels

Applied 2026-11-11.

- `roadmap/off`: no backbone fits. Closest is #500 (interviews), and only for proposal 2.
- `priority/mvp`: a silent scope cut fails the pipeline's own eval (`content/pipelines/nextflow-to-galaxy/eval.md`, "none is silently dropped").
- `work/ready-implement`: flipped 2026-11-11 after John agreed the plan was settled.
- `work/in-progress`: swapped in 2026-11-12 when the implementation agent claimed it.

## Derived status

`wip`, rule 2: `work/in-progress` and branch `issue-798-nextflow-scope-decisions` (2026-11-12).

## Findings

Verified:

- **Summarize already detects some of this.** `summarize-nextflow` records `workflow.conditionals[]` and classifies `profiles[]` by body, so sarek's `mutect` profile shows up as test evidence. When several primary candidates tie it returns `test_selection.status: needs-scope-choice` (index.md:408). The sarek refinement (`refinements/2026-05-08-sarek-emulation.md`) shows the `step`, `aligner` and `tools` guards are captured. Proposal 1 is mostly there already; reporting "available paths" as a list of their own would be new.
- **No design Mold reads `test_selection`.** Only `nextflow-test-to-galaxy-test-plan` uses it (and it already says to "keep deferred science branches visible"). Interface, data-flow and template ignore it. So the claim that the extraction is "anchored on the test profile trace" does not describe what the Molds say. More likely, the agent narrows scope ad hoc with no Mold telling it how.
- **The outcome is already specified.** The `nf-core/sarek capped at 5 steps` scenario (`scenarios.md:76-83`) expects `step`/`tools`/`aligner` to "survive into the interface and data-flow briefs as scope decisions", with the partial scope "stated explicitly". The eval property requires the same. The ledger already has places to record it: `decisions` and `kind: dropped` entries with `units` and `because`. No Mold tells the run to write a scope decision there.
- **Proposal 2 (interactive prompt) conflicts with the direct pipeline.** The ledger note says the pipeline is autonomous, with "no human-in-the-loop gate". The existing route for a caller-chosen scope is `nextflow-to-workflow-brief` → `workflow-brief-to-galaxy`: the caller supplies the scope, and an ambiguous one becomes a brief blocker. A real interview belongs under #500.
- **Proposal 3 (companion workflows):** nothing suggests a family of workflows today.

Not verified:

- No run folder is cited. I didn't run summarize on sarek to see whether `test_selection` comes back `selected` or `needs-scope-choice`.

## Shared model with #784, #796, #781

All four concern one thing: an inventory of source units, each given a disposition (carried / subsumed / dropped with a cited reason / out of the selected scope). This is close to the conservation rule that `open-requirements-ledger` :225 leaves "deliberately not attempted". John closed that as #480 in favour of #479's labels. The approach to propose instead: diff the artifacts and require a label for each difference, with no totals. See [#796](../796/index.md).

- #798 writes the out-of-scope dispositions at design time.
- #784 renders them at the end and diffs the final workflow against the source.
- #796 enforces the same inventory in the test phase.
- #781 is the parameter (`ext.args`) slice.

Decided (John, 2026-11-11): keep the issues separate, all `roadmap/off`, hybrid placement. The scope decisions recorded here become rows in #784's Nextflow parity Mold, which only reports.

## Implementation

2026-11-12, branch `issue-798-nextflow-scope-decisions` (see its [debrief](../../../branches/active/issue-798-nextflow-scope-decisions/implementation_debrief.md)). The interface Mold owns the scope: a ledger decision with `scope` plus a `kind: dropped` entry with `scope_branch` per excluded branch family, no top-level `step`, no `source_arg`. Data-flow designs inside it. Research-comment questions answered there: interface owns it; units are branch families named by summary subworkflows/processes; no `branch_controls[]`; interactive selection stays with the brief journey / #500.
