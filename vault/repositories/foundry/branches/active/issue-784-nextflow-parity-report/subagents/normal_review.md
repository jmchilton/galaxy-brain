Run via Claude Opus 5.5 at high effort.

# Normal review — `4ff48eda..d53ebfcc`

Acted on three join bugs in `foundry nextflow-parity`, each red-to-green in `test/nextflow-parity.test.ts`, plus one keying mismatch with `gxwf diff`. One existing test variant was changed to be a faithful input (logged below). The ledger reader split, the `check-scope-records` move, the `InputShapeError` rename, the fixtures and the Mold's report-only boundary hold up; no change.

Fixed:

1. **Record fallback was per row, not per call.** A template-resolved step (no `_plan_state`) with a record for `args` but none for `prefix` mapped the `args` row to the step and left the `prefix` row stepless. Result: a false `call-unmapped` for the call, and no `source-arg-unrecorded` for the missing `prefix` record. The step mapping is now built once per call from all its effective ids, so every row of a call shares `steps`.
2. **Step status trusted file presence when the diff disagreed.** `after ? "kept" : "removed"` silently marked a snapshot-only step `removed` with no finding when the diff didn't list it (wrong files passed, e.g. the extracted copy; or a list-form relabel `gxwf diff` pairs by `id`). Now a snapshot-only step must be in `steps.removed` and a workflow-only step in `steps.added`, else `InputShapeError` (exit 3). Status comes from the diff alone.
3. **A malformed `source_arg` vanished from every join.** `step` without `arg` made `sourceArg()` return undefined, and `"source_arg" in entry` also kept it out of `drops`. New finding `source-arg-malformed`.
4. **List-form index key** was `String(i)`; `gxwf diff` uses `index + inputs count`, and skips an empty label. Matched.

Test-data change: "covered by a drop" deleted `collate` from the snapshot only, leaving it in the workflow and absent from `steps.added`, an input no real `gxwf diff` produces. It now deletes `collate` from both sides (a design that never built the step). Same assertions; the new consistency check would otherwise reject it.

Changeset: dropped "`StepRemovalInputError` is now `InputShapeError`"; both changesets release together, so release notes would name a rename of something never published.

CLI page: new finding kind, exit-3 condition, and gotchas for list-form relabels and for `call-unmapped` only seeing calls with `effective_args`.

Not acted on:

- **`covered_by` includes `process.name`**, so a drop naming `SAMTOOLS_VIEW` covers all three aliased calls. Matches how scope units name processes; left as is.
- **Removed outputs inside inline subworkflows** (`<parent>/<out>`) get `source_step: null`: `outputSources` reads top-level outputs only. Drafts don't nest inline subworkflows today.
- **Calls without `effective_args`** can't yield `call-unmapped`: the summary has no full call path for them. Documented, not fixed.
- **Tie rows**: a flag every tied entry sets alike is "recorded as usual", on one entry id, so the other tied id reports `source-arg-unrecorded`. The ledger contract is ambiguous here; reporting is the safe side for a report-only tool.
- **`processFor` by last segment** could pick the wrong process if two modules share an alias name. Not seen in nf-core; skipped.
- **build-cli `parseOpenRequirements`** stays separate: it's a tolerant dashboard model (defaults ids and status, ignores `decisions`), and `ledger.ts` is a strict join reader that throws `InputShapeError`. Both accept the bare-list form. Folding them would couple build-cli to gxwf-foundry for no consumer gain.
- **`InputShapeError` rename without alias**: `StepRemovalInputError` exists only on #818's unreleased branch (gxwf-foundry 0.4.0 doesn't export it). No alias needed; question stays open for John.

<details><summary>Full review</summary>

Scope: `packages/gxwf-foundry/src/{nextflow-parity,ledger,scope-records,step-removals}.ts`, commands, tests, fixtures, the parity Mold, interface Mold rev 8, `tests/scope-decisions.test.ts`.

Joins checked:

- step↔call: `_plan_state.calls` parsed from the string; text and absent handled. Template-resolved steps join via records; bug 1.
- removed steps↔drops: reuses `checkStepRemovals` (nested-label guard kept). Removed outputs join through snapshot `outputSource`; input-sourced outputs get no step (d53ebfcc). Status/diff agreement: bug 2.
- #781 `source_arg {step, arg}` across `decisions` and `entries`: joined on step+arg, not record id, as the ledger note says. Stray classification order (unknown-step, unknown-arg, not-effective, other-step) is sound. Malformed: bug 3.
- #798 `scope_branch.decision`: `checkScopeRecords` checks it against the single scope decision; scope drops kept out of `other_drops`; `drops` excludes `source_arg` records so flag drops never cover calls.
- Step keying vs gtu-ts `a5c6cd57` `iterateSteps`/`buildSide`: dict keys match; list-form index fixed (4); id-pairing across relabels not ported (rejected with exit 3 instead). `iterateSteps` isn't exported from `@galaxy-tool-util/schema` 1.15.0, so it can't be reused yet.

`check-scope-records` move: every assertion in the old `scopeRecords`/`checkCitation` has a problem string, including the exactly-one-decision check (the root test now asserts `decision.controls.length > 0`, which fails with no decision). Interface Mold rev 8 cites it on-demand with a trigger and the eval property names it as the oracle.

Fixtures: summary built live from `pipeline/` and pinned by a test; diff from gtu-ts #233 `a5c6cd57`; snapshot `draft-validate` clean per the implementation debrief. Ledger shapes match the ledger note's Source arguments and scope sections.

Mold: report only (no edits, no routing back), renders from the JSON, and marks Tool Shed requirement comparisons unverified. What it judges (closure flag coverage, behavioural changes vs TODO resolution, input reasons in prose) has no deterministic key; agreed.

</details>
