Fix 🎯 #731 - `implement-galaxy-workflow-test` claims its static cross-check catches collection/datatype mismatches, and nothing traces an output's collection kind.

The Mold, its `eval.md` and `scenarios.md` all said `checkTestsAgainstWorkflow` (`gxwf validate-tests --workflow`) reports "no collection/datatype mismatches". It doesn't. It checks that labels exist, that required inputs are supplied, and that job values have the right JSON type. Nothing else. On the ncbi/egapx `nextflow-to-galaxy` run, with `@galaxy-tool-util/cli` 1.14.0:

| Test content | Workflow fact | `validate-tests --workflow` |
| --- | --- | --- |
| `star_bam: {ftype: bam}` (dataset form, copied from the plan's `output_kind: dataset`) | `star_bam` ← `rnaseq_short` maps `star_wnode` over `short_reads` (`list:paired_or_unpaired`), so the output is a `list` | `valid: true` |
| `complete_genomic_fna: {ftype: bam}` (the run's `fasta`, mutated as a probe) | the producing output is fasta | `valid: true` |

The kind is already available deterministically: `gxwf validate --connections --json` resolves `rnaseq_short`'s `star_bam` to `collection_type: list`. The Mold just never asked. **Step 3 is a recipe the agent follows over that existing report; this PR adds no code or new gate.**

- **New step 3, trace output kinds.** Before writing assertions, resolve each asserted output's kind from the `--connections` report's `resolved_outputs`, not from the plan. Non-null means collection form. Null only means dataset when the page's conditions hold. Otherwise the output is hand-checked and named as such in the handoff.
- **Plan/workflow disagreement is reported, not absorbed.** The assertion follows the workflow, because Planemo checks what the workflow produces, and the handoff names the plan field as a test-plan defect.
- **Step 5 and `eval.md` now claim only what the cross-check does.** A new deterministic property covers output/input kind. It is deterministic for the evaluator, who checks it mechanically against the report and input declarations; the authoring agent applies it by hand. Datatype agreement (`ftype`/`filetype`, with a step's `change_datatype` taking precedence over the tool's `format`) and handoff reporting are `llm-judged` until jmchilton/galaxy-tool-util-ts#210 lands.
- **`content/cli/gxwf/validate.md`** says how to read `--connections` output kinds, so other Molds can reuse it. **`validate-tests.md`** gains a gotcha naming what the cross-check doesn't cover.

<details><summary>Why "null" needs conditions (checked on the egapx run)</summary>

- `select_convert_inputs` (`__APPLY_RULES__`) reports `output: null` with only `ok` connections. `report-builder.js` `_sentinelToCollectionType` maps an unresolved collection type to null. Its consumer, `convert_annotations`, then gets a `skip` connection ("Cannot determine output type"), and its six outputs (the `complete_*` FASTA/GFF set) all report null. Without the conditions, those would be wrongly asserted as datasets.
- A `skip` contributes no map-over rank (`connection-validator.js`), so even a non-null type behind one can be short a rank. Any value at or behind a skip counts as unknown.
- Subworkflow steps report resolved outputs, but their inner steps aren't in `step_results`. A skip inside a subworkflow is therefore invisible: a null is unknown, and a non-null (like `star_bam`'s `list`) still means a collection, but its depth needs a hand trace.
- The recipe also covers outputs that are workflow inputs (`outputSource` with no `/`) and native `.ga` (`workflow_outputs[].label`).

</details>

<details><summary>Red/green (content-only, so no committed test)</summary>

A scratch script followed the step-3 recipe over the egapx run's tests file:

- Red: it flagged only `star_bam` (`resolved=list asserted=dataset`). The 6 `complete_*` outputs came out UNKNOWN (behind `convert_annotations`' skip), and the other 8 outputs matched.
- Green: rewriting `star_bam` as `class: Collection` / `collection_type: list` / `element_count: 1` passes both the recipe and `validate-tests --workflow`. So the static cross-check can't tell the two forms apart.

</details>

**Not in scope:** teaching `checkTestsAgainstWorkflow` shape and datatype (jmchilton/galaxy-tool-util-ts#210). Once it ships, step 5 can fold step 3's check into one gate. The test-plan Molds that wrote `output_kind: dataset` in the first place are also untouched; this branch catches the mistake one Mold downstream.

## Risks

Risks are minimal. This changes Mold guidance, eval properties and CLI notes only (a two-way door).

## Context

Raised by the ncbi/egapx `/test-pipeline nextflow-to-galaxy` run. Related, not duplicates: #656 (runtime output-kind mismatch in the debug Mold) and #679 (test-plan `family` has no home for output-attribute checks).

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Two P2 findings, both confirmed and fixed: a skip can drop a map-over rank, and <code>change_datatype</code> overrides the tool format.</summary>

- A skipped connection contributes no map-over rank, so a non-null type behind it can be incomplete. `validate.md` and the deterministic eval property now treat any value at or behind a skip as unknown.
- `ftype` checks now prefer the step's `change_datatype` over the tool output's `format`.

</details>
