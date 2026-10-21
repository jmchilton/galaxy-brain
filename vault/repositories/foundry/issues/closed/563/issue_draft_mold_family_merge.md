# Issue draft: one Galaxy design Mold family

Status: posted 2026-10-21 as [#694](https://github.com/galaxyproject/foundry/issues/694), on John's OK. No @-mentions.

**Title:** Build the direct Galaxy routes on the Workflow Brief Molds and retire the freeform Galaxy design Molds

---

🤖 *Drafted by Claude for jmchilton from the #563 brief runs. They reviewed the runs and decided the questions below.*

When #605 restored the direct routes, it left two parallel Galaxy design Mold families: `freeform-summary-to-galaxy-{interface,data-flow,template,test-plan}` and `workflow-brief-to-galaxy-{interface,data-flow,template,test-plan}`. On 2026-10-14 we decided to keep both and revisit a merge once the brief route had real runs. Run 3 was that test: one paper and one scope, sent through both routes.

**Proposal:** keep PAPER → GALAXY and INTERVIEW → GALAXY as direct builds (same routes, `journey/direct-build`, no review stop), but run them on the brief Molds. Direct build produces a Workflow Brief internally, accepts its proposals without stopping, and continues into the `workflow-brief-to-galaxy-*` chain. Plan & Build keeps its expert-review stop. The four `freeform-summary-to-galaxy-*` Molds are then retired.

This does not bring back #567. The brief stays a route you choose. Direct-build users don't get a forced pause, and the only thing that changes is which Molds run behind the route.

It also avoids the cost we flagged on 10-14. The merge we rejected then meant one Mold with a branching authority rule ("if a brief is present it governs, otherwise the summary does"). Here a brief is always present, so there is no branch.

## Evidence (run 3, n = 1)

Paper: Vogels et al. 2024, *BMC Genomics* 25:433 (DengueSeq). Methods are not Galaxy-based and the linked code is pinned. Scope: Illumina DENV3 amplicon consensus, variants and per-base depth. Same sources and selection in both arms, and the same plugin (`f275059e`, after #688).

| | Brief route | Direct route |
|---|---|---|
| Scope held | yes | yes |
| Workflow | bwa_mem → samtools_view → ivar_trim -e → ivar consensus/variants → sed, plus bedtools genomecov | same topology, older wrapper revisions, plus an awk step |
| Depth / frequency / GTF | 10 / 0.75 / none, recorded as reviewed decisions | 10 / 0.75 / none, made as silent agent choices |
| planemo | green | 1 assertion red (whole-line `has_line_matching`) |
| Cost | $3 (brief) + $34 (Galaxy) | $23 |

- The two families converged on the same workflow. Their design Molds don't separate them.
- What the brief added:
  - each judgment call became a recorded ledger decision with its evidence, and was listed at Done (#688);
  - more verification: the brief route ran the source's commands and got a byte-identical consensus, measured the iVar wrappers' BAQ-off difference, and found that the published consensus sits on a different BioSample.
- The red/green split comes from test-assertion guidance (the same defect hit a run-2 Nextflow run), not from the Mold family.

Confounds:
- n = 1.
- The brief arm got one expert edit, which carried a fact the direct arm had found.
- The direct arm upgraded a global CLI that the brief arm then used.
- The budget caps differed, but neither bound.
- Some of the extra verification traces back to brief open questions (one prompted the GenBank lookup). The rest may be run-to-run variance.
- No interview-sourced run has been through either route. INTERVIEW → GALAXY converts on the strength of the shared freeform handoff, since `interview-to-freeform-summary` and `summarize-paper` emit the same summary.

## Contract changes this needs

- **Own phase lists.** The brief pipelines can't simply be chained. `paper-to-workflow-brief` stops for expert editing, and `workflow-brief-to-galaxy` stops without a recorded review. Each direct route becomes its summarizer → `freeform-summary-to-workflow-brief` → the `workflow-brief-to-galaxy-*` chain, with its own harness notes.
- **Review gate.** Direct build records an explicit "no review, proposals accepted by default" path in place of the expert review. The brief hash check starts when the brief is emitted.
- **Ledger provenance.** This changes behaviour, not just a label. A Mold that finds a `brief-proposal` answer wrong must keep using it, record a brief-change recommendation, and stop if correctness depends on it. That is right for a reviewed answer. Unreviewed, it turns every wrong guess into a mid-run stop. Add `basis: unreviewed-proposal`: it adopts the brief's proposal like `brief-proposal`, but a later Mold supersedes it like an `agent` decision.
- **Test data.** PAPER → GALAXY keeps `paper-to-test-data` in its test-data branch. Run 3's direct arm got its test data from it, and `workflow-brief-to-galaxy` doesn't have it.
- **Done report.** Direct build reports every open-question answer and every brief-change recommendation, low confidence first. That keeps the user's feedback without making them answer anything mid-run.
- **Blockers still stop.** This matches #605 ("can still stop on blockers"), but it changes behaviour for direct users: an ambiguous selection becomes a stop instead of a guess.

## Scope

- In: PAPER → GALAXY and INTERVIEW → GALAXY, and retiring the four `freeform-summary-to-galaxy-*` Molds along with the references to them in other Molds, schemas and research notes.
- Out: `freeform-summary-to-cwl-design` and the CWL target. `freeform-summary-to-workflow-brief` stays, since it is the brief producer. UPDATE INTERVIEW → GALAXY uses its own changeset Molds and is unaffected.

## Decided

- Unreviewed proposals get a new `basis` value rather than reusing `agent`, so a reader can still tell an adopted proposal from a Mold's own answer.
- INTERVIEW → GALAXY converts in the same change.
- The higher direct-build cost is accepted for now. Measure it on later runs before trimming any verification.

Refs #563, #567, #605, #688.
