# Implementation debrief — issue-798-nextflow-scope-decisions

galaxyproject/foundry#798. Stacked on `issue-796-test-phase-removed-steps` at `b74c6bdd` (draft PR #818, itself on #809). Commits `c1fc9d0b` (content + test) and `06913c8a` (casts, assemblies). After review: `94fcfb58` (normal review), `fc28186c` (Codex), `eb81515c` (thermo-nuclear), `198340b3` (test-data overview line, eval clause); head `198340b3`.

## What changed

- **open-requirements-ledger rev 10, new "Source scope" section.** Shape, rules and the `from` citation grammar for scope records (below). Later Molds design nothing for an excluded branch and carry its drop `open`.
- **nextflow-summary-to-galaxy-interface rev 7.** New `## Scope` body section: honour a caller scope, else follow `test_selection`'s candidate (`params_delta`, `effective_profiles`) plus param defaults; on `needs-scope-choice` pick the primary candidate changing fewest branch controls, `confidence: low`, never stop. A fixed control is not a workflow input; an open one is. The brief names the scope and drop ids. Says the direct pipeline has no human gate and points caller-chosen scope at `nextflow-summary-to-workflow-brief` (no issue numbers in Mold prose, so #500 is not named there). New on-demand reference `nextflow-test-case-selection`. Eval: the "branch controls survive" property now accepts a scope decision and requires a drop per excluded branch; new deterministic property for scope-record shape and citations. Scenarios: new sarek case; demo case expects no scope decision.
- **nextflow-summary-to-galaxy-data-flow rev 9.** One paragraph: work inside the scope, no node / `when:` / fan-in for a scope-dropped branch, drops stay `open`, may name a companion workflow in a sentence. `nextflow-conditional-to-galaxy-subworkflow-when` trigger limited to in-scope branches. New eval property + sarek scenario.
- **Pipeline scenario** `nf-core/sarek capped at 5 steps` now names the scope decision (recording the cap) and the open scope drops carried to the final ledger.
- **nextflow-test-case-selection rev 3**: the "once the design tier begins carrying" line now points at the interface Mold.
- **Review rounds** ([normal](subagents/normal_review.md), [Codex](codex_review.md), [thermo](thermo_nuclear_review.md)):
  - Fallback tiebreak: `default.nf.test`/`main.nf.test`, then non-stub, then first listed. It picks from all candidates when none is primary. New rnaseq 3.24.0 scenario, the live `needs-scope-choice` case.
  - The interface brief names the scope's candidate. `nextflow-to-test-data` (rev 5) and `nextflow-test-to-galaxy-test-plan` (rev 9, new `nextflow-galaxy-interface` input) use it on `needs-scope-choice`.
  - The sarek `scope-later-start-steps` drop now names summary units.
  - The pipeline scenario's cap goes in `decision`, and the steps past it are a plain drop.
  - The ledger note now says a candidate-`id` citation rests on the name alone, and a free-text control goes in `because`.
  - Duplicated rules have one home each: the ledger owns shape, grammar and "design nothing for a drop"; the interface Mold owns selection and inputs.
  - The test asserts the scenario families, unit names, no re-selected fixed control, and `params.*`-only citations, each proved by a fixture mutation.
- **Fixture** `content/molds/nextflow-summary-to-galaxy-interface/examples/sarek-germline-scope/` (ledger + README): one scope decision (`step: mapping`, `aligner: bwa-mem`, `tools: strelka`, candidate `tests/default.nf.test`) and nine scope drops (somatic, tumor-only, other germline callers, germline SV/CNV, alternative aligners, later start steps, annotation, VCF post-processing, optional preprocessing).

## Scope-record shape (for #784)

```yaml
decisions:
  - id: scope-germline-strelka
    decided_by: nextflow-summary-to-galaxy-interface
    scope:
      candidate: "<test_candidates id>"        # optional
      controls: [{control: params.step | profile, value, from}]
    decision, rationale, confidence?
entries:
  - id: scope-somatic-calling
    status: open
    kind: dropped
    raised_by: nextflow-summary-to-galaxy-interface
    scope_branch:
      decision: <scope decision id>
      selected_by: [{control, value, from}]
    units: "backticked summary subworkflow/process names"
    because: "outside the selected scope `<decision id>`: ..."
    unmet, missing
```

- Find the scope: the `decisions[]` item with `scope`. Find its drops: `entries[]` with `scope_branch` (join on `scope_branch.decision`).
- Never a top-level `step`, never `source_arg`: #796's `check-step-removals` ignores them, and #781's flag records (which carry `source_arg`) stay separate.
- `from` grammar: `params[<name>].enum|.default`, `params[<name>]` (boolean set `true`), `profiles[<name>]`, `test_candidates[<id>]` (id names the value) or `test_candidates[<id>].params_delta`, `workflow.conditionals[<name in affects>]`.

## Red → green

`tests/scope-decisions.test.ts` failed on base (fixture missing), then passed. Two tests: record shape (always runs), and citations against a live `buildSummary` of sarek 3.8.1 (runs when `workflow-fixtures/pipelines/nf-core__sarek` or the `~/projects/repositories/workflow-fixtures` clone exists). Sanity-checked: a fake unit name and an enum value not in `params[aligner].enum` both fail it. The review kept the CI skip, as `itIfSarekFixture` does. Running it in CI needs sarek in CI's fetch list, a cache-key bump and fixtures materialised before `npm run test`. CI runs root tests before fixture materialization and doesn't fetch sarek, so the citation test skips in CI (as the existing sarek integration test does). The Mold changes themselves are LLM-judged.

## Findings for other issues

- **Summarizer gaps (#215/#216):** sarek 3.8.1's `workflow.conditionals[]` has only the six `main.nf` guards (cnvkit, download_cache, snpsift); the `params.step` / `params.tools` guards inside `subworkflows/local/fastq_preprocess_gatk` etc. aren't captured. `params[tools]` has no `enum`; its values live only in `nextflow_schema.json`'s `pattern`, which the summary drops. The 2026-05-08 sarek refinement's claim that step/aligner guards are captured doesn't hold at 3.8.1.
- **Dynamically generated test candidates inherit the `test` profile's `params_delta`:** every sarek `tests/*.nf.test::dynamically-generated` candidate shows `tools: strelka`, including `variant_calling_mutect2`. That's why `tools` alternatives are cited by candidate `id`, not `params_delta`. Worth an issue against summarize-nextflow. Codex flagged the resulting citations as unsupported. The ledger note now says so, and the real fix is here.
- **Stub nf-test cases are classified `real`/`primary`:** rnaseq 3.24.0's `- stub` cases come out `execution_mode: real`, `scope: primary`, against summarize-nextflow index.md:417. That's why rnaseq returns `needs-scope-choice`.
- **For #784:** move `checkCitation`/`scopeRecords` into `gxwf-foundry` beside `step-removals.ts` when #784 adds a second ledger reader.
- **Not built (per the issue plan):** no `branch_controls[]` summary field; no interactive prompt (belongs to `nextflow-to-workflow-brief` / #500); no change to the template Mold — the ledger note it bundles carries the "work inside the scope" rule.

## Local gate

At `198340b3` (2026-11-12), and after each review commit: `npm run packages-build` first, then `make -k check`. It's red only on `validate-roadmap` (GitHub API rate limit, unauthenticated) and `check-vendored` (fails on this machine only). 503 root tests pass. `npm run typecheck`, `packages-typecheck`, `format` and `lint` are clean. No package code changed, so `packages-test` wasn't rerun.
