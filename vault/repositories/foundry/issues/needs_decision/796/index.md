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

- `roadmap/off`: no backbone fits. Closest is #318 (more deterministic draft coordination), but this is the test phase, not the draft. See the umbrella question in #784.
- `priority/mvp`: the run ends green while its workflow lost 12 of 16 tool steps, so its results are wrong.
- `work/ready-research`: this partly revisits the #480 decision (see below), and the restoration pass is a harness design question. Parts 1–2 are implementable on their own.

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

## Next

- Research pass shared with #798, #784 and #781. Questions: snapshot the `draft-extract` output (where, and under what name); a `gxwf` diff command or a script; whether `step` becomes required on test-phase drops; whether the restoration pass is a harness loop or a Mold; how the diff's output feeds #784.
- Related, not triaged: #791 (`ext.when` gates not captured), jmchilton/galaxy-tool-util-ts#231 (stale `when:` passes validation).
