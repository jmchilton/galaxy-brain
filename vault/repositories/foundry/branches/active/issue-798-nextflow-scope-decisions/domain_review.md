Run via Claude Opus 5.5 at high effort.

Domain review of `b74c6bdd..198340b3` against `wf_foundry/reviewers/DOMAIN_REVIEW.md`, authored content and test only. Fixes are in `32720e29`, with casts regenerated in the same commit.

## Changed

- **§1, ledger note.** Dropped the sarek bug narrative from the `from` rule: "as with sarek's `tools`" and the sentence saying a candidate-`id` citation rests on the name alone because generated candidates inherit `test`'s `params_delta`. The no-field candidate-`id` citation rule stays, because the fixture and test depend on it. The summarizer bugs are drafted below (issues A and B).
- **§1, interface Mold.** Dropped the "then a case not named as a stub" tiebreak. It existed only because summarize-nextflow classes `options "-stub"` cases as `real`/`primary` (issue D). Without it rnaseq still picks `tests/default.nf.test::Params: default`, which the summary lists before its `- stub` twin.
- **§3, interface Mold.** Cut the self-justifying "runs without a human gate, so…" clause, the routing sentence to `nextflow-summary-to-workflow-brief` (the agent acts on neither, and "Honour a scope the caller supplied" already covers a caller scope), and "The test Molds read the candidate from there". The body now ends "Never stop to ask which branch to build."
- **§3/§4, ledger note.** The last Source scope bullet is now just the rule: no top-level `step`, no `source_arg`. The clause explaining the step-removal check was rationale in a note bundled into 25 casts.
- **§2, interface scenarios.** The rnaseq case no longer explains why its candidate wins ("wins the tie with its `- stub` twin"). The sarek case's "checked by `tests/scope-decisions.test.ts`" aside is gone.
- **§2, pipeline sarek case.** Cut the restated ledger shape, which the interface Mold case owns. It keeps the end-to-end claims: the scope decision fixes `step`, `tools` and `aligner` and records the 5-step cap, the steps past the cap get a plain open drop, every drop is still `open` in the final ledger, plus the per-step loop and tool-resolution claims. The pre-existing expectation that both briefs state the partial scope rather than silently dropping the rest of the pipeline went missing in `32720e29` and was restored in `5feb4633`.

## Checked and left alone

- **The new `nextflow-galaxy-interface` input on `nextflow-test-to-galaxy-test-plan` is justified.** The test plan doesn't carry the ledger, the interface phase runs earlier in `nextflow-to-galaxy`, and `nextflow-to-test-data` already takes the same brief. The pipeline `_assembly.json` records no per-phase inputs, so no wiring change is needed. The cast lists the input with its producer.
- **§2 fixtures.** Every new case names a concrete fixture: sarek 3.8.1 `4bd2948f`, rnaseq 3.24.0 `47b3b0d3`, and the committed `examples/sarek-germline-scope/` ledger. I re-ran `buildSummary` on both. Sarek returns `selected` on `tests/default.nf.test::dynamically-generated`, and rnaseq returns `needs-scope-choice` with 47 primary candidates. rnaseq's `aligner` default is `star_salmon`, with four enum values.
- **The autonomous fallback against Foundry's principles.** It fits the direct pipeline's documented no-human-decision contract, and `confidence: low` keeps the choice visible. But it is a deterministic ranking rule (fewest branch-control changes, then canonical file, then first listed) written as Mold prose, against "Deterministic tools do deterministic work". It can't move to the summarizer yet, because counting branch controls needs judgment until the summary marks them, and the issue plan ruled out a `branch_controls[]` field. That's a question for John below, not a fix.
- **§5, no Galaxy design before design phases.** The interface Mold chooses scope, not tools or datatypes. The data-flow change only removes work.
- **§4, YAML flow-style dicts.** The `{control, value, from}` triples in the ledger note example and the fixture stay in flow style. They are uniform three-field rows, and about 30 block-style entries would read worse than the table-like flow lines. Say so if you'd rather have block style.

## Not fixed: needs John

- **The deterministic eval property has no oracle (§5 "CLI-checkable rules get CLI checks", eval-philosophy "Run deterministic checks").** "scope records cite the summary and stay apart from step and flag records" is `check: deterministic`, but its only checker is `checkCitation`/`scopeRecords` in `tests/scope-decisions.test.ts`, run over the committed fixture. A trial can't run it on a run's ledger, so under eval-philosophy every trial reports the property blocked. Thermo deferred lifting the checker into `gxwf-foundry` because it has one caller, but that count left out the eval itself. Relabelling the property `llm-judged` would weaken the check, so I didn't. Options: lift it now as `foundry check-scope-records <ledger> <summary>`, or fold it into #784 (issue F text below).
- **Abstract scenario cases in touched files (§2).** Four in the data-flow scenarios, four in the interface scenarios, and the pipeline's "branch-control fidelity" case. All of them predate this branch. Issue E is drafted as a `work/ready-implement` cleanup rather than growing this PR.

## Drafted issues (not filed)

### A. summarize-nextflow: dynamically generated nf-test candidates inherit the profile's `params_delta`

Sarek 3.8.1 (`4bd2948f`) generates its nf-test cases from a literal `test_scenario` list in each file. The summary keeps one `::dynamically-generated` candidate per file, but its `params_delta` is the profile chain's, not the scenarios'. `tests/variant_calling_mutect2.nf.test` sets `tools: 'mutect2'` and `step: "variant_calling"` in every scenario (lines 12-24), yet its candidate shows `effective_profiles: [test, mutect]` with `params_delta.tools: strelka`, which comes from `conf/test.config:47`. Every sarek generated candidate shows `tools: strelka`.

Expected: when every scenario in the list sets a param to the same literal, carry it in the candidate's `params_delta`. When scenarios disagree, keep the values per scenario or warn, but don't report the profile's value.

On fix: the open-requirements ledger note's no-field `test_candidates[<id>]` citation (and its branch in `tests/scope-decisions.test.ts`'s `checkCitation`) can give way to `test_candidates[<id>].params_delta`, and the sarek scope fixture's `tools` citations move to it.

### B. summarize-nextflow: list-valued params lose their vocabulary when the schema uses `pattern`

Sarek's `tools` param (`nextflow_schema.json:109-115`) has no `enum`. Its values live in `pattern`, `^((ascat|bbsplit|…|varlociraptor)?,?)*(?<!,)$`. The summary's `params[tools]` keeps `type`, `description` and `default: null` but drops `pattern`, so nothing in the summary lists the valid tools.

Expected: keep `pattern` on `params[]`, or derive the alternation's values into a field such as `values[]` when the pattern is a comma-list of literals.

On fix: scope records can cite `params[tools].values` (or similar) instead of naming a test candidate whose `id` contains the value. Together with A, that retires the no-field candidate-`id` citation form.

### C. summarize-nextflow: `workflow.conditionals[]` reads only the primary workflow body

`resolver.ts:448-449` calls `parseWorkflowConditionals(primaryWorkflow.body, …)`, so guards inside local subworkflows are missed. Sarek 3.8.1 has six conditionals, all from `main.nf` (cnvkit, `download_cache`, snpsift). The `params.step` guards in `subworkflows/local/fastq_preprocess_gatk/main.nf` (:74, :262, :376, :453) and the `params.tools` guards there (:142, :320) and in `subworkflows/local/utils_nfcore_sarek_pipeline/main.nf` (:139, :142) are missing. `content/molds/summarize-nextflow/refinements/2026-05-08-sarek-emulation.md:21-22` says the `step` and `aligner` guards are captured, which no longer holds at 3.8.1. Related: #791 (`ext.when` gates).

Expected: parse `if` guards in every subworkflow body the primary workflow reaches, attributing `affects` to the calls inside each arm.

On fix: scope drops for `step` and the `tools` branches can cite `workflow.conditionals[…]` instead of `params[step].enum` and candidate names, and the refinement's claim becomes true again.

### D. summarize-nextflow: `options "-stub"` cases are classed `execution_mode: real`, `scope: primary`

rnaseq 3.24.0 (`47b3b0d3`) `tests/default.nf.test:43-45` declares `test("Params: default - stub")` with `options "-stub"`. Its candidate comes out `execution_mode: real` and `scope: primary`, as do all 20 `- stub` cases. The Mold says stub-only candidates are `bootstrap-only` (`content/molds/summarize-nextflow/index.md`, "Classify full-scale candidates…"). Because of this, `default.nf.test` holds two primary candidates and rnaseq returns `needs-scope-choice` instead of `selected`. Sarek's `tests/default.nf.test` also folds a `stub: true` scenario into its single generated candidate.

Expected: `execution_mode: stub` and `scope: bootstrap-only` for cases with `options "-stub"` (or a scenario-level `stub: true`).

On fix: rnaseq returns `selected`, so the `nextflow-summary-to-galaxy-interface` scenario "rnaseq scope falls back without stopping" no longer reaches the fallback. Replace its fixture with a pipeline whose `needs-scope-choice` has another cause (none of bacass, demo, fetchngs, hlatyping or taxprofiler does at their pins), or drop the case.

### E. Name concrete fixtures for the abstract nextflow-to-galaxy scenario cases (`work/ready-implement`)

These `## Case:` entries describe an abstract input instead of naming a fixture:

- `nextflow-summary-to-galaxy-data-flow/scenarios.md`: "operator translation is classified, not guessed", "collection shape survives across nodes", "unresolved tool needs are bounded", "template Mold can consume the draft".
- `nextflow-summary-to-galaxy-interface/scenarios.md`: "sample-sheet metadata is preserved", "output labels are testable", "excluded params are auditable", "downstream data-flow Mold can consume the brief".
- `pipelines/nextflow-to-galaxy/scenarios.md`: "branch-control fidelity" ("a Nextflow summary with a skip-style branch control").

Give each one a pinned `workflow-fixtures` pipeline or a committed summary (demo's `skip_trim` fits branch-control fidelity, and sarek or rnaseq fit operator translation and sample sheets), and check each expectation against that fixture's summary.

### F. Lift the scope-record check into `gxwf-foundry`

`nextflow-summary-to-galaxy-interface`'s eval property "scope records cite the summary and stay apart from step and flag records" is `check: deterministic`, but its checker lives in `tests/scope-decisions.test.ts` and runs only on the committed sarek fixture. Move `scopeRecords`/`checkCitation` beside `step-removals.ts` as `foundry check-scope-records <ledger> <summary.json> [--json]`, add a CLI page under `content/cli/foundry/`, reference it from the interface Mold, and have the test call the library. #784's parity Mold, which reads the same records, is the second consumer.

## Gate

At `32720e29` (2026-11-12): `npm run packages-build`, then `make -k check`: red only on `validate-roadmap` (GitHub API rate limit) and `check-vendored` (fails on this machine only), 503 tests passing. `npm run typecheck` and `npm run packages-typecheck`: clean.

## Questions for John

1. Deterministic eval with no oracle: lift `check-scope-records` into `gxwf-foundry` now, or fold it into #784?
2. Should this PR stay draft until A and B land (§1, "depends on an upstream fix stays draft"), or are name-only candidate citations acceptable meanwhile?
3. Should the fallback ranking move into summarize-nextflow (for example a `fallback_candidate_id` on `needs-scope-choice`), or stay in the Mold as long as branch controls need judgment?
4. File A–F as written?
