---
related_records: foundry/issues/798
---

# #784 nextflow-to-galaxy: emit a Nextflow-vs-Galaxy divergence report at the end of the run

[Issue](https://github.com/galaxyproject/foundry/issues/784). Labels: `needs-triage`, `BioHackEU26`. No PR or branch. John commented "This is such a good idea!" (2026-11-10). arash77's comment (2026-11-11) says the report must diff the final workflow against the source and not trust only the ledger's `kind: dropped` entries. Triaged 2026-11-11 against `origin/main` `8cbb5f22`, together with #798 ([record](../798/index.md)).

## Proposed labels

Staged in [issue_tags.md](issue_tags.md). Keep `BioHackEU26`.

- `roadmap/substep`, parent #332 (finalize-workflow step), tentative: the report is something produced at the end of the run.
- `priority/v2`: it presents differences; it does not fix them. The correctness half is #796. Raise it to mvp if you want it for the paper.
- `work/ready-research`: arash's comment changes the design, and the diff overlaps #796.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3.

## Findings

Verified:

- **The inputs exist.** `summary-nextflow.json`, the ledger (`entries` with `kind: dropped`/`units`/`because`, plus `decisions` and `discoveries`) and the final workflow.
- **No Mold runs after the test in the pipeline.** `content/pipelines/nextflow-to-galaxy/index.md` phases end at `debug-galaxy-workflow-output`. A new Mold, or #332's finalize step, would need to be added.
- **The ledger note names the missing piece.** `open-requirements-ledger` :225 says nothing totals the drops, and leaves the conservation rule "deliberately not attempted".
- **arash's comment matches #796.** Two bamtofastq runs (iwc-lab#7, #8) changed the workflow without a ledger entry. So a report built only from the ledger would show those cuts as carried. The source-vs-final diff they need is the same computation as #796's conservation check.

Not verified: tool-version parity (section 2). I didn't check whether the summary records container/conda versions in a form that can be compared with wrapper requirements.

## Overlap

- #796, conservation check in the test phase (untriaged): it should produce the diff that this report renders. Don't build the diff twice.
- #781, `ext.args` parity (untriaged): section 3 links to it or includes it, as the issue already says.
- #798: scope exclusions decided at design time feed the "dropped / out of scope" rows here.
- #731, #656: shape checks within Galaxy. Not source parity.

## Next

- Once labels are applied: one research pass shared with #798. It defines the source units and their dispositions, says where the inventory lives (a ledger collection, or a file of its own), and splits the work between the #796 check and this report.
- Triage #796 and #781 in the same batch.
