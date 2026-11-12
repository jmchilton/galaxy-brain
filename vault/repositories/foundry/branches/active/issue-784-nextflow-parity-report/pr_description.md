Toward 🎯 #784 - a nextflow-to-galaxy run now ends with a report of how the Galaxy workflow differs from its Nextflow source, with every difference that has no recorded reason listed as a finding.

**Depends on #821 (→ #818 → #809). Until those merge, this diff includes their commits too. This PR's own commits are [`4ff48eda..HEAD`](https://github.com/jmchilton/foundry/compare/issue-798-nextflow-scope-decisions...issue-784-nextflow-parity-report).**

Part of #784. ***It doesn't close the issue. Three parts stay open. The wrapper's underlying software requirement (item 2) can't be read yet, so tool-version rows compare against the wrapper version string and are marked unverified. Source outputs (item 1) that the design never declared and never dropped don't appear. And no end-to-end nextflow-to-galaxy run has produced a report yet.***

It also completes the report half of #781, of which #809 is the prevention half. Every effective `ext.args`/`ext.prefix` entry is joined to the Galaxy step that translates it, to that step's final `state`, and to the ledger record that disposes of it, and an entry on a kept step with no record becomes a finding. ***The report puts each flag beside the step's `state` but doesn't map one to the other. Whether a wrapper parameter carries a flag stays a reading task, as #781 itself says it must.***

On `main` a run ends after the test phase with a workflow, its tests and a ledger, and nothing compares the workflow with its source. arash77's comment on #784 shows why the ledger alone can't do it. Two BioHackathon bamtofastq runs changed the workflow without a ledger entry. In galaxyproject/iwc-lab#8 the test loop removed the chr filter step, its `chr` input and its `chr_alignment` output, while a ledger decision still said the chain runs the chr extract unconditionally. In galaxyproject/iwc-lab#7, `samtools_collate_fast` and `reads_in_memory` stayed as workflow inputs that fed nothing. A report built from `kind: dropped` entries shows all of that as carried.

## What the report finds on a bamtofastq-shaped run

The fixture in `packages/gxwf-foundry/test/fixtures/nextflow-parity/bamtofastq/` reproduces both cases. Its summary is built from a small `pipeline/` by `foundry summarize-nextflow`, and `parity-diff.json` is real `gxwf diff --json` output (jmchilton/galaxy-tool-util-ts#233 at `a5c6cd57`). `foundry nextflow-parity` on it exits 0 and prints these findings:

| `kind` | `subject` | `detail` | arash77's case |
|---|---|---|---|
| `step-removed-unrecorded` | `chr_filter` | | galaxyproject/iwc-lab#8 |
| `output-removed-unrecorded` | `chr_alignment` | `chr_filter` | galaxyproject/iwc-lab#8 |
| `input-unwired` | `chr` | | galaxyproject/iwc-lab#8 |
| `input-unwired` | `samtools_collate_fast` | | galaxyproject/iwc-lab#7 |
| `input-unwired` | `reads_in_memory` | | galaxyproject/iwc-lab#7 |
| `source-arg-unrecorded` | `collate` | `conf/modules.config#withName:SAMTOOLS_COLLATE/args` | #781 |
| `source-arg-stray` | `arg-view-map-map-header` | `not-effective` | #781 |

The same JSON joins the source side of each step:

| Step | Status | Calls from | Galaxy wrapper | Source pin |
|---|---|---|---|---|
| `chr_filter` | removed | `_plan_state` | `TODO` | `biocontainers/samtools:1.17--h00cdaf9_0` |
| `view_map_map` | kept | `_plan_state` | `samtools_view` `1.15.1+galaxy2` | `biocontainers/samtools:1.17--h00cdaf9_0` |
| `collate` | kept | `_plan_state` | `samtools_collate` `1.15.1+galaxy0` | `biocontainers/samtools:1.17--h00cdaf9_0` |
| `to_fastq` | kept | flag records | `samtools_fastx` `1.15.1+galaxy2` | `biocontainers/samtools:1.17--h00cdaf9_0` |

And each flag beside its step's final `state`, as #781 asks:

| Step | Entry | `expression` | Record | Step `state` |
|---|---|---|---|---|
| `view_map_map` | `withName:SAMTOOLS_VIEW_MAP_MAP/args` | `'-b -f1 -F12'` | `arg-view-map-map-args`, carried, `-b -f1 -F12` | `output_fmt: bam`, `require_flags: "1"`, `exclude_flags: "12"` |
| `to_fastq` | `withName:SAMTOOLS_FASTQ/args` | `'-N'` | `arg-to-fastq-args`, carried, `-N` | `output_fmt: fastqsanger`, `read_numbering: true` |
| `collate` | `withName:SAMTOOLS_COLLATE/args` | `{ params.samtools_collate_fast ? "-f -r ${params.reads_in_memory}" : '' }` | none: a finding | none |

The Mold renders these into `nextflow-galaxy-parity-report.md`, so a reader sees samtools 1.17 in the source beside wrappers at `1.15.1+galaxy*`, flagged as differing and unverified, and sees that `collate` sets no `state` for the fast-mode flags no record covers.

***The report never edits the workflow, the ledger or the test result, and never sends the run back into the test loop.*** An unrecorded removal is a finding, not a failure. #818's gate in the test phase is what fails a run. ***The report also doesn't judge whether a difference is acceptable.*** That is #784's own rule: make every difference visible and traceable, and list the ones with no reason.

## A report-only parity Mold, last in the pipeline

`nextflow-summary-to-galaxy-parity` (draft, rev 1) is the new last phase of `nextflow-to-galaxy` (rev 6). It runs once after the test phase settles, whether the test passed or not. Its inputs are `summary-nextflow`, the ledger, the draft snapshot #818 writes before the per-step loop, the final workflow, and optionally `workflow-test-result`. It:

1. runs `gxwf diff --json` from the snapshot to the final workflow, not from the extracted copy, because only the snapshot still has `_plan_state` and shows what the per-step loop removed;
2. runs `foundry nextflow-parity` on the five files and renders from its JSON;
3. writes these sections: Outputs, Tool versions, Parameters and inputs (#781's per-flag table, with each step's `state`, is here), Behavioural changes, Source scope (#798's records), Unverified, and Findings as a `kind | subject | detail | section` table.

When `workflow-test-result` is missing or not `pass`, Unverified opens by saying that no claim was checked by a passing run.

## `foundry nextflow-parity`: what is deterministic and what isn't

The command joins everything that has a key. The Mold judges only what has none. The command exits 0 whenever the files join, and its findings live in the JSON, never in the exit code. It exits 3 when the snapshot and workflow aren't the pair the diff compared.

<details><summary>Deterministic, in the command</summary>

- **Step → calls.** Read from the snapshot's `_plan_state.calls`, with steps keyed exactly as `gxwf diff` keys them (inner steps only under a subworkflow that is inline on both sides). A step the template resolved has no `_plan_state`, so its calls come from the flag records that name it (`calls_from: records`). An id that several calls share, such as a `withLabel` entry, never maps a call.
- **Step status.** Taken from the diff alone. A snapshot-only step must be in `steps.removed` and a workflow-only step in `steps.added`, otherwise the command exits 3.
- **Removed steps and outputs → drops.** Removed steps reuse #818's `checkStepRemovals`. A removed output joins the drops that name its snapshot source step, and drops whose backticked `units` name the output.
- **Unwired inputs.** Final inputs that feed no step are listed as not carried, never as exposed.
- **Step `state`.** Each step carries the final workflow's `state` (or an object `tool_state`) as written, `null` for a removed step, so the flag table prints it beside each entry.
- **Source tool versions.** Call → process → the tool's declared versions and the process's `container` and `conda` text.
- **#781 flag join.** Each `effective_args` row → steps → entry ids → records joined on `source_arg.step` + `source_arg.arg`, across `decisions` and `entries`. It also lists overridden entries (resolved minus effective) and stray records (`unknown-step`, `unknown-arg`, `not-effective`, `other-step`). A record with no disposition or `because` is `source-arg-malformed` and records nothing.
- **Unmapped calls.** A call with no step is `covered_by` a non-flag drop whose units name a segment of its call path, otherwise it is a `call-unmapped` finding.
- **Scope.** `check-scope-records` against the summary. `other_drops` holds the drops that aren't flag, scope or matched step drops, such as design-tier cuts and the steps past a caller's cap.

</details>

<details><summary>Left to the Mold, and why</summary>

- **Which flags of an entry a record covers, and which `state` parameter carries a flag.** Closures can't be split into flags safely, so the join stops at the entry, and wrappers name parameters their own way. The Mold compares a closure's flags with the records' `flags`, and flags with `state`, by reading.
- **A Tool Shed wrapper's software requirement.** It isn't in any input. Galaxy's `ParsedTool` and the Tool Shed API carry `requirements`, but galaxy-tool-util-ts's `ParsedTool` schema drops them, so the tool cache doesn't have them. The Mold compares with the version a wrapper version starts with and marks it unverified. An embedded user-defined tool's requirement is in the workflow and is compared directly.
- **Reasons for removed or added inputs.** No ledger key joins an input. The Mold finds the reason in ledger prose or lists the input as a finding.
- **Behavioural changes.** `steps.changed` mixes TODO resolution with real changes. Telling them apart, and linking a change to a prose decision, is judgement.
- **Outputs the design never declared.** They exist only in drop prose.

</details>

## `foundry check-scope-records`, now run by the interface Mold

#821 left the "deterministic" interface eval property for scope records with no checker outside a root test that reads the committed fixture. It drafted a follow-up to lift that into `gxwf-foundry`, and left open whether that happens there or here. This PR does it here. `foundry check-scope-records <ledger.yml> [summary.json] [--json]` checks the scope decision and drops, and with a summary resolves every `from` citation, the candidate and every unit name. It exits 0 when clean, 4 on problems and 3 on a bad shape. `tests/scope-decisions.test.ts` now calls the library, with every assertion kept. Interface Mold rev 8 runs the command before handoff, and the eval property names it, so the property has an oracle. `nextflow-parity` uses the same check for the report's Source scope section.

## One ledger reader

`packages/gxwf-foundry/src/ledger.ts` holds the shared ledger primitives: `ledgerEntries`, `ledgerDecisions`, `hasReason`, `isStepDrop`, `sourceArg`, `unitNames` and one `InputShapeError` (exit 3). `step-removals.ts`, `scope-records.ts` and `nextflow-parity.ts` all read through it, so the ledger isn't parsed a fourth way. #818's unreleased `StepRemovalInputError` is now `InputShapeError`. build-cli's `parseOpenRequirements` stays separate, because it is a lenient model for the run dashboard and this is a strict join reader.

## Release dependency: stays draft

Like #818, the Mold needs `gxwf diff`, which exists only on jmchilton/galaxy-tool-util-ts#233. ***This stays draft until a `@galaxy-tool-util/cli` release containing jmchilton/galaxy-tool-util-ts#233 ships and Foundry's pin is bumped.*** The Mold names `gxwf diff` in prose and declares `[[gxwf]]` as a `cli-tool` with `evidence: hypothesis`. `foundry nextflow-parity` and `check-scope-records` reach a live harness through the gxwf-foundry publish after merge. Interface Mold rev 8 already tells every nextflow-to-galaxy run to call `check-scope-records`, and the cast's `foundry` has no version pin, so that line can't run until the publish.

## Evidence

- `test/nextflow-parity.test.ts` (21 tests) runs on the bamtofastq fixture. A test keeps the committed summary equal to one built live from `pipeline/`. Variants cover a recorded step drop, a call covered by a drop, an unmapped call, an output fed by an input, a step with `tool_state` instead of `state`, inline-subworkflow keying, a shared `withLabel` id, output-only drops, reasonless and malformed flag records, a diff/file mismatch (exit 3), and the CLI exit codes. Each join bug the reviews found was fixed red to green here.
- `test/scope-records.test.ts` covers each shape problem, each citation form and rejection, and exit codes 0/4/3/1. `tests/scope-decisions.test.ts` passes through the library, and #798's mutation checks were rerun: a fake unit name and `bowtie2` under `params[aligner].enum` both fail the citation test. ***That citation test needs sarek locally and skips in CI.***
- Live runs at `7d3e3cfa`: `foundry nextflow-parity` on the fixture gives the tables above. `foundry check-scope-records` on #821's sarek example ledger reports `scope-germline-strelka: 9 scope drop(s), 0 problem(s)` and exits 0. That run had no summary, so it checked shape only. The citation check against a live sarek summary is the root test above.
- Parity Mold scenario case 1 was checked against that live command output: seven findings, `view_map_map` joined to `arg-view-map-map-args` (`carried`), `to_fastq` with `calls_from: records`, `collate` with no `state`, and samtools 1.17 with its container.
- `make -k check` at `7d3e3cfa` is red only on `validate-roadmap`, which hits the GitHub rate limit here, and `check-vendored`, which fails only on the dev machine. 503 root tests and 151 gxwf-foundry tests pass. Format, lint, `npm run typecheck` and `npm run packages-typecheck` are clean. `npm run validate` gives the same 71 warnings on base and head.

***The Mold itself has been checked only by its eval properties and scenarios. Scenarios 3 (sarek scope) and 4 (rerunning galaxyproject/iwc-lab#8 with a snapshot) are predictions until `/test-pipeline` runs produce them. A fresh run may not remove the chr filter again.***

## Known limits

- **Wrapper requirements.** Tool-version rows for Tool Shed wrappers are unverified until galaxy-tool-util-ts's `ParsedTool` keeps `requirements` and Foundry's pin includes the change. Two galaxy-tool-util-ts issues are drafted, not filed, in the [domain review](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-784-nextflow-parity-report/domain_review/): (B) `ParsedTool` drops `requirements`/`containers`/`stdio`, and (A) export the step keying `gxwf diff` uses, so this command stops copying it.
- **Undeclared source outputs.** Outputs list the snapshot's outputs plus the outputs the drops name. A publishDir output the design never declared and never dropped doesn't appear.
- **List-form relabels.** `gxwf diff` pairs list-form steps by `id` across a relabel, and this command doesn't, so it exits 3 on that input. Drafts use dict-form steps.
- **Calls without `effective_args`** can't produce `call-unmapped`, because the summary has no full call path for them.
- **A step folded into another during repair** has no drop, so it is a finding. The report says it may be a fold, and doesn't excuse it.

## The source-parity stack

This is the top of a stack that makes source parity checkable from design to report:

- galaxyproject/gxformat2#296 and jmchilton/galaxy-tool-util-ts#233 (drafts): `gxwf diff`, a structural diff of two Format2 workflows with `--json`, in Python and TypeScript.
- #809, toward #781: rank nf-core `ext.args` per call and carry the effective entries into `_plan_state`. Each flag needs a recorded disposition.
- #818, for #796: a green test run fails when a step removed since extraction has no `kind: dropped` entry. It also writes the pre-loop snapshot this report diffs.
- #821, toward #798: the interface Mold records the scope it builds and each branch it leaves out.
- This PR, toward #784: the report that renders all of the above against the source at the end of the run.

## Risks

The main one-way risk is interface Mold rev 8: it tells every nextflow-to-galaxy run to call `foundry check-scope-records`, so between merge and the gxwf-foundry publish, live runs fail at that step. The parity Mold itself is the last phase and only reports, so it's easy to revise.

<details><summary>Risk Details</summary>

- The cast's `foundry` has no version pin, so `npx` gets the latest published gxwf-foundry. Until a publish, the interface phase's `check-scope-records` step fails.
- The parity Mold needs `gxwf diff` from an unreleased galaxy-tool-util-ts. Until the pin bump it fails at step 1 and falls back to marking every row unverified.
- The `nextflow-parity` JSON shape is now a contract that the Mold's sections and eval properties render from. Changing a field means changing both.
- `InputShapeError` replaces `StepRemovalInputError` in the package's exports. The old name was never published, so no alias is kept.
- Step keying copies `gxwf diff`'s rules. If galaxy-tool-util-ts changes them, this command exits 3 on mismatches rather than misjoining, until drafted issue A gives it an export to reuse.

</details>

<details><summary>Risk Review Advice</summary>

Run `foundry nextflow-parity` on the fixture and read its JSON beside the Mold's Report sections. Check that the deterministic/judged split above is where you want it, in particular that the flag join stops at the entry and `state` is printed as written rather than mapped to flags.

Then decide on the release gate. Interface Mold rev 8's `check-scope-records` line, like #818's `check-step-removals`, needs a gxwf-foundry publish. Check whether keeping the whole stack in draft until then is enough, or whether that line should wait.

</details>

## Context

Depends on 🔀 #821, whose scope records the Source scope section renders, on 🔀 #818, which writes the snapshot this report diffs and whose `checkStepRemovals` it reuses, and on 🔀 #809, whose `effective_args` and `source_arg` records feed the flag table. Uses `gxwf diff` from 🔀 jmchilton/galaxy-tool-util-ts#233, the TypeScript port of 🔀 galaxyproject/gxformat2#296. Completes the report half of 🎯 #781. Folds in #821's drafted `check-scope-records` follow-up.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Two join bugs fixed red to green, and each step is now built once with no mutation pass.</summary>

- The step/diff agreement check rejected valid inline subworkflows. Steps are now keyed one level at a time, recursing only where `gxwf diff` recurses.
- Step drops that named a kept step, or had no `because`, appeared in no bucket. They now land in `other_drops`.
- `assembleNextflowParity` builds each step once, from plan calls to call→step mapping to rows, and the JSON output was byte-identical before and after. The exit-3 handling repeated in three commands is now `exitOnInputShape()`.
- Left as follow-ups: one shared ledger record taxonomy across the three readers, a typed diff input once galaxy-tool-util-ts ships `WorkflowDiff`, and exported summary types.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-784-nextflow-parity-report/subagents/thermo_review/). Run via Claude Opus 5.5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three of four findings held and were fixed red to green. The fourth was a wording gap on the CLI page.</summary>

- A `withLabel` id shared by two calls could map an unrelated call to a step and hide `call-unmapped`. The fallback now counts only ids effective for that call alone.
- A drop recording only a removed output, with no `step`, wasn't joined. Removed outputs now also take drops whose `units` name them.
- A flag record with no disposition or `because` counted as recording its entry. It is now `source-arg-malformed`, and the entry stays unrecorded.
- Removed inputs never become command findings by design. The CLI page now says the Mold lists the unexplained ones.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-784-nextflow-parity-report/subagents/codex_review/). Run via gpt-6-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
