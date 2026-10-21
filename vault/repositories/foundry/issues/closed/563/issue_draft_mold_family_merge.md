# Issue draft: one Galaxy design Mold family

Status: draft. Not opened. Open only on John's OK. No @-mentions.

**Title:** Build PAPER → GALAXY on the Workflow Brief Molds and retire the freeform Galaxy design Molds

---

🤖 *Drafted by Claude for jmchilton from the #563 brief runs. They reviewed the runs. This proposal is open for discussion.*

When #605 restored the direct routes, it left two parallel Galaxy design Mold families: `freeform-summary-to-galaxy-{interface,data-flow,template,test-plan}` and `workflow-brief-to-galaxy-{interface,data-flow,template,test-plan}`. On 2026-10-14 we decided to keep both and revisit a merge once the brief route had real runs. Run 3 was that test: one paper and one scope, sent through both routes.

**Proposal:** keep PAPER → GALAXY as a direct build (same route, `journey/direct-build`, no review stop), but run it on the brief Molds. Direct build would produce a Workflow Brief internally, accept its proposals without stopping, and continue into the `workflow-brief-to-galaxy-*` chain. Plan & Build keeps its expert-review stop.

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
- The Galaxy phase cost more on the brief route, so expect a merged direct route to cost more than today's.

## Contract changes this needs

- **Review gate.** `workflow-brief-to-galaxy` refuses to start without a recorded expert review. Direct build needs an explicit "no review, proposals accepted by default" path, recorded in the run record.
- **Ledger provenance.** The ledger defines `basis: brief-proposal` only as adopting the brief's proposal, and its example says "accepted at review". In a direct run nobody reviewed anything. Pick one way to record that: a new basis value, a `reviewed: false` field, or a run-level marker.
- **Done report.** Direct build reports every open-question answer and every brief-change recommendation, low confidence first. That keeps the user's feedback without making them answer anything mid-run.
- **Blockers still stop.** This matches #605 ("can still stop on blockers"), but it changes behaviour for direct users: an ambiguous selection becomes a stop instead of a guess.

## Scope

- In: PAPER → GALAXY, and retiring the four `freeform-summary-to-galaxy-*` Molds once nothing uses them.
- INTERVIEW → GALAXY (`reviewed`) uses the same four Molds, but run 3 didn't exercise it. Convert it only after one interview-sourced run, or keep the freeform Molds until then.
- Out: `freeform-summary-to-cwl-design` and the CWL target, and `freeform-summary-to-workflow-brief` (it stays, since it is the brief producer).

## Open questions

- Convert INTERVIEW → GALAXY in the same change, or after an interview run?
- How should the ledger mark unreviewed proposals: a new `basis` value, a field, or a run-level marker?
- Is the higher direct-build cost acceptable, or should direct mode skip some of the brief-route verification?

Refs #563, #567, #605, #688.
