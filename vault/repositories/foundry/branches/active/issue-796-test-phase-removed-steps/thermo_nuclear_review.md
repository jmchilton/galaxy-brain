Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review: `ef1607a8..c48a8ee2` (fixes at `9fa4bfc2`, `5e1f57a2`)

Scope: `check-step-removals` (`packages/gxwf-foundry/src/step-removals.ts`, `commands/check-step-removals.ts`, wiring, tests) and the Mold growth in run-workflow-test, debug-galaxy-workflow-output and advance-galaxy-draft-step.

Verdict: no structural regression. The core module is small, pure and typed at its output. It's split the right way: a pure `checkStepRemovals` and a thin CLI runner, the same as `workflow-brief` / `check-workflow-brief`. No file nears 1k lines (largest touched: `meta/index.ts` 345, advance Mold 202). There were two real issues, a duplicated read-or-exit block and two dense Mold paragraphs. Both are fixed with behaviour preserved.

## Fixed

1. **Fourth copy of read/parse/`error reading`/exit 1.** The branch added `readInput` in `check-step-removals.ts`, the fourth copy of the block in `run-json-validator`, `run-yaml-validator` and `validate-markdown`'s `readMarkdownFile`. I extracted `src/lib/read-input.ts` (`readInputOrExit(path, parse?, source?)`) and moved all four onto it. `readMarkdownFile` is deleted; `check-workflow-brief` and `validate-markdown` call the helper directly. Behaviour is preserved: messages and exit codes are byte-identical (`run-json-validator.test.ts` pins `^error reading`), and only `check-step-removals` maps `-` to stdin, through the optional `source` it passes. A first cut moved the stdin mapping into the helper, which would have made `-` read stdin for every validator; I reverted that in the follow-up commit. Net about -20 lines.
2. **`let result;` untyped** in the runner. It's now `StepRemovalCheck`.
3. **run-workflow-test step 6 was one paragraph with four status outcomes.** It's now a lead sentence plus one bullet per outcome (pass / `unlabelled-step-removal` / `step-removal-check-error`). The no-snapshot case moved to the lead, because the bullets sit under "when the snapshot exists". The `unwired_inputs` rule joined the "record the JSON" sentence. Same content.
4. **debug step 8 was one paragraph with five routes.** It now follows step 3's house shape: lead sentence, "route by what it shows" bullets (restore vs `kind: dropped`), and a trailing paragraph for the cross-cutting rules (reopen a refuted drop "either way", check-error is tooling). Same content. The reopen rule stays additive, not a third exclusive route.

Casts regenerated.

## Considered, not changed

- **Shared ledger reader with `build-cli`'s `parseOpenRequirements`.** The two diverge on purpose. For a mapping without `entries` (for example only `decisions:`), `ledgerEntries` returns `[]` and `parseOpenRequirements` returns `null` (no ledger). Malformed shapes throw here (exit 3) and come back `null` there. A missing id here is `"(no id)"` in `dropped_entries`; there it's synthesized as `entry-N`. A shared "raw entries" helper would need a mode flag for each difference, which is worse than two 10-line readers. If John wants one ledger model, it's a `gxwf-foundry`-owned `OpenRequirementsLedger` parse that `build-cli` adopts, which is a separate change.
- **Advance's extracted-snapshot write in the preamble rather than in step 1.** Extraction happens in both step 1 and step 6, so the preamble's "when a call runs draft-extract" is the one place that covers both. Left alone.
- **`unknown` narrowing in `step-removals.ts`.** It stays until the pin bump brings `@galaxy-tool-util/schema`'s `workflow-diff.ts` types, as the normal review noted.
- **`runJsonValidator` / `runYamlValidator` are identical except for the parser.** This predates the branch and is now three lines each smaller. Collapsing them into one runner is a follow-up.
- **`meta/index.ts` repeats `program.ts`'s descriptions.** That's the existing pattern, guarded by the parity test.
