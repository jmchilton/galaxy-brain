# Implementation debrief — issue-784-nextflow-parity-report

galaxyproject/foundry#784. Stacked on `issue-798-nextflow-scope-decisions` at `4ff48eda` (draft PR #821 → #818 → #809). Decided placement (John, 2026-11-11): hybrid, report only.

## What changed

- **Shared ledger reader** `packages/gxwf-foundry/src/ledger.ts`: `ledgerEntries`, `ledgerDecisions`, `hasReason`, `isStepDrop`, `sourceArg`, `unitNames`, and one `InputShapeError` (exit 3). `step-removals.ts` now uses it; `StepRemovalInputError` became `InputShapeError` (unreleased, so renamed rather than aliased; the #796 tests only changed their import). build-cli's `parseOpenRequirements` stays: it parses the ledger for the run dashboard with its own tolerance rules, and folding it in would couple build-cli to gxwf-foundry for no consumer gain.
- **`foundry check-scope-records <ledger.yml> [summary.json] [--json]`** (`scope-records.ts`): #798's drafted issue F. #798's record leaves "lift now, or fold into #784?" open for John; the stack plan's reuse note points here, so this branch takes the fold-into-#784 option pending John's answer. Ports `scopeRecords`/`checkCitation` from `tests/scope-decisions.test.ts` into problem-returning functions; every assertion kept. Exit 0 clean, 4 problems, 3 shape, 1 read. `tests/scope-decisions.test.ts` now calls the library. #798's mutation checks rerun: a fake unit name and `bowtie2` under `params[aligner].enum` both fail the sarek citation test. Interface Mold rev 8 references the CLI (on-demand sidecar, run before handoff), and its deterministic eval property names it, so the property has an oracle.
- **`foundry nextflow-parity --summary --ledger --snapshot --workflow --diff`** (`nextflow-parity.ts`): the deterministic half of the report. Always exits 0 when the files join; findings live in the JSON.
- **New Mold `nextflow-summary-to-galaxy-parity`** (draft, rev 1): runs `gxwf diff --json` snapshot→final, then `foundry nextflow-parity`, and renders `nextflow-galaxy-parity-report.md` with Outputs, Tool versions, Parameters and inputs (incl. #781's per-flag table), Behavioural changes, Source scope, Unverified, Findings. Report only: no edits, no routing back. Inputs `summary-nextflow`, `open-requirements-ledger`, `galaxy-workflow-draft-snapshot`, `galaxy-workflow`, optional `workflow-test-result`. Eval (9 properties) and scenarios (4 cases).
- **Pipeline** `nextflow-to-galaxy` rev 6: new last phase, plus a harness note that it runs once after the test phase settles and never routes back.
- CLI pages `content/cli/foundry/{check-scope-records,nextflow-parity}.md`, meta, README, changeset; casts, Dashboard, Index, README count, pipeline assembly regenerated.

## Deterministic vs Mold-judged

Deterministic (in `nextflow-parity`):

- Step status and step→calls from the snapshot's `_plan_state.calls`, keyed as `gxwf diff` keys steps. A template-resolved step has no `_plan_state`; its calls come from flag records that name it (`calls_from: records`). Plain-text `_plan_state` is its own bucket.
- Removed steps joined to step drops (reuses `checkStepRemovals`), removed outputs joined through their snapshot `outputSource` step (none when the source isn't a snapshot step, e.g. an input), unwired inputs.
- Source side of tool versions: call → process (last path segment = name or alias) → tool's declared versions, process `container`/`conda` text.
- #781 flag join: each `effective_args` row → steps → entry ids → records on `source_arg.step` + `source_arg.arg` across `decisions` and `entries`; overridden entries (resolved minus effective); stray records (`unknown-step`, `unknown-arg`, `not-effective`, `other-step`).
- Rows with no step: `covered_by` drops (non-flag `kind: dropped`) whose backticked units name a call-path segment; otherwise a `call-unmapped` finding. Sarek's summary call paths include `BAM_VARIANT_CALLING_SOMATIC_ALL` as a segment, so its scope drop would cover them; `nextflow-parity` itself wasn't run on sarek.
- Scope: `check-scope-records` with the summary; `other_drops` = drops with no `step`, `source_arg` or `scope_branch` (cap drops land here, not in scope).
- Findings: unrecorded removed step/output, unwired input, unrecorded effective entry on a kept step, stray record, unmapped call, scope problem.

Left to the Mold, and why:

- Per-flag coverage inside an entry: closures can't be tokenised safely; the join stops at the entry.
- Wrapper software requirement: not in any input. Galaxy's `ParsedTool` and the Tool Shed API carry `requirements`, but gtu-ts's `ParsedTool` schema strips them, so the tool cache lacks them (upstream issue B drafted in [domain_review.md](domain_review.md)). Only an embedded UDT's requirement is in the workflow. The Mold marks Tool Shed comparisons unverified.
- Removed/added inputs: no ledger key joins them; listed, reason found in ledger prose.
- Behavioural changes: the diff's `steps.changed` mixes TODO resolution with real changes; telling them apart and linking prose decisions is judgement.
- Outputs the design never declared: only in drop prose.

## Red → green

`test/nextflow-parity.test.ts` and `test/scope-records.test.ts` failed on base (modules missing), then passed. Fixture `packages/gxwf-foundry/test/fixtures/nextflow-parity/bamtofastq/`: a bamtofastq-shaped `pipeline/` (summary built from it by `foundry summarize-nextflow`, and a test pins `processes`/`tools` to a live build), a snapshot generated with real `_plan_state` (one-line JSON entries, `draft-validate` clean), a final workflow, a ledger shaped like iwc-lab#8/#7 (chr filter removed with no drop, stale chr-extract decision, collate args unrecorded, stray `-h` record on an overridden id, tie gaps, a design drop), and `parity-diff.json` from gtu-ts #233 `a5c6cd57`. Variants in the test: drop recorded, call covered by a drop, call unmapped. CLI exit codes for both commands.

iwc-lab#7/#8 artifacts predate #781/#796 (no `effective_args`, no snapshot; #8's committed draft already lacks the chr step), so they're narrative only; scenario 4 binds a rerun of #8's source and model.

## Release dependency (keep draft)

Same as #796: `gxwf diff` needs a `@galaxy-tool-util/cli` release with `a5c6cd57` and the Foundry pin bump; the Mold names `gxwf diff` in prose only (it declares `[[gxwf]]` as a cli-tool, `evidence: hypothesis`). `foundry nextflow-parity` / `check-scope-records` need a gxwf-foundry publish.

The dependency now reaches an earlier phase too: interface Mold rev 8 tells every nextflow-to-galaxy run to run `foundry check-scope-records` and fix its problems before handoff. Until a gxwf-foundry publish, that step can't run in a live harness (the cast's `foundry` has no version pin, so `npx` gets the latest published package).

## Local gate

`npm run packages-build`, then `make -k check` at `da95a929`: red only on `validate-roadmap` (rate limit) and `check-vendored` (machine-only); 503 root tests pass. gxwf-foundry package tests, format, lint, typecheck, packages-typecheck clean. Commits `c17186c6` (package + CLI pages), `da95a929` (Mold, pipeline, interface rev 8, casts), `d53ebfcc` (output-from-input fix with a red test; `[[gxwf]]` cli-tool ref). `npm run validate` warnings: 71 on base `4ff48eda` and on head, identical lists.

## Reviews (2026-11-12)

Three reviews, each acted on red-to-green; debriefs in [subagents/](subagents/).

- [Normal](subagents/normal_review.md) → `9530080f`: record fallback per call, not per row; exit 3 when a one-sided step disagrees with the diff; `source-arg-malformed`; list-form index after inputs. The covered-by test variant now deletes `collate` from both sides (a real diff input).
- [Codex](subagents/codex_review.md) → `d63d5b66`: shared `withLabel` ids no longer map a call; removed outputs join drops naming them in `units`; flag records with no disposition or `because` record nothing.
- [Thermo](subagents/thermo_review.md) → `c111bb97`: step keys recurse only where `gxwf diff` does (inline on both sides); unmatched step drops land in `other_drops`; steps are built once, with no mutation pass; `exitOnInputShape()`. Follow-ups not taken: a shared ledger record taxonomy, typed diff and summary inputs.

Gate at `c111bb97`: same two machine-only reds as before; 503 root and 149 package tests pass.

- [Domain review](domain_review.md) → `a9311739` (content only): pin-dependent text out of the `[[gxwf]]` purpose; Mold body trimmed to runtime instructions with one "must not"; Findings as a table and deterministic evals name `nextflow-galaxy-parity.json` as oracle; scenario fixtures made concrete (case 3 binds a pinned sarek run, case 4 the iwc-lab#8 rerun); pipeline "Lifted from" cut. Two upstream issues drafted, not filed: (A) gtu-ts export step keying / `resolveSourceReference` or list kept steps in `WorkflowDiff`; (B) gtu-ts `ParsedTool` drops `requirements`/`containers`/`stdio`.
- [Documentation review](documentation_review.md) → `9b100aa5`: `nextflow-parity.md` Output restructured (exit first, field sub-bullets, `steps_from: null`); scenario semicolons; changeset split.

Gate at `9b100aa5`: same two machine-only reds; 503 root and 149 package tests pass; typecheck and packages-typecheck clean.

## Questions for John

1. `check-scope-records` folded into this branch (#798 issue F). Keep it here, or split it onto #821?
2. Interface Mold rev 8 invokes an unpublished command. OK while the stack stays draft, or gate that line on the gxwf-foundry publish?
3. Releases needed before undraft: gtu-ts `a5c6cd57` + Foundry `@galaxy-tool-util/cli` pin bump, and a gxwf-foundry publish.
4. `StepRemovalInputError` renamed to `InputShapeError` (shared by the ledger readers). It was only on #818's unreleased branch; no alias kept, and the changeset no longer mentions it. OK?
5. Follow-up issue for a shared ledger record taxonomy (`classifyLedger`) across step-removals, scope-records and nextflow-parity (thermo S2)?
6. File the two drafted gtu-ts issues in [domain_review.md](domain_review.md)? Issue A could ride on gtu-ts #233 (still open).
7. Scenarios 3 (sarek) and 4 (bamtofastq rerun) need real nextflow-to-galaxy runs to check. Queue them as `/test-pipeline` runs? Their expects are predictions: a fresh run may not remove the chr filter again or reproduce the example scope ledger exactly. Case 4 uses bamtofastq 2.2.1 (as iwc-lab#8), while `fixtures.yaml` pins 2.2.0. Bump the pin, add a 2.2.1 entry, or rebind to 2.2.0?
