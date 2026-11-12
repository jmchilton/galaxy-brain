# Implementation debrief — issue-796-test-phase-removed-steps

galaxyproject/foundry#796 parts 1 and 2 (part 3 is #800). Stacked on `issue-781-plan-state-resolved-args` at `ef1607a8` (draft PR #809).

## What changed

- **`foundry check-step-removals <diff.json> <ledger.yml> [--json]`** (`packages/gxwf-foundry/src/step-removals.ts`, `commands/check-step-removals.ts`). Reads `gxwf diff --json` output (or `-` for stdin) and the ledger. A removed step is labelled by an `entries[]` item (or an item of a bare-list ledger) with `kind: dropped`, a top-level `step` equal to the step key or label, and no `source_arg`. Any status counts. Gaps, flag records and `decisions` don't. Exit 0 all labelled, 4 unlabelled, 3 malformed input, 1 read error. `--json` gives `{ok, removed_steps[{step,label,dropped_entries}], unlabelled, unwired_inputs}`; unwired inputs are reported only. Meta, README, library export, CLI page `content/cli/foundry/check-step-removals.md`, minor changeset.
- **Snapshots (advance-galaxy-draft-step rev 14).** Two write-once outputs:
  - `galaxy-workflow-draft-snapshot` → `galaxy-workflow-draft.snapshot.gxwf.yml`: the draft as the loop first received it, `_plan_*` intact. For #784.
  - `galaxy-workflow-extracted` → `galaxy-workflow.extracted.gxwf.yml`: the first extract output, frozen before the test phase. The gate diffs against this one.
  - Eval property + brew3r scenario.
- **run-workflow-test rev 9.** Optional inputs `galaxy-workflow-extracted` and `open-requirements-ledger`. New step 6: after a green Planemo run with the snapshot present, `gxwf diff --json` + `foundry check-step-removals`; result gets `step_removals` and `artifacts.step_diff_json`. Unlabelled removal → `status: fail`, modality `unlabelled-step-removal`, surface `step-removal check`. Check can't run → `fail`, modality `step-removal-check-error`. No snapshot (maturation, review, CWL pipelines) → `step_removals: null`, status follows Planemo. Top-level steps only: `gxwf diff` doesn't compare inline subworkflow `run`, so removals inside one go unseen. Bundles the ledger note and the check's CLI sidecar. Eval property, two scenarios, new fixture `examples/unlabelled-step-removal/` (clean-passing workflow plus a `Show beginning1` subsample step removed in the test phase; both workflows pass `gxwf validate` with tool state; ledger holds only a plain gap citing `validation_failed`; real `step-diff.json`). `clean-passing/workflow-test-result.json` gains `step_removals: null`.
- **debug-galaxy-workflow-output rev 7.** Bundles the ledger note (upfront). Optional inputs ledger + extracted workflow. Classifies the unlabelled removal surface; new step 8 routes it: restore from the extracted workflow when the cause was a symptom or only `validation_failed`, else a `kind: dropped` entry with top-level `step` and a `because` quoting the job error; reopen refuted drops; `step-removal-check-error` is tooling. Step 4 carries the galaxyproject/galaxy#24837 hint (log line isn't a verdict, read the job directory, `--no_cleanup`). Eval property + scenario on the new fixture.
- **open-requirements-ledger rev 9.** A drop that removes a step names it in top-level `step`, test phase included; run-workflow-test checks it.
- Casts, Dashboard, Index, README count, pipeline assemblies regenerated.

## Normal review

[subagents/normal_review.md](subagents/normal_review.md), commit `ccf4a817`. Fixed: subworkflow coverage overclaimed (inline `run` isn't diffed; docs and Mold now say top-level only); list-form relabel reads as removed + added (CLI gotcha, debug step 8 restores the label); bare-list ledger now accepted like `build-cli`'s reader. For John: upstream #233 contract says a label change is `fields.label`, true only for dict form.

## Decision for John: why two snapshots

The brief asked for one snapshot "before the test phase, with `_plan_*` intact". Those can't both hold: implementation strips a step's `_plan_*`, and `draft-validate` rejects `_plan_*` on a fully resolved step, so at loop endstate no step has any. Only the draft before the loop's first call keeps them. Diffing that against the final workflow would also flag repair's fold path (`remove-step` + `rewire`, no `kind: dropped`, `repair-galaxy-draft-topology`), failing green runs that dropped nothing. So the gate diffs the extracted copy (the issue's literal proposal, test-phase removals only), and the pre-loop draft is kept separately for #784. The advance Mold writes both, so every pipeline with the per-step loop gets them with no new phase. The parent debrief's "pre-extract draft snapshot" for `_plan_state.calls` means this pre-loop file.

## Red → green

`test/step-removals.test.ts` failed on base (module missing), then passed: 10 tests over three real `gxwf diff --json` outputs from galaxy-tool-util-ts PR #233 at `3fd23149` (draft-before→after: `chr_filter` removed, `chr` unwired, bamtofastq-shaped; removed leaf step; changed step with no removal). They cover labelled, unlabelled, label match, `source_arg` record ignored, gap / no-step / other-step entries ignored, `decisions` ignored, empty ledger, malformed input, and the CLI's exit codes and stdin. The Mold changes are LLM-judged; the new fixture's result was produced by running the built CLI on its real diff.

## Release dependency (keep the PR draft)

End to end needs two releases:
- `@galaxy-tool-util/cli` with `gxwf diff` (jmchilton/galaxy-tool-util-ts#233; Python sibling galaxyproject/gxformat2#296), then the Foundry pin bump from `^1.15`. Until then every green run with a snapshot hits `step-removal-check-error`. The pin bump should also add `content/cli/gxwf/diff.md` and a `[[diff]]` cli-command reference on run-workflow-test; the validator rejects a gxwf page absent from the installed CLI metadata, so the Mold names `gxwf diff` in prose for now.
- A `@galaxy-foundry/gxwf-foundry` publish with `check-step-removals`. The cast's `foundry` tool has no version pin, so `npx` gets the latest published package.

## Local gate

`npm run packages-build` first, then `make -k check`: see the branch index for the result. gxwf-foundry package: 116 tests pass after the normal review; `make -k check` at `ccf4a817` (2026-11-12) red only on `validate-roadmap` (live GitHub roadmap state) and `check-vendored` (machine-only), 501 tests pass. Format, lint, typecheck clean.

## For the stack

- **#798:** scope drops that remove a templated step should set top-level `step` only if the step reached the extracted workflow; design-tier cuts never appear in the diff.
- **#784:** diff `galaxy-workflow-draft.snapshot.gxwf.yml` against the final workflow; `steps.removed[].plan_fields._plan_state` carries `calls` for removed steps, and `steps.changed[].plan_fields_before` for kept ones. Step keys survive `draft-extract` (checked on the #233 build, dict and list form), so kept steps land in `changed`, not removed + added. `unwired_inputs` comes from the same diff (also in `step_removals.unwired_inputs` of `workflow-test-result.json`, extracted-vs-final). Expect fold removals and repair drops in the pre-loop diff; join them to ledger drops by top-level `step`.
