---
related_records:
  - foundry/issues/798
  - foundry/issues/796
  - foundry/issues/781
---

# #784 nextflow-to-galaxy: emit a Nextflow-vs-Galaxy divergence report at the end of the run

[Issue](https://github.com/galaxyproject/foundry/issues/784). Labels: `needs-triage`, `BioHackEU26`. No PR or branch. John commented "This is such a good idea!" (2026-11-10). arash77's comment (2026-11-11) says the report must diff the final workflow against the source and not trust only the ledger's `kind: dropped` entries. Triaged 2026-11-11 against `origin/main` `8cbb5f22`, together with #798 ([record](../798/index.md)).

## Proposed labels

Staged in [issue_tags.md](issue_tags.md). Keep `BioHackEU26`.

- `roadmap/off`: John, 2026-11-11, keeps all four issues off the roadmap (#332 had been proposed as parent).
- `priority/v2`: it presents differences; it does not fix them. The correctness half is #796. Raise it to mvp if you want it for the paper.
- `work/ready-research`: arash's comment changes the design, and the diff overlaps #796.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3.

## Findings

Verified:

- **The inputs exist.** `summary-nextflow.json`, the ledger (`entries` with `kind: dropped`/`units`/`because`, plus `decisions` and `discoveries`) and the final workflow.
- **No Mold runs after the test in the pipeline.** `content/pipelines/nextflow-to-galaxy/index.md` phases end at `debug-galaxy-workflow-output`. A new Mold, or #332's finalize step, would need to be added.
- **The ledger note names the missing piece.** `open-requirements-ledger` :225 says nothing totals the drops, and leaves the conservation rule "deliberately not attempted". John chose #479's labels over #480's counting on 2026-08-30, so this report should list labelled differences, not totals.
- **arash's comment matches #796.** Two bamtofastq runs (iwc-lab#7, #8) changed the workflow without a ledger entry. So a report built only from the ledger would show those cuts as carried. The source-vs-final diff they need is the same computation as #796's conservation check.

Not verified: tool-version parity (section 2). I didn't check whether the summary records container/conda versions in a form that can be compared with wrapper requirements.

## Overlap

- [#796](../796/index.md), diff gate in the test phase: it should produce the diff that this report renders. Don't build the diff twice.
- [#781](../781/index.md), `ext.args` parity: section 3 links to it or includes it, as the issue already says.
- #798: scope exclusions decided at design time feed the "dropped / out of scope" rows here.
- #731, #656: shape checks within Galaxy. Not source parity.

## Next

- Once labels are applied: one research pass shared with #798. It defines the source units and their dispositions, says where the inventory lives (a ledger collection, or a file of its own), and splits the work between the #796 check and this report.
- Build order: #781 now; joint research on #796, #798 and #784; then #796's diff and #798's scope decisions in parallel; this report last. Its inputs are the #796 diff, the #798 decisions and the #781 report.
- John, 2026-11-11: no umbrella; all four stay `roadmap/off`. He leans strongly against adding new pipeline steps, which affects where this report and #796's gate go.
