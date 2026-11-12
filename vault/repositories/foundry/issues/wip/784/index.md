---
related_records:
  - foundry/issues/798
  - foundry/issues/796
  - foundry/issues/781
  - foundry/issues/800
  - foundry/branches/issue-784-nextflow-parity-report
---

# #784 nextflow-to-galaxy: emit a Nextflow-vs-Galaxy divergence report at the end of the run

[Issue](https://github.com/galaxyproject/foundry/issues/784). Labels: `priority/mvp`, `roadmap/off`, `work/in-progress`, `BioHackEU26`. Branch [`issue-784-nextflow-parity-report`](../../../branches/active/issue-784-nextflow-parity-report/index.md), stacked on #821; claimed 2026-11-12 (`work/in-progress`). Stack plan: [stack_plan.md](stack_plan.md). John commented "This is such a good idea!" (2026-11-10). arash77's comment (2026-11-11) says the report must diff the final workflow against the source and not trust only the ledger's `kind: dropped` entries. Triaged 2026-11-11 against `origin/main` `8cbb5f22`, together with #798 ([record](../798/index.md)).

## Labels

Applied 2026-11-11. Keep `BioHackEU26`.

- `roadmap/off`: John, 2026-11-11, keeps all four issues off the roadmap (#332 had been proposed as parent).
- `priority/mvp`: John, 2026-11-11.
- `work/ready-implement`: flipped 2026-11-11 after John agreed the plan was settled.

## Decided placement (John, 2026-11-11: hybrid, report only)

A new Nextflow parity Mold runs after the test, in the `nextflow-summary-to-galaxy-*` family. Its inputs are `summary-nextflow.json`, the ledger, the draft snapshot, #796's `gxwf` diff and the final workflow. It renders #781's flag parity, #798's scope rows and this report. It only reports: an unlabelled removal it finds does not send the run back into the test loop.

## Derived status

`wip`, rule 2: `work/in-progress` and branch `issue-784-nextflow-parity-report` (2026-11-12).

## Findings

Verified:

- **The inputs exist.** `summary-nextflow.json`, the ledger (`entries` with `kind: dropped`/`units`/`because`, plus `decisions` and `discoveries`) and the final workflow.
- **No Mold runs after the test in the pipeline.** `content/pipelines/nextflow-to-galaxy/index.md` phases end at `debug-galaxy-workflow-output`. A new Mold, or #332's finalize step, would need to be added.
- **The ledger note names the missing piece.** `open-requirements-ledger` :225 says nothing totals the drops, and leaves the conservation rule "deliberately not attempted". John chose #479's labels over #480's counting on 2026-08-30, so this report should list labelled differences, not totals.
- **arash's comment matches #796.** Two bamtofastq runs (iwc-lab#7, #8) changed the workflow without a ledger entry. So a report built only from the ledger would show those cuts as carried. The source-vs-final diff they need is the same computation as #796's conservation check.

Not verified: tool-version parity (section 2). I didn't check whether the summary records container/conda versions in a form that can be compared with wrapper requirements.

## Overlap

- [#796](../../wip/796/index.md), diff gate in the test phase: it should produce the diff that this report renders. Don't build the diff twice.
- [#781](../781/index.md), `ext.args` parity: section 3 links to it or includes it, as the issue already says.
- #798: scope exclusions decided at design time feed the "dropped / out of scope" rows here.
- #731, #656: shape checks within Galaxy. Not source parity.

## Next

- Implemented on `issue-784-nextflow-parity-report` (2026-11-12): Mold `nextflow-summary-to-galaxy-parity`, `foundry nextflow-parity`, and `foundry check-scope-records` (#798 issue F, folded in pending John's answer). Remaining: reviews, harden, polish, draft PR. Open questions in the branch's [implementation_debrief.md](../../../branches/active/issue-784-nextflow-parity-report/implementation_debrief.md).
