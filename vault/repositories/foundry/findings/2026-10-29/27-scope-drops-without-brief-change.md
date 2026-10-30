# Design Molds drop brief-scoped work as `kind: dropped` and never raise a brief-change recommendation

- Target: galaxyproject/foundry (`content/research/open-requirements-ledger/index.md` "Record a drop as a drop" and the open-question bullets; the template and data-flow Molds; pipeline `eval.md`). There is also a process part for us (the driver imposed the step budget), see the end. Foundry tracking needed: no, the target issue is the tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phases 2 and 4 (data-flow rev 4, template rev 8) and the close, 2026-10-29. Not in the feedback ledger. The driver flagged it in `run-summary.md` ("BCRs added by the orchestrator at close; no child raised one — miss").
- Existing issues/PRs: none. Related: finding [01](01-template-design-precedence.md) (who may change topology), [#694](https://github.com/galaxyproject/foundry/issues/694)/PR #696 (adds `unreviewed-proposal` provenance to the same ledger section; coordinate), #669/#670 (repair may not edit the interface).

## Symptom
The brief kept controls, all four aligners, ataqv/mkarv and DESeq2 QC in scope (accepted open-question proposals). The build couldn't honour them. Data-flow recorded `ataqv-mkarv-not-built` and `deseq2-qc-substituted`. The template recorded `alt-aligners-dropped` and `controls-branch-dropped` (because: "Orchestrator step budget (~100-130 loop steps ...)"), plus four more drops. All of these are `kind: dropped` obligation entries. No phase raised a brief-change recommendation. The orchestrator added four BCRs at close (`bcr-aligner-scope`, `bcr-controls-scope`, `bcr-ataqv-and-deseq2-qc-substitutes`, `bcr-macs-gsize-exact-count`, all `raised_by: pipeline-workflow-brief-to-galaxy (orchestrator)`). The pipeline eval's "scope remains governed" got ⚠️ (16 cited drops).

## Root cause
Confirmed. Two ledger rules each cover half the case, and nothing joins them:
- Open-question bullet (`open-requirements-ledger/index.md:141`): "A Mold that finds an accepted proposal **wrong** ... records a brief-change recommendation ... It keeps using the accepted answer." It covers a wrong proposal, not one the build can't afford or can't realise (no wrapper, too many steps).
- "Record a drop as a drop" (`:162-168`): "When a decision removes source work from what the run will carry — narrowing a design, cutting a plane ... append a `kind: dropped` entry". It frames drops as removing *source* work. It never says that removing work the *brief* puts in scope changes expert intent, which `:120-122` defines as BCR territory.
- The template and data-flow Molds don't mention proposals, drops or BCRs (grep). The pipeline eval (`eval.md:13-21`) checks that BCRs are classified, not that a narrowing of brief scope produced one.
So a design Mold sees "narrowing a design" and follows the drop rule, which looks complete.

## Evidence
Run `open-requirements.ledger.yml`: 16 `dropped` entries (`raised_by` interface ×4, data-flow ×3, template ×6, loop ×3), and `brief_change_recommendations` (4, all orchestrator). The `alt-aligners-dropped` and `controls-branch-dropped` `because` fields cite the orchestrator step budget, not a source or wrapper fact.

## Proposed fix
1. Ledger note: when a drop removes work that the reviewed brief, or an accepted proposal, keeps in scope, the Mold records the `dropped` entry **and** a BCR (`status: proposed`) linking it. If correctness depends on the work, stop per `:120`. Drops of source work the brief already excludes, or leaves to the agent, need no BCR.
2. Template and data-flow Molds: one sentence pointing to that rule.
3. Pipeline eval: every `dropped` entry whose units are in brief scope has a linked BCR raised by the dropping Mold.

## Draft issue
**Title:** Dropping brief-scoped work records `kind: dropped` but no brief-change recommendation

In an nf-core/atacseq Workflow Brief → Galaxy run (2026-10-29), the reviewed brief kept controls, four aligners, ataqv/mkarv and DESeq2 QC in scope (accepted open-question proposals). Data-flow and template dropped them (no wrapper, step count) and recorded only `kind: dropped` entries. No phase raised a brief-change recommendation. The orchestrator added four at close.

The ledger note tells a Mold to raise a BCR when it finds an accepted proposal *wrong* (`index.md:141`), and to record a `dropped` entry when it narrows *source* work (`:162`). It doesn't say that dropping work the brief keeps in scope changes expert intent and so needs a BCR as well. The design Molds don't mention BCRs.

Proposal: require a linked BCR (`proposed`) for every drop of brief-scoped work; say so in the template and data-flow Molds; add a pipeline eval check. Coordinate with PR #696, which edits the same section.

## Process part (ours, fix now)
The step budget in `alt-aligners-dropped`/`controls-branch-dropped` came from the driver's phase-4 prompt. It isn't in the saved `CHILD_PREAMBLE.md`/`LOOP_PROMPT.md` or in our agent docs. The coordinator should tell drivers not to impose step budgets that narrow brief scope. A host limit should be reported as a run risk, or raised as a BCR, not used as a drop reason.
