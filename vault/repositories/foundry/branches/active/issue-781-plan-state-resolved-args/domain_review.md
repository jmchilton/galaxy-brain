Run via Claude Opus 5.5 at high effort.

# Domain review — issue-781-plan-state-resolved-args

Profile: `wf_foundry/reviewers/DOMAIN_REVIEW.md`. Reviewed `df991d0d..76194bcf`. Fixes are in commit `32673995` (see `implementation_debrief.md`).

## Acted

- **P2 bug, if/else in a selector block (§5 get it right, §6.3).** On sarek `4bd2948f`, `markduplicates.config`'s `withName: 'NFCORE_SAREK:SAREK:FASTQ_PREPROCESS_GATK:CRAM_TO_BAM'` sets `ext.prefix` to `.dedup` or `.md` depending on `params.tools`. "Later declaration wins" marked `.md` effective and dropped `.dedup` without a word. Across the 10 fixture summaries, this is the only real case where that rule discards a different expression, so the rule's only real-world use gave a wrong answer. Fix: when a selector block branches (`if`, `else`, `switch`), its assignments to one key stay level, so differing ones become `tie: true`. Separate declarations of a selector keep later-wins. Test written red first. A fixture rerun against the pre-fix summaries changes exactly one row, that sarek call's `prefix` (with and without `--profile test`). Updated in the same commit: the Mold rank bullet, the eval property, the schema JSON descriptions, the schema note (rev 14), and changes (rev 21).
- **P2 synthetic case replaced with a real one (§2).** The template's "`FOO` in `SUB_A`/`SUB_B`" case is now nf-core/rnaseq `47b3b0d3` `SALMON_QUANT`. It's called by `FASTQ_SUBSAMPLE_FQ_SALMON` (`'--skipQuant'`), by `QUANTIFY_PSEUDO_ALIGNMENT`, and by its alias `QUANTIFY_BAM_SALMON`. This also covers an aliased subworkflow, and it fails in a way that matters: if the calls are merged, `--skipQuant` reaches the quantification steps.
- **P2 eval property without a case (§2).** The new summarize-nextflow property "effective arguments follow Nextflow selector priority" had no scenario. Added three real cases: rnaseq `SALMON_QUANT` rows, bamtofastq alias rows (`SAMTOOLS_PE` has no row, 0 ties), and the sarek `CRAM_TO_BAM` prefix tie.
- **P3 Mold body at research-note depth (§3, §6.4).** The summarize-nextflow rank bullet restated the CLI's algorithm, including legacy vs strict parser history and "default since 26.04". It now keeps the rule and links [[summary-nextflow]]. The parser-order note and a new control-flow note moved to **Caveats baked into the procedure**. The control-flow note says a selector inside a top-level `if` counts as always declared.
- **P3 instructions that defend themselves (§3).** Cut these clauses:
  - template: "a paraphrase is a claim…", "the summary has already ranked them…", "JSON is valid YAML…", "which is why the block is a YAML document…";
  - implement: "the summary ranked them";
  - ledger: the **Source arguments** opener and "so a dropped or tied flag never reads as…".

  The ledger note is cast `load: upfront, mode: verbatim` into about 20 skills, so every sentence costs context in each of them.
- **P3 semicolons (foundry-documentation prose rules).** Removed from every line this branch adds: template, implement, ledger, format note, refinement, changes, schema note, and schema JSON. The one left is on the template's `description` line and was already on `main`.
- **P3 broken line wraps** in the advance and template bamtofastq cases.

Casts and generated files were rebuilt.

## Not acted

- **P2 `_plan_state` as YAML inside a string (§1, question for John).** `@galaxy-tool-util/schema` types `_plan_state` as `string | null`, and the draft step is `additionalProperties: false`. So the template writes a YAML document inside the string, with JSON-object lines to keep Groovy quoting intact. The refinement and format-note sentences "needs that schema to change upstream" are the kind of sentence §1 flags. It isn't a bug, but it is a workaround for an upstream typing choice. Should the branch accept the carrier, or stay draft until upstream changes? Draft issue text below.
- **P2 rules a CLI could check are judged by an LLM (§5).** Two contracts are deterministic given summary + draft + ledger: "exactly one record per flag" and "`_plan_state.resolved_args` equals the summary entries the rows name". No ledger schema or validator exists (only `build-cli/src/lib/run-ledgers.ts`, which reads ledgers for dashboards), and #784 is a report-only Mold. Suggest a follow-up `work/ready-implement` issue for a `foundry-build` check.
- **P3 older abstract cases in touched scenario files (§2).** These cases predate the branch and name no fixture:
  - template: "any source summary plus…", "a data-flow brief with unresolved tool needs…", "a brief with Galaxy collection…", "interface/data-flow briefs plus … IWC comparison";
  - implement: "abstract step plus Galaxy tool summary…", "concrete step implementation with a plausible mismatch…";
  - advance: "a draft with two or more drafty tool steps…";
  - summarize-nextflow: "a pipeline (or synthetic tree)…", "a synthetic tree without…", "each pipeline's resolved per-process container directives", "any pipeline run with…", "a non-nf-core DSL2 pipeline…", "a pipeline with a representative nf-test-kind…".

  Not rewritten at the bottom of a four-branch stack. Proposed issue text is below.
- **P3 legacy vs strict parser order (§5 future-facing).** John decided on 2026-11-12 that a profile wins at equal rank, which is the legacy parser's order. The strict parser has been Nextflow's default since 26.04. This is not relitigated here; it's now a Caveat.
- **Synthetic cases kept.** The implement tie case (`conf/extra.config`) and the template overridden-entry case (`'-h'`) stay synthetic. The real sarek tie is prefix-only and teaches less. Real overrides are rare in the fixtures. §2 accepts synthetic cases as a start.
- **Pre-existing, outside the branch:**
  - The summary records only `ext.args`, `ext.args2` and `ext.prefix`. nf-core modules with more tools use `ext.args3` and up, and those flags never reach `_plan_state`.
  - The regression pins `casts/claude/skills/summarize-nextflow/runs/nf-core__{bacass,demo}/summary.json` have no `resolved_args` at all, so they already lagged the CLI before this branch.
- **Known limits of the if/else fix:**
  - `publishDir` set in both branches lists both in `publish_dir_matches`, which isn't ranked.
  - A selector inside a top-level `if (params…) { process { … } }` counts as always declared.
  - Control-flow detection is a token match (`if (`, `switch (`, `else`). A false positive only matters when a block also assigns one key twice, and then it errs toward a tie.

### Draft upstream issue (galaxy-tool-util-ts, and gxformat2 if it mirrors the draft schema)

> **Allow structured `_plan_state` in `GalaxyWorkflowDraft`.** `_plan_state` is typed `string | null` and draft steps reject extra keys. Foundry's Nextflow template carries each step's source tool arguments (nf-core `ext.args`) into `_plan_state` as a YAML document inside the string, with keys `calls`, `resolved_args` (one JSON object per line) and `intent`. Accepting `string | object` for `_plan_state` would let `gxwf draft-validate` check that shape and drop the in-string quoting. `draft-extract` strips it as it does today.

### Proposed follow-up issue (foundry, `work/ready-implement`)

> **Name a concrete fixture in every scenario case of the Galaxy draft Molds and summarize-nextflow.** Replace the abstract cases listed in the #781 domain review with a repo-relative path, a pinned `workflow-fixtures/fixtures.yaml` pipeline, a committed `examples/` file or an IWC workflow ID. Each case should be a fixture plus an expectation.

<details>
<summary>Full review</summary>

**Scope.** These areas were checked:

- three Galaxy draft Molds, the template, summarize-nextflow (Mold, eval, scenarios, changes), the ledger and draft-format research notes, and the schema note and JSON;
- the resolver and `selector-precedence.ts` for domain fit only (bugs were left to earlier reviews), the changeset, and the casts.

**§1 Upstream.** One finding: the `_plan_state` string carrier (above). Nothing else documents an upstream quirk. The strict-parser note is Nextflow semantics the summary chooses not to model, not an upstream bug.

**§2 Scenarios and evals.**

- Fixture claims checked against source:
  - bamtofastq `869832186b25`: `SAMTOOLS_VIEW` has six aliases, five with `ext.args`, and `SAMTOOLS_PE` has none.
  - The view flags `-F12` (4+8), `-F260` (256+4), `-F264` (256+8) and `-F256` match their filters.
  - The collate `args` closure gives `-f -r <reads_in_memory>` under `params.samtools_collate_fast`, and `args2` is `-N`.
- All pipelines cited are pinned in `workflow-fixtures/fixtures.yaml` at the SHAs given.
- Eval properties name no fixture paths or counts, and each has an imaginable failing output. The template property's "a paraphrase is a failure" is checkable.
- The scenario gaps found are the ones under Acted and Not acted.

**§3 Runtime bodies.**

- The template, implement and advance additions are instructions.
- The cut clauses were rationale.
- The template's carrier explanation is reduced to the instruction plus the failure it prevents (a mapping fails `draft-validate`).
- The advance-step re-entry for a flag with no record is an instruction.

**§4 Agent tells.**

- No draft disclaimers. Answered questions are gone.
- `changes.md` and the schema note's revision section are changelogs, so "no longer" is acceptable there.
- Refinement's "already travel this way" is a status claim in a refinement-notes file, acceptable as the current state.
- No flow-style YAML in content, apart from the JSON-object lines the carrier needs.

**§5 Design calls.**

- Inputs stay read-only: implement writes dispositions to the ledger, never to the brief.
- No new runtime dependency.
- "Get it right in this PR" drove the if/else fix.
- CLI-checkable rules: see Not acted.
- Design phases are untouched: the template copies source evidence and makes no Galaxy choices for Deferred steps.

**§6 Principles.**

- Source authority: arguments are copied verbatim, closures unevaluated.
- Reproducibility: casts, `_provenance.json` and the Dashboard were regenerated and `check-casts` / `check-generated` pass.
- Deterministic work: ranking moved into the CLI, so Molds no longer re-derive precedence. The remaining LLM-checked deterministic properties are listed under Not acted.
- Portability: no runtime-specific text.
- Actionable: the ledger **Source arguments** section is reachable from the template, implement and advance references.
- Corpus-first: the real-fixture cases replace or add to synthetic ones.

</details>
