Fix 🎯 #796 - a green test run fails when a step removed since extraction has no `kind: dropped` ledger entry naming it and giving a reason.

***This PR covers parts 1 and 2 of #796's proposal: the diff against the extracted workflow and the required ledger entry. Part 3, the restoration pass, is tracked separately as #800, so #796 can close when this merges.***

Closes #796.

***Depends on #809. Until #809 merges, this diff includes its commits too. This PR's own commits are [`ef1607a8..e5ba105e`](https://github.com/jmchilton/foundry/compare/issue-781-plan-state-resolved-args...issue-796-test-phase-removed-steps).***

In #796's bamtofastq run, the test loop cut the workflow from 16 tool steps to 4 across 18 `planemo test` attempts. It then ended green, because the remaining test only asserts element counts and datatypes. One of those removals, the chr filter, never reached the ledger at all. Nothing on `main` compares the final workflow with what the per-step loop built. The test loop edits `galaxy-workflow.gxwf.yml` in place, so once the loop is done no copy of the larger workflow survives to compare against.

## What a run now reports

The new example fixture (`content/molds/run-workflow-test/examples/unlabelled-step-removal/`) is the clean-passing workflow with its `subsample_reads` step removed in the test phase. The ledger records that removal only as a plain gap citing Galaxy's `validation_failed` log line. The same diff against the fixture's two ledgers gives:

```console
$ gxwf diff --json galaxy-workflow.extracted.gxwf.yml galaxy-workflow.gxwf.yml > step-diff.json
$ foundry check-step-removals step-diff.json open-requirements.ledger.yml
  removed step subsample_reads has no kind: dropped ledger entry naming it with a because
1 of 1 removed step(s) unlabelled                         # exit 4
$ foundry check-step-removals step-diff.json open-requirements.dropped.ledger.yml
1 removed step(s), all labelled                           # exit 0
```

`run-workflow-test` turns the exit 4 into a red result, even though Planemo passed:

```json
{
  "status": "fail",
  "failure_modality": "unlabelled-step-removal",
  "next_reference_surface": "step-removal check",
  "step_removals": {
    "ok": false,
    "removed_steps": [{"step": "subsample_reads", "label": null, "dropped_entries": []}],
    "unlabelled": ["subsample_reads"],
    "unwired_inputs": []
  }
}
```

The result then goes to `debug-galaxy-workflow-output`, which now has a route for this modality.

***This PR adds no restoration pass, and no Mold restores a step on its own. #800 covers that. `debug-galaxy-workflow-output` only recommends restoring a step or recording a drop, as it already does for every other failure.***

***This PR adds no new pipeline phase either. The check is step 6 of `run-workflow-test`, which every pipeline that builds a Galaxy workflow already runs. `content/pipelines/` is unchanged. The only pipeline changes are generated: harnesses that didn't already list the `foundry` CLI as a required tool now do.***

## How it works

***Repair's own removals don't trip the gate.*** `repair-galaxy-draft-topology` folds steps (`remove-step` + `rewire`) without writing a `kind: dropped` entry, but it does so inside the per-step loop, before the first extraction. The gate diffs that extracted copy, so it sees only test-phase removals.

- **Two snapshots, written by `advance-galaxy-draft-step` (rev 14).** Each is written once and never edited:
  - `galaxy-workflow.extracted.gxwf.yml`: the first `draft-extract` output. The gate diffs the final workflow against this copy, as #796 proposes.
  - `galaxy-workflow-draft.snapshot.gxwf.yml`: the draft as the loop first received it, with every `_plan_*` field intact, for #784's parity report.
- **`foundry check-step-removals <diff.json> <ledger.yml> [--json]`**, new in `@galaxy-foundry/gxwf-foundry`. A removed step counts as labelled when an `entries[]` item has `kind: dropped`, a top-level `step` equal to the step's full diff key, a non-empty `because`, and no `source_arg`. A step inside an inline subworkflow is keyed `nested/first`, and only that full key names it. A top-level step also matches its label. A list-form step whose `id` and `label` differ is keyed by its label, and its `id` doesn't name it. The entry's status doesn't matter. Gaps, #809's per-flag `source_arg` records and `decisions` label nothing. Exit codes: 0 when every removed step is labelled, 4 when one isn't, 3 for input of the wrong shape, 1 when a file can't be read or parsed. Unwired inputs are reported but never change the exit code.
- **`run-workflow-test` (rev 9), step 6.** The check runs only after a green Planemo run, and only when the extracted snapshot exists. An unlabelled removal gives `fail` with modality `unlabelled-step-removal`. If `gxwf diff` or the check can't run, the result is `fail` with modality `step-removal-check-error`. Maturation, review and CWL pipelines write no snapshot, so they record `step_removals: null` and their status follows Planemo as before.
- **`debug-galaxy-workflow-output` (rev 7), step 8.** If the removal traced back to a symptom of another defect, or its only evidence is a `validation_failed` log line, debug recommends restoring the step from the extracted workflow. If the step truly can't run, it recommends a `kind: dropped` entry. That entry copies the key from `step_removals.unlabelled` verbatim and quotes the job error in its `because`. Debug also reopens an earlier drop whose `because` the diagnosis refutes. Step 4 now says Galaxy's `workflow tool request state: ... validation_failed` scheduler line isn't a failure verdict (galaxyproject/galaxy#24837): read the job state and the job directory, which survives only with `--no_cleanup`.
- **The ledger note is now bundled** with both test-phase Molds, as #796 suggested, so the "a refuted justification reopens its decision" rule reaches the model that edits the workflow. `open-requirements-ledger` (rev 9) now says a drop that removes a step must name it in its top-level `step`, during the test phase too, and must name a nested step by its `/`-joined path.

***The check requires a reason but doesn't judge it.*** #796's part 2 asks for an entry "naming it and giving a reason". A `kind: dropped` entry with an empty or missing `because` labels nothing. A string or a list counts, as `build-cli`'s ledger reader accepts both. Whether that reason is cited or true goes unchecked: the fixture's `open-requirements.dropped.ledger.yml` cites only the misread log line, yet it still exits 0, so `run-workflow-test` reports `pass` and debug never runs. Reopening a drop whose reason later proves wrong is #800.

<details><summary>Why two snapshots, not one</summary>

The issue's first sketch kept one copy "before the test phase", and the stack also needs `_plan_*` for #784. Both can't come from the same file. Implementation strips each step's `_plan_*`, and `draft-validate` rejects `_plan_*` on a fully resolved step, so by the end of the loop no step has any. Only the draft from before the loop's first call keeps them.

Diffing that pre-loop draft against the final workflow would also flag repair's fold path (`remove-step` + `rewire` in `repair-galaxy-draft-topology`), which writes no `kind: dropped`. That would fail green runs that dropped nothing. So the gate diffs the extracted copy, which holds only test-phase removals, and the pre-loop draft is kept separately for #784. The advance Mold writes both, so every pipeline with the per-step loop gets them without a new phase.

</details>

## Stays draft until

This needs to stay draft until two things land:

1. A `@galaxy-tool-util/cli` release with `gxwf diff`, including the nested-subworkflow and list-form relabel fix from jmchilton/galaxy-tool-util-ts#233 at `a5c6cd57` (the Python sibling is galaxyproject/gxformat2#296).
2. A Foundry pin bump from `^1.15` to that release. The bump should also add `content/cli/gxwf/diff.md` and a `[[diff]]` reference on `run-workflow-test`. Until then the Mold names `gxwf diff` in prose, because the validator rejects a gxwf page that the installed CLI doesn't list.

***If this merges before step 2, every green run of a per-step-loop pipeline goes red with `step-removal-check-error`.***

## After merge

Publish `@galaxy-foundry/gxwf-foundry` with `check-step-removals` (this PR's changeset). It can only publish after merge, so it isn't an undraft condition. Casts call `npx` with no version, so until that release runs they get the old package, and every green per-step-loop run goes red with `step-removal-check-error`.

## Evidence

- `packages/gxwf-foundry/test/step-removals.test.ts` has 17 tests, all passing at this head. They run against six real `gxwf diff --json` outputs from an unreleased galaxy-tool-util-ts build at `a5c6cd57`, not the pinned 1.15:
  - a bamtofastq-shaped draft where `chr_filter` was removed and `chr` left unwired
  - a removed leaf step
  - a changed step with nothing removed
  - top-level `first` and `nested/first` both removed
  - a list-form relabel
  - a list-form removal of a step whose `id` (`second`) differs from its label (`second cat`)
- Three of those tests started red against the code they fix:
  - Before the full-key fix, `step: first` also labelled `nested/first`.
  - Before ledgers written as a bare list were accepted (`build-cli`'s ledger reader already takes them), the CLI exited 3, and debug read that as a tooling error.
  - Before `because` was required, a `kind: dropped` entry with no reason, or a blank one, labelled the step.
- The relabel test pins upstream's fix, and the list-form removal test pins that the label, not the `id`, names the step. Both were green when added. The rest cover the matching rules, malformed input, exit codes and stdin.
- The example fixture's diff is real output from that same build. The built CLI exits 4 on its gap-only ledger and 0 on the dropped ledger, as shown above.
- Both fixture workflows pass `gxwf validate` with tool state.

***The Mold behaviour (snapshots, step 6, debug's routing) is checked only by LLM-judged eval properties and scenarios. No end-to-end pipeline run has exercised it yet, and the fixture's Planemo result is canned, as in the other eval fixtures.***

`make -k check` at this head is red only on `validate-roadmap`, which reads live roadmap state from GitHub (rate-limited here), and `check-vendored`, which fails only on the dev machine. 501 tests passed, and the `gxwf-foundry` package's 122.

<details><summary>Files</summary>

- `packages/gxwf-foundry`:
  - `src/step-removals.ts`, `src/commands/check-step-removals.ts`, wiring in `program.ts` and `meta/index.ts`, README, library export, tests and fixtures
  - shared `src/lib/read-input.ts`, which replaces four copies of the read-or-exit code with the same messages and exit codes
  - minor changeset
- `content/cli/foundry/check-step-removals.md`.
- Molds: `advance-galaxy-draft-step` rev 14, `run-workflow-test` rev 9 (new example `unlabelled-step-removal/`, with `step_removals: null` added to `clean-passing`), `debug-galaxy-workflow-output` rev 7, each with eval properties and scenarios.
- `open-requirements-ledger` rev 9.
- Generated: casts, pipeline assemblies, Dashboard, Index, README count.

</details>

## Risks

The parts that are hard to change later are the contract #798 and #784 build on and the published CLI's exit codes. Everything else is Mold prose and cheap to revise.

<details><summary>Risk Details</summary>

- Merged before the `@galaxy-tool-util/cli` release and pin bump, every green per-step-loop run fails with `step-removal-check-error`.
- #798 and #784 build on:
  - the two snapshot filenames
  - `step_removals` in `workflow-test-result.json`
  - the two new failure modalities
  - top-level `step` holding a removed step's full diff key
- `foundry check-step-removals` exit codes (0/4/3/1) and its `--json` shape become a published package contract.
- Gating fails closed. An honest removal that nobody recorded now turns a green run red. That is the intent, but runs that used to finish green can now end in debug.
- The ledger note is cast verbatim into about 20 skills, so its new sentences add context to each of them.

</details>

<details><summary>Risk Review Advice</summary>

Read `src/step-removals.ts` next to the CLI page's matching rule. They define what counts as a recorded removal: full key, `kind: dropped`, a non-empty `because`, no `source_arg`, and any status. Check that "any status" fits how you want a reopened, refuted drop to read: one whose `because` is struck through still labels the step, one whose `because` is emptied doesn't.

Then check the ordering in `run-workflow-test` step 6: green Planemo first, then the diff, and only where the snapshot exists. Also check that debug step 8's restore-or-drop split matches what you want the test loop to do before #800 adds restoration.

</details>

## Context

Depends on 🔀 #809, which adds the per-flag `source_arg` records this check ignores. Part of the source-parity stack: 🎯 #798 (scope drops for excluded branches) and 🎯 #784 (the parity report, which diffs `galaxy-workflow-draft.snapshot.gxwf.yml`) build on this branch. Needs `gxwf diff` from jmchilton/galaxy-tool-util-ts#233 and galaxyproject/gxformat2#296. Restoration of removed steps is 🎯 #800.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regression. A fourth read-or-exit copy became a shared helper, and two dense Mold steps were split into route bullets.</summary>

The core module is small, pure and typed at its output. It is split into a pure `checkStepRemovals` and a thin CLI runner, the same as `workflow-brief` / `check-workflow-brief`. `src/lib/read-input.ts` now replaces the read/parse/exit-1 block in four commands. Messages and exit codes are unchanged, and only `check-step-removals` maps `-` to stdin. `run-workflow-test` step 6 and debug step 8 became a lead sentence plus one bullet per outcome, with the same content. The reviewer considered a ledger reader shared with `build-cli` and left it out, because the two readers diverge on purpose on missing `entries`, malformed shapes and missing ids.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-796-test-phase-removed-steps/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One of four findings held. An empty <code>entries:</code> key reads as no drops, and the CLI page now says so.</summary>

The CLI page said any `entries` that isn't a list exits 3, but `entries:` with no value is an empty ledger. That can't false-green a removal, because removed steps still come back unlabelled. The page was fixed and a test pins the behaviour. Three findings were refuted:

- The `gxwf diff` release dependency is already the reason this PR stays draft.
- The placeholder Zenodo URL follows the house convention for eval fixtures.
- A parse error exiting 1 rather than 3 is documented, and matches the other validators.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-796-test-phase-removed-steps/codex_review/). Run via gpt-6-sol at medium effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
