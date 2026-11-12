Run via a Claude Opus 5.5 subagent (default effort) with the shared thermo-nuclear prompt plus REVIEW_FOCUS.md, over `git diff 4ff48eda` at `d63d5b66`. Triaged and acted on by Claude Opus 5.5.

# Thermo-nuclear review — `4ff48eda..d63d5b66`

I fixed both behaviour bugs (B1, B2), each red-to-green, and made the main structural change (S1). `assembleNextflowParity` now builds each step once and never mutates it. I also extracted the exit-3 boilerplate. The fixture's JSON output is byte-identical before and after the refactor, checked with a scratch baseline over four input variants. I didn't do the cross-package typing and taxonomy refactors (S2, S3 full, S4, S6). Each is a reasonable follow-up, but each widens the branch past #784.

Fixed:

- **B1, CONFIRMED: the step/diff agreement guard rejected valid inline subworkflows.** gtu-ts `a5c6cd57` `diffLevel` recurses only into steps that are matched on both sides and inline on both sides. `workflowSteps` recursed everywhere, so a removed inline subworkflow, or inline vs linked, exited 3. The new `joinSteps` walks both sides one level at a time, recursing exactly where the diff does. Red test: inner keys under a removed step and under an inline-vs-linked step are absent; they're present when both sides are inline.
- **B2, CONFIRMED: some step drops appeared nowhere.** Before, `other_drops` excluded any drop with `step`. Now it excludes only drops that a removed step's `dropped_entries` lists. Step drops that name a kept step, or that lack `because`, are now listed there. Red test.
- **S1: the step/call build had temporal coupling.** Plan calls are computed first, then calls are mapped to steps and inverted (`recordCalls`), and each `StepParity` is built once with its `calls`, `calls_from` and `source`. Both mutation loops are gone. `processLookup` and `strayProblem` are named functions. `idCalls` became an id→call-count map. The `call-unmapped` dedup uses a `Set`.
- **P3: exit-3 try/catch repeated in three commands.** Now `exitOnInputShape()` in `lib/read-input.ts`.
- **S3 (part): `removedSteps` and `unwiredInputs` were exported but unused.** Un-exported.

Not acted on:

- **List-form relabel (B1 case 2).** `gxwf diff` pairs steps by `id` and this command doesn't. That was already documented as exit 3 in round 1. Drafts are dict-form.
- **B3: scope drop `because` must be a string, while `hasReason` accepts a list.** The scope-drop contract from #798 writes a string, and strictness on a new record kind is deliberate. A question for John if list-form appears.
- **S2: one `classifyLedger` taxonomy.** Agreed that record kinds are worked out separately in `step-removals`, `scope-records` and `nextflow-parity`. It's an M-sized change across three modules and their public signatures. B2 was the concrete leak, and it's fixed. Follow-up candidate.
- **S3: typed `readWorkflowDiff`.** It's better to import upstream `WorkflowDiff` once gtu-ts ships `diff`, and the branch already waits on that release. Writing a mirror now would be replaced soon after.
- **S4: summary types hand-mirrored.** `@galaxy-foundry/summarize-nextflow` doesn't export `Process`/`EffectiveArg`. Exporting them touches another package's public API. Follow-up.
- **S5: `resolveSourceReference`.** It isn't exported from the `@galaxy-tool-util/schema` 1.15.0 root (checked at runtime: `undefined`), so it can't be used yet.
- **S6: share the ledger-shape primitive with build-cli `run-ledgers.ts`.** Not blocking per the reviewer. The parsers stay separate by design (tolerant dashboard model vs strict join reader).
- **Gap records accept any non-dropped entry.** That's intended for a report-only tool, and the record's `status` is shown.

<details><summary>Full review (condensed)</summary>

Verdict: don't approve as is. One behaviour bug and one clear code-judo restructure. No file passes 1k lines (`nextflow-parity.ts` 487). Sharing `ledger.ts` was right, but it shares readers, not the record taxonomy.

- B1: the agreement guard rejects inline subworkflows (gxwf diff recurses only into matched both-inline steps) and list-form relabels (`idRenames`). Size M.
- B2: step drops with no `because`, a non-string `step`, or naming a kept step fall out of every bucket. Size S.
- B3: scope-records requires a string `because`; `hasReason` accepts a list.
- S1 (P1): build `StepParity` once. Plan calls → callSteps → invert → steps, no mutation. About -40 lines.
- S2 (P1): `classifyLedger` discriminated union. Record kinds are re-derived in four places; the ledger is re-read four times.
- S3 (P2): piecemeal diff validation; `unknown` in output types; a missing `steps.added` defaults silently; `removedSteps` and `unwiredInputs` exported but unused.
- S4 (P2): summary types mirrored a third time; export them from summarize-nextflow.
- S5 (P2): `resolveSourceReference` canonical helper; document `workflowSteps` as a port of upstream `iterateSteps`.
- S6 (P2): share a non-throwing `ledgerShape` with build-cli; move `isRecord` to `lib/`.
- P3: exit-3 block copied in three commands; gap records accept any status; `indexOf` dedup; nested stray ternary; `StepRemovalInputError` export removed (unreleased).

No security issues.

</details>
