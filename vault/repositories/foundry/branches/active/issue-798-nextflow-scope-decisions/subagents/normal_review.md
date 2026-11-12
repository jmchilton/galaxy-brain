Run via Claude Opus 5.5 at high effort.

Reviewed `b74c6bdd..06913c8a` myself; fixes in `94fcfb58` (no subagent; the coordinator runs each step serially). The scope shape is sound and reuses the ledger's own vocabulary. I acted on the untested `needs-scope-choice` fallback, a fixture drop that broke its own rule, weak test assertions, an over-claiming pipeline scenario and an undocumented grammar limit. The test-data and test-plan divergence is left as a question for John, because fixing it would change their contracts.

Not acted on:

- **Test-data and test-plan Molds don't read the scope decision.** On `needs-scope-choice`, `nextflow-to-test-data` step 2 "record[s] the caller's choice", and `nextflow-test-to-galaxy-test-plan` consumes "the candidate selected by summarize-nextflow". Neither takes the ledger in `input_artifacts`. An autonomous run can therefore design one candidate's branch and test another. Wiring the ledger in is a contract change. Question for John. (Later fixed in the Codex round through the interface brief, without wiring in the ledger; see [codex_review.md](../codex_review.md).)
- **The sarek citation test skips in CI.** I kept it. `packages/summarize-nextflow/test/integration/cli.test.ts` `itIfSarekFixture` skips the same way. Running it in CI would mean adding sarek (`tier: large`) to the CI fetch list, bumping the fixture cache key, and moving materialisation ahead of `npm run test`. That's John's cost call. I strengthened the shape test instead, which always runs.
- **Shared ledger reader.** Ledger readers now exist in three places: the test's `scopeRecords`, `step-removals.ts`'s `ledgerEntries` and build-cli's `parseOpenRequirements`. #784 should put a scope reader next to `step-removals.ts` rather than add a fourth. Noted in `stack_plan.md`.
- **`because` repeats `scope_branch.decision`.** I kept it. `because` is what readers and the run dashboard render (`asProse`), so it should read on its own.

<details><summary>Full review</summary>

**Verdict:** the shape is right. It needs a deterministic fallback, a fixture fix and stronger tests. No security issue found.

### Shape vs existing vocabulary

- The scope is a `decisions[]` item carrying a nested `scope`. Each drop is a `kind: dropped` entry carrying a nested `scope_branch`, plus the existing `units` / `because`. This mirrors #781's nested `source_arg` and adds no new collection. `confidence: low` reuses the open-question decisions' field.
- It stays apart from #796. `isStepDrop` in `packages/gxwf-foundry/src/step-removals.ts` requires a top-level `step`, so scope drops never match a removed step and never trip the gate.
- It stays apart from #781. Scope drops carry no `source_arg`, and the test checks that.

### Findings

- **P2: The fallback ties on the real case.** sarek 3.8.1 comes back `selected`, so no scenario reached `needs-scope-choice`. nf-core/rnaseq 3.24.0 (fetched in CI) comes back `needs-scope-choice` with 47 primary candidates. `tests/default.nf.test::Params: default` and `::Params: default - stub` both change zero branch controls, so "fewest branch controls" doesn't pick one. **Fixed.** The interface Mold now breaks ties by preferring `default.nf.test`/`main.nf.test`, then a case not named as a stub, then the first listed. A new rnaseq scenario expects the `default` candidate with `confidence: low` and an aligner drop citing `params[aligner].enum`.
- **P2: Test-data/test-plan divergence.** Not fixed; see above.
- **P2: A fixture drop broke its own rule.** `scope-later-start-steps.units` had no backticked subworkflow or process name, only `step` and `mapping`. The ledger note and the eval both require summary unit names. **Fixed.** It now names the restart arms of `SAMPLESHEET_TO_CHANNEL` and `FASTQ_PREPROCESS_GATK`, which the live sarek summary confirms. Red first: the new "at least one unit name" assertion failed on it.
- **P2: The shape test was too weak.** **Fixed:**
  - It asserts the six drop families the sarek scenario names.
  - It asserts that every drop has at least one backticked unit name.
  - It asserts that no drop's `selected_by` repeats a control value the scope fixes.
  - `checkCitation` now requires a `params.*` control for `params[...]`, `params_delta` and `workflow.conditionals[...]` citations. Before, a `profile` control reached `toContain(undefined)`.

  I mutated the fixture once per new assertion: `tools: strelka` in the somatic `selected_by`, a renamed `scope-annotation`, and a `profile` control citing a conditional. Each failed as intended.
- **P3: The pipeline scenario claimed what the shape can't hold.** It said the scope decision records "the caller's cap", but a 5-step cap is no `control`. The steps past the cap also can't be scope drops, because `selected_by` must be non-empty. **Fixed.** The cap now goes in `decision`, and the steps past it become a plain `kind: dropped` entry without `scope_branch`.
- **P3: Grammar gap.** `scope-optional-preprocessing.because` names `umi_read_structure` and `use_gatk_spark`, which are free-text params with no citable value. **Fixed** by documenting the limit in Source scope: such a control goes in `because`. The grammar is unchanged.

### Findings for other issues

- **summarize-nextflow:** rnaseq's `- stub` nf-test cases come out `execution_mode: real`, `scope: primary`. index.md:417 says stub-only cases are `bootstrap-only`. That misclassification is why rnaseq returns `needs-scope-choice` at all.
- The debrief's two earlier summarizer gaps still hold:
  - sarek's nested `step`/`tools` guards are missing from `workflow.conditionals`.
  - Dynamic candidates inherit `test`'s `params_delta`.

</details>
