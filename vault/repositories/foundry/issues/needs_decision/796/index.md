---
related_records:
  - foundry/issues/784
  - foundry/issues/798
  - foundry/issues/781
---

# #796 Test phase: steps removed to make planemo test pass are never checked against the extracted workflow or restored

[Issue](https://github.com/galaxyproject/foundry/issues/796), opened by arash77's AI assistant (BioHackathon Europe 2026). Labels: `needs-triage`. No comments, PR or branch. Triaged 2026-11-11 against `origin/main` `3060503e`, together with #798, #784 and #781.

## Proposed labels

Staged in [issue_tags.md](issue_tags.md).

- `roadmap/off`: John's call, 2026-11-11 (closest backbone was #318).
- `priority/mvp`: the run ends green while its workflow lost 12 of 16 tool steps, so its results are wrong.
- `work/ready-implement`: placement is decided (see below), and parts 1–2 are specified. This holds only if part 3 is split out to its own issue ([draft](new_issue_restoration.md)). Otherwise use `work/ready-research`.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3.

## Findings

Verified:

- `run-workflow-test` says it "does not repair anything" (index.md:70), and `debug-galaxy-workflow-output` only recommends. No Mold owns applying a test-phase repair.
- Neither `casts/claude/skills/run-workflow-test` nor `debug-galaxy-workflow-output` bundles `open-requirements-ledger.md`, so the "refuted justification reopens" rule isn't in front of the model that edits the workflow.
- Ledger entries already have an optional `step` field.
- The phases in `nextflow-to-galaxy/index.md` end at `debug-galaxy-workflow-output`. There is no gate after the test.
- `gxwf` has no workflow diff command. We maintain gxwf (galaxy-tool-util-ts), so a diff command is work we can do there, not an upstream blocker.
- #753 (merged) covers removals during draft repair only.

Not verified: the run evidence in iwc-lab#8 (attempt logs, the misread `validation_failed` line).

## History: #480 vs #479

On 2026-08-30 John closed #480 (a `coverage` header with `carried + subsumed + surrendered == source_units`) in favour of #479 (`kind: dropped` labels): "I think 479 was the better approach." The issue says #796 differs because it diffs the workflow artifacts and doesn't count ledger entries, so it catches cuts nobody recorded. That fits #479: each removed step must have a labelled entry, and nothing gets totalled. Part 3 (re-add the removed steps and re-test) goes further than either.

John, 2026-11-11: OK with diff-and-label (no totals). No umbrella; keep it `roadmap/off`.

## Decided placement (John, 2026-11-11: hybrid, report only)

- **Generic layer (this issue):** a `gxwf` command that diffs a snapshot of the draft (with `_plan_*` intact, so the step mapping survives) against the final workflow. `run-workflow-test`'s green result fails when a removed step has no `kind: dropped` entry naming its `step`. This covers all 10 pipelines that run `run-workflow-test`, with no new step. Also bundle `open-requirements-ledger.md` into the `run-workflow-test` and `debug-galaxy-workflow-output` casts, and add the `validation_failed` hint to debug.
- **Nextflow layer (#784):** a new Nextflow parity Mold after the test consumes this diff. It only reports; no routing back into the test loop.
- **Part 3 (restoration):** proposed as a separate issue, [new_issue_restoration.md](new_issue_restoration.md). Not filed.

## Next

- Implement the generic layer: the `gxwf` diff in galaxy-tool-util-ts, then the Foundry check and cast bundling.
- Filing the part 3 split is waiting on John.
- Related, not triaged: #791 (`ext.when` gates not captured), jmchilton/galaxy-tool-util-ts#231 (stale `when:` passes validation).
