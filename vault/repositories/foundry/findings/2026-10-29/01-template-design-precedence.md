# IWC comparison makes topology decisions, and the template Mold has no rule for brief vs later decision

- Target: galaxyproject/foundry (Mold and ledger-protocol wording; nothing upstream is involved). Foundry tracking needed: no, the target issue is the tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29, phases 3 (compare-against-iwc-exemplar) and 4 (workflow-brief-to-galaxy-template), 2026-10-29, foundry_head 9f83fd55 (Mold text unchanged at worktree HEAD 8758f9ee)
- Existing issues/PRs: none filed for this. Related: [#318](https://github.com/galaxyproject/foundry/issues/318) (how Molds coordinate on the draft); open [PR #696](https://github.com/galaxyproject/foundry/pull/696) rewrites the same ledger supersession bullet (adds `unreviewed-proposal`) but sets no precedence rule, so a fix there would conflict.

## Symptom
Phase 2's data-flow brief placed `N3 flatten_fastqc_for_report` after FastQC. Phase 3 recorded ledger decisions `flatten-reads-before-fastqc` and `fastqc-outputs-flat-list` (`decided_by: compare-against-iwc-exemplar`, `supersedes:` the phase-2 decisions). Phase 4 followed them, not the brief, and had to invent the precedence rule itself (decision `template-follows-superseding-flatten-decision`; feedback `template-mold-silent-on-brief-vs-superseding-ledger-decision`). The result was correct (6 distinct MultiQC rows at runtime), but which phase has the authority was improvised.

## Root cause
Stated cause verified. Three documents disagree on who may change topology:
1. compare-against-iwc-exemplar says it only advises ("No automatic rewrite... the harness or user decides which changes to apply"; findings are "surfaced for the downstream Galaxy template Mold to apply"), yet its ledger reference tells it to "Close the open entries a corpus exemplar answers". Nothing says it must not record or supersede decisions.
2. The ledger note's supersession rule is written only for decisions with `open_question` ("A later Mold that finds an `agent` decision wrong records its own decision... repeats `open_question`"). The superseded `flatten-fastqc-before-multiqc` has no `open_question`, so phase 3 applied the rule by analogy to an ordinary design decision.
3. The template Mold says topology "is this Mold's job to settle" and the briefs "guide" it, but never says how to treat a current ledger decision that contradicts a brief. Its eval checks the data-flow brief's "operations and their order", which a legitimate change of order breaks.

## Evidence
- `content/molds/compare-against-iwc-exemplar/index.md:133,138,155` (advisory wording); `:60` ledger reference purpose ("Close the open entries...").
- `content/research/open-requirements-ledger/index.md:120` (decision = choice "the run" may make; does not say which Mold); `:142` (supersession only for `open_question` decisions); `:148` ("A current open-question decision is the answer to follow").
- `content/molds/workflow-brief-to-galaxy-template/index.md:29` (IWC notes "steer" the skeleton), `:176` (briefs "guide"; template settles topology).
- `content/molds/workflow-brief-to-galaxy-template/eval.md:39-44` ("operations and their order").
- Run: `open-requirements.ledger.yml:286-325` (the three decisions); `iwc-comparison-notes.md:56` (D1: "Recommendation adopted as ledger decision"); `workflow-brief-galaxy-data-flow.md:83-113` (N3 after FastQC, mitigation named); `foundry-feedback.ledger.yml:103-117`; `run-summary.md:20`.
- `git diff --stat 9f83fd55 HEAD` over these Molds, the pipeline and research: empty.

## Proposed fix
Make the template Mold, which owns topology, the only place a design-brief decision gets overridden:
- compare-against-iwc-exemplar: may record discoveries and close obligations, but must not record or supersede `decisions`. A topology change goes in `iwc-comparison-notes.md` as a recommendation (and optionally as a discovery cited as evidence).
- workflow-brief-to-galaxy-template: precedence order is reviewed brief, then current `brief-proposal` decisions, then design briefs and their `agent` decisions, then IWC recommendations. When it departs from the data-flow brief, it records a decision that `supersedes` the data-flow decision, cites the IWC finding, and says which it followed.
- Ledger note: extend the supersession bullet to `agent` decisions without `open_question`, restricted to a Mold that owns that decision's surface. Coordinate with PR #696, which edits the same bullet.
- Template eval: "the data-flow brief's operations, and their order as amended by current ledger decisions the template records".
- Rejected alternative: let phase 3 decide. That splits topology ownership across two Molds and contradicts "No automatic rewrite".

## Draft issue
**Title:** compare-against-iwc-exemplar overrides data-flow decisions; template Mold has no precedence rule

In a workflow-brief-to-galaxy run (nf-core/demo, 2026-10-29) the data-flow brief placed a `__FLATTEN__` after FastQC. compare-against-iwc-exemplar found the IWC rnaseq-pe idiom (flatten raw reads, FastQC over the flat list, MultiQC) and recorded ledger decision `flatten-reads-before-fastqc`, superseding the data-flow decision. The template Mold followed the ledger, and had to make up a rule to justify it. The result was correct, but the authority was improvised:

- `compare-against-iwc-exemplar/index.md` says "No automatic rewrite" and routes topology findings "for the downstream Galaxy template Mold to apply". It also says to "close the open entries a corpus exemplar answers", and nothing forbids it from writing decisions.
- `open-requirements-ledger` allows superseding an `agent` decision only for decisions that carry `open_question`. Ordinary design decisions have no rule.
- `workflow-brief-to-galaxy-template` says the design briefs "guide" topology but not what wins when a current ledger decision contradicts them. Its eval property "reviewed intent and open questions survive" checks the data-flow brief's operations "and their order".

Proposal:
1. compare-against-iwc-exemplar records recommendations (notes and discoveries) and closes obligations, but never records or supersedes `decisions`.
2. The template Mold states the precedence order (brief, then `brief-proposal` decisions, then design briefs and their `agent` decisions, then IWC recommendations). When it adopts an IWC recommendation that changes the data-flow brief, it records a superseding decision that cites the finding.
3. The ledger note allows superseding non-open-question `agent` decisions, only by the Mold that owns that surface. PR #696 rewrites the same bullet, so coordinate with it.
4. Reword the template eval to "operations, and their order as amended by current ledger decisions".

Evidence: run ledger decisions `flatten-fastqc-before-multiqc`, `flatten-reads-before-fastqc`, `template-follows-superseding-flatten-decision`; feedback `template-mold-silent-on-brief-vs-superseding-ledger-decision`.
