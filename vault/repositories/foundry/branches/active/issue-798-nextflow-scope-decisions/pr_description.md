Fix 🎯 #798 - a nextflow-to-galaxy run on a multi-path pipeline like sarek now records which branch it built and every major branch it left out, instead of silently collapsing to the test profile.

Closes #798.

***Depends on #818 (which depends on #809). Until both merge, this diff includes their commits too. This PR's own commits are [`b74c6bdd..5feb4633`](https://github.com/jmchilton/foundry/compare/issue-796-test-phase-removed-steps...issue-798-nextflow-scope-decisions).***

sarek 3.8.1 offers germline and somatic calling, five aligners, six start steps, annotation and VCF post-processing. A nextflow-to-galaxy run builds one of those paths, which is right, but nothing on `main` tells it to say so. No design Mold reads `test_selection`. The ledger has `decisions` and `kind: dropped` entries that could hold the choice, but no Mold writes one. The pipeline's own sarek scenario already expects `step`, `tools` and `aligner` to "survive into the interface and data-flow briefs as scope decisions". Today that expectation has nothing behind it.

## What a sarek run now records

`content/molds/nextflow-summary-to-galaxy-interface/examples/sarek-germline-scope/open-requirements.ledger.yml` is the ledger the interface Mold should write for sarek 3.8.1 (`4bd2948f`) with no caller scope. `test_selection` selects `tests/default.nf.test`, so the scope follows it:

```yaml
decisions:
  - id: scope-germline-strelka
    decided_by: nextflow-summary-to-galaxy-interface
    scope:
      candidate: "tests/default.nf.test::dynamically-generated"
      controls:
        - {control: params.step, value: mapping, from: "params[step].default"}
        - {control: params.aligner, value: bwa-mem, from: "params[aligner].default"}
        - {control: params.tools, value: strelka, from: "test_candidates[tests/default.nf.test::dynamically-generated].params_delta"}
    decision: "Build germline short-variant calling from paired FASTQ: BWA-MEM alignment, duplicate marking, base recalibration, Strelka germline calls, and the QC reports."
```

Each branch family it leaves out becomes an open `kind: dropped` entry that names the control values that would run it and the summary units it covers:

| Scope drop | Would run with | Units (sample) |
|---|---|---|
| `scope-somatic-calling` | `tools: mutect2`, profile `mutect` | `BAM_VARIANT_CALLING_SOMATIC_ALL` |
| `scope-tumor-only-calling` | `tools: lofreq` | `BAM_VARIANT_CALLING_TUMOR_ONLY_ALL` |
| `scope-other-germline-callers` | `tools: haplotypecaller`, `deepvariant`, `freebayes` | `BAM_VARIANT_CALLING_HAPLOTYPECALLER`, `BAM_JOINT_CALLING_GERMLINE_GATK` |
| `scope-germline-structural-and-copy-number` | `tools: manta`, `cnvkit` | `BAM_VARIANT_CALLING_GERMLINE_MANTA`, `BAM_VARIANT_CALLING_CNVKIT` |
| `scope-alternative-aligners` | `aligner: bwa-mem2`, `dragmap`, `sentieon-bwamem`, `parabricks` | `BWAMEM2_MEM`, `DRAGMAP_ALIGN`, `FASTQ_PREPROCESS_PARABRICKS` |
| `scope-later-start-steps` | `step: markduplicates` … `annotate` | restart arms of `SAMPLESHEET_TO_CHANNEL`, `FASTQ_PREPROCESS_GATK` |
| `scope-annotation` | `tools: snpeff`, `vep`, `snpsift` | `VCF_ANNOTATE_ALL` |
| `scope-vcf-postprocessing` | `concatenate_vcfs`, `normalize_vcfs`, `snv_consensus_calling`, `tools: varlociraptor` | `POST_VARIANTCALLING` |
| `scope-optional-preprocessing` | `tools: bbsplit`, `sentieon_dedup`, `ngscheckmate` | `FASTQ_CREATE_UMI_CONSENSUS_FGBIO`, `BAM_MARKDUPLICATES_SPARK` |

The interface brief states the scope and its candidate `id` and lists the nine drop `id`s. `step` and `aligner` aren't workflow inputs, because the scope fixes them. The data-flow Mold designs no node, `when:` arm or fan-in for a dropped branch, carries every drop through still `open`, and may name an excluded branch, such as somatic Mutect2, as a companion workflow in one sentence.

***This PR adds no interactive prompt. The direct pipeline stays autonomous: the interface Mold decides the scope without stopping to ask.*** A caller who wants to choose the branch has two routes. They can state a scope in the run request, which the interface Mold honors. There is no dedicated scope input or parameter. Or they can use the `nextflow-to-workflow-brief` pipeline, whose `nextflow-summary-to-workflow-brief` Mold already takes the caller's selected scope and turns an ambiguous one into a brief blocker. A real interview belongs to #500.

***This PR doesn't build excluded branches either. A scope drop records that a branch was left out and why. Nothing designs it, and it stays `open` in the final ledger.***

***This is not #784's parity report.*** It writes the records at design time. #784 will render them, next to its diff of the final workflow against the source, at the end of the run.

## How #798's proposals map onto this

- **Detect multi-path pipelines (proposal 1).** `summary-nextflow.json` already carries the evidence: `params[].enum` and defaults, `profiles[]`, `workflow.conditionals[]`, `test_candidates[]` with their `params_delta`, and `test_selection.status: needs-scope-choice` when primary candidates tie. ***This PR adds no field to `summary-nextflow.json`.*** The list of available paths lives in the ledger's scope drops, each citing the summary values behind it.
- **Choose the path (proposal 2).** The interface Mold decides autonomously and honors a scope stated in the run request. Interactive choice goes through `nextflow-summary-to-workflow-brief` today and #500 later, as above.
- **State the scope and suggest companion workflows (proposal 3).** The interface brief names the scope, its candidate and the excluded drops. The data-flow Mold may suggest a companion workflow.

## How the scope is chosen

The interface Mold (rev 7) has a new `## Scope` section:

- Honor a scope the caller supplied.
- Otherwise follow the candidate `test_selection` selects: its `params_delta` and `effective_profiles`, with param defaults for the rest.
- On `needs-scope-choice`, pick the candidate whose `params_delta` changes the fewest branch controls from their defaults. Pick from the primary candidates, or from all candidates when none is primary. Break a tie by preferring `default.nf.test` or `main.nf.test`, then the first listed. Mark the decision `confidence: low`.
- A control the scope fixes is not a workflow input. A control left open inside the scope, such as a QC toggle, is one.

***The test follows the branch that was built.*** On `needs-scope-choice`, `nextflow-to-test-data` (rev 5) and `nextflow-test-to-galaxy-test-plan` (rev 9) now use the candidate the interface brief names. The test plan gains a `nextflow-galaxy-interface` input for that. Before this, test-data asked for a caller's choice, and the test plan only read summarize-nextflow's selection, so an autonomous run could design one branch and test another.

<details><summary>Record shape and the <code>from</code> grammar</summary>

The shape lives in a new "Source scope" section of the `open-requirements-ledger` note (rev 10), which is bundled into every Mold that carries the ledger:

```yaml
decisions:
  - id: <scope id>
    decided_by: nextflow-summary-to-galaxy-interface
    scope:
      candidate: "<test_candidates id>"        # optional
      controls: [{control: params.<name> | profile, value, from}]
    decision, rationale, confidence?
entries:
  - id: <drop id>
    status: open
    kind: dropped
    raised_by: nextflow-summary-to-galaxy-interface
    scope_branch:
      decision: <scope id>
      selected_by: [{control, value, from}]
    units: "backticked summary subworkflow/process names"
    because: "outside the selected scope `<scope id>`: ..."
    unmet, missing
```

- Find the scope: the one `decisions[]` item with `scope`. Find its drops: `entries[]` with `scope_branch`, joined on `scope_branch.decision`.
- One drop per branch family, not per process. Pipeline plumbing isn't a branch.
- `from` forms:
  - `params[<name>].enum`, `params[<name>].default`, or `params[<name>]` for a boolean set `true`
  - `profiles[<name>]`
  - `test_candidates[<id>].params_delta`, or `test_candidates[<id>]` with no field, for a param with no `enum` whose value the candidate `id` names
  - `workflow.conditionals[<a name in affects>]`
- A free-text control with no citable value, such as sarek's `umi_read_structure`, goes in `because`.

***Scope drops carry no top-level `step` and no `source_arg`.*** #818's `check-step-removals` matches only on top-level `step`, so scope drops never label or trip a removed step. #809's per-flag records carry `source_arg`, so the two stay apart.

</details>

## Known limits

The summarizer doesn't yet hold everything a scope record wants to cite. The fixture works around these gaps without hiding them. Follow-ups are drafted (not filed) as A–F in the [domain review](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-798-nextflow-scope-decisions/domain_review/):

- **A.** Every sarek `::dynamically-generated` candidate inherits the `test` profile's `params_delta`. `tests/variant_calling_mutect2.nf.test` sets `tools: 'mutect2'` in every scenario, yet its candidate shows `tools: strelka`, from `conf/test.config:47`.
- **B.** sarek's `tools` param has no `enum`. Its values live in the schema's `pattern`, which the summary drops.

  Because of A and B, sarek's `tools` alternatives are cited by a candidate whose `id` names the value (`test_candidates[tests/variant_calling_mutect2.nf.test::dynamically-generated]`), with no field. That citation rests on the candidate's name, not on a summary value. It's a stopgap that A and B retire.
- **C.** `workflow.conditionals[]` reads only the primary workflow body (`resolver.ts:448`), so sarek's `step` and `tools` guards inside `subworkflows/local/fastq_preprocess_gatk` aren't captured. Drops for those branches cite `params[step].enum` and candidates instead of guards.
- **D.** rnaseq 3.24.0's `options "-stub"` nf-test cases come out `execution_mode: real`, `scope: primary`. That is why rnaseq returns `needs-scope-choice` at all. Fixing D flips the rnaseq scenario below, which then needs another fixture.
- **E.** Several existing nextflow-to-galaxy scenario cases in the touched files still describe abstract inputs instead of pinned fixtures. They predate this branch.
- **F.** The interface eval property "scope records cite the summary and stay apart from step and flag records" is `check: deterministic`, but its only checker is in `tests/scope-decisions.test.ts` and runs on the committed fixture, not on a run's ledger. Lifting it into `gxwf-foundry` as `foundry check-scope-records` is drafted. Whether that happens here or in #784 is still open.

***A step cap is not a scope drop.*** In the pipeline's "sarek capped at 5 steps" scenario, the cap goes in the scope decision's `decision`, and the in-scope steps past it get a plain `kind: dropped` entry without `scope_branch`. A reader (#784) must not treat every drop in a scoped run as a scope drop.

## Evidence

- `tests/scope-decisions.test.ts` has two tests:
  - The shape test always runs. It checks one scope decision, the six drop families the sarek scenario names, `open` status, at least one backticked unit name per drop, no drop re-selecting a control the scope fixes, `because` naming the scope, and no `step` or `source_arg`.
  - The citation test builds a live summary of sarek 3.8.1 and checks that every `from` resolves to a summary value backing its control value, and every unit name is a subworkflow or process in the summary.
- Both pass at `5feb4633` with sarek present locally. ***The citation test skips in CI.*** CI doesn't fetch sarek (`tier: large`) and runs root tests before materializing fixtures, the same as the existing `itIfSarekFixture` test in `summarize-nextflow`.
- The assertions were checked by mutation during review, before later fixture and test edits. A fake unit name, an aligner value outside `params[aligner].enum`, `tools: strelka` in the somatic drop's `selected_by`, a renamed `scope-annotation`, and a `profile` control citing a conditional each failed the test. The original fixture's unitless `scope-later-start-steps` drop failed the unit-name assertion before it was fixed.
- New scenarios:
  - interface: sarek scope is decided and recorded, rnaseq scope falls back without stopping, and the demo pipeline gets no scope decision
  - data-flow: sarek stays inside the germline scope
  - the pipeline's sarek case now names the scope decision and the open drops in the final ledger
- The scenario fixtures were re-checked against live summaries on 2026-11-12. sarek returns `selected` on `tests/default.nf.test::dynamically-generated`. rnaseq returns `needs-scope-choice`, and its `aligner` default is `star_salmon` with four enum values.

***The Mold behaviour is checked only by LLM-judged eval properties and scenarios. No end-to-end pipeline run has exercised it yet.***

`make -k check` at this head is red only on `validate-roadmap`, which reads live roadmap state from GitHub (rate-limited here), and `check-vendored`, which fails only on the dev machine. 503 tests passed. `npm run typecheck` and `npm run packages-typecheck` are clean.

<details><summary>Files</summary>

- `open-requirements-ledger` rev 10: new "Source scope" section.
- `nextflow-summary-to-galaxy-interface` rev 7: `## Scope` section, on-demand `nextflow-test-case-selection` reference, eval properties, sarek and rnaseq scenarios, new example `examples/sarek-germline-scope/`.
- `nextflow-summary-to-galaxy-data-flow` rev 9: work inside the scope, companion-workflow sentence, conditional-subworkflow reference limited to in-scope branches, eval property and sarek scenario.
- `nextflow-to-test-data` rev 5 and `nextflow-test-to-galaxy-test-plan` rev 9 (new `nextflow-galaxy-interface` input): follow the brief's scope candidate on `needs-scope-choice`.
- `nextflow-test-case-selection` rev 3: points at the interface Mold.
- `content/pipelines/nextflow-to-galaxy/scenarios.md`: the sarek capped case.
- `tests/scope-decisions.test.ts`.
- Generated: casts, pipeline assemblies, Dashboard.

</details>

## Risks

The part that is hard to change later is the scope record shape and its `from` grammar, which #784 builds on and which is cast verbatim into 24 skills. The rest is Mold prose and cheap to revise.

<details><summary>Risk Details</summary>

- #784 will read `decisions[].scope` and `entries[].scope_branch`, joined on `scope_branch.decision`. Changing the shape after #784 lands means changing both.
- The candidate-`id` citation form is a stopgap. Retiring it after A and B means updating the ledger note, the sarek fixture and the test together.
- The ledger note's new section adds about 45 lines to each of the 24 casts that bundle it.
- The fallback ranking is a deterministic rule written as Mold prose. A model can misapply it. `confidence: low` keeps the choice visible, but nothing checks it.
- The deterministic interface eval property has no runtime checker until F lands, so trials can't verify it on real run output.

</details>

<details><summary>Risk Review Advice</summary>

Read the ledger note's "Source scope" section next to the sarek fixture and the table above. Check that one decision plus one open drop per branch family is the inventory you want #784 to render, and that "no top-level `step`, no `source_arg`" keeps scope drops out of #818's gate and #809's flag records the way you expect.

Then read the interface Mold's `## Scope` section. Check that the fallback (fewest branch-control changes, then `default.nf.test`/`main.nf.test`, then first listed) is a rule you want in prose rather than in summarize-nextflow, and that leaving interactive choice to the brief pipeline and #500 fits.

</details>

## Context

Depends on 🔀 #818, which adds the removed-step gate that ignores these scope drops, and on 🔀 #809, whose per-flag `source_arg` records stay separate from them. Part of the source-parity stack: 🎯 #784 (the Nextflow parity report) renders these scope records at the end of the run. A real interview for choosing the scope would come with 🎯 #500 (interviews).

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The shape copies #809's nested-record pattern. Rules repeated in two or three places now live in one place each.</summary>

The scope shape adds no collection and no `kind` value. Like `source_arg`, a nested key marks the record's role, so readers filter by key presence. The main problem was rule sprawl: "design nothing for an excluded branch", "what a branch control is" and "fixed controls aren't inputs" each appeared in two or three files, including the ledger note that is cast into every ledger-carrying skill. The ledger note now owns the shape, the grammar and "design nothing for a drop". The interface Mold owns the selection policy. The test's casts became type-guard filters. Left alone: the `from` resolver stays in the test until a second reader needs it.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-798-nextflow-scope-decisions/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three findings held. Two are fixed: the test Molds now follow the scope candidate, and the fallback works with no primary candidate.</summary>

- The interface's scope choice didn't reach test-data or the test plan, so an autonomous rnaseq run could test a different branch than it built. Fixed through the interface brief, which both Molds now read.
- The fallback assumed a primary candidate, but summarize-nextflow can return `needs-scope-choice` with none. It now picks from all candidates in that case.
- sarek's candidate-`id` citations don't match the candidates' `params_delta`. That's summarizer bug A, left as a documented stopgap above.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-798-nextflow-scope-decisions/codex_review/). Run via gpt-6-sol at medium effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
