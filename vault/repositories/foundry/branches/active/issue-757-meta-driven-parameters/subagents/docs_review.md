Run via Claude Opus 5.5 at high effort.

Acted on in `15360ffd`: P2 1 (table rewrite, picked the lenient trigger per domain review's Corpus-First point), P2 2 (`param_type` by target, rnaseq's `select` and test-parameter targets named), P2 3 (mapped-rejoin trap inline), P2 4 (Open row says what conflicts), P3 1–4, nits (`val(meta)` row, diagram label, README run line and separate-input sentence).

Not acted on:
- "Deriving per-value booleans from `map_param_value` is not tested" sentence: replaced with a generic mapped comparison step.
- README title rename: siblings are mixed; kept.

<details><summary>Full review</summary>

# Docs review: issue-757-meta-driven-parameters (a9f7a45b)

Skill: `.agents/skills/foundry-documentation/SKILL.md`. Scope: the "Per-element parameters from `meta`" section and the `val(meta)` row in `content/research/nextflow-to-galaxy-channel-shape-mapping/index.md`, plus `verification/workflows/per-element-parameter-from-file/README.md`.

## Verdict

Mergeable after P2 fixes. No P1s. The prose rules pass, every name and path checks out, and the README matches its siblings. The weak spot is the decision point. An agent can follow the happy path, but it can't reliably tell which table rows count as "verified" for the fallback. Two other gaps: the motivating rnaseq example lands on unverified rows without the note saying so, and fallback 1 leaves out the one fact (#661's `__MERGE_COLLECTION__` trap) that matters when the branches are mapped. Three of the four wiki links in the section point at pattern pages that none of the three casts bundle (only `open-requirements-ledger` ships), so the essentials need to be stated inline.

## Checks that passed

- No semicolons in added prose. No banned words. "gate one branch" in fallback 1 means a technical `when` gate, not a human decision, so the rule allows it.
- All wiki targets exist: `content/patterns/derive-parameter-from-file.md`, `content/patterns/harmonize-by-sortlist-from-identifiers.md`, `content/patterns/conditional-route-between-alternative-outputs.md`, `content/research/open-requirements-ledger/index.md`.
- Galaxy `origin/dev` (95e45ac9d0d): `lib/galaxy_test/workflow/map_over_expression.gxwf.yml` exists and feeds `text_param` into `validation_default`'s `type="text"` input1. `test_run_workflow_conditional_step_map_over_expression_tool` is at `lib/galaxy_test/api/test_workflows.py:4913`.
- IWC `origin/main` (ed48e2f588), `consensus-peaks-atac-cutandrun.ga`: the "split min value" → "convert min nb of reads to parameter" → "select random reads" wiring holds, via the connection `mode|subsample_config|subsampling_mode|target`.
- nf-core/rnaseq fixture: `subworkflows/nf-core/fastq_qc_trim_filter_setstrandedness/main.nf:408` returns `meta + [strandedness: ...]`. Modules such as `subread/featurecounts/main.nf:27` branch on `meta.strandedness`.
- `param_value_from_file`'s `param_type` options are text, integer, float and boolean (`tools/expression_tools/parse_values_from_file.xml`).
- Planemo 0.75.48 in the README matches `implementation_debrief.md`. Issue #757 says 0.75.47 because it describes the earlier #674 run.
- The text diagram's `┐` and `▼` both sit at column 81, over "downstream tool".

## Findings

### P2 1: the reader can't tell which rows trigger the fallback

"When the target parameter's row isn't verified" is unclear in three ways:

- The Status column mixes a status with an explanation ("Wiring only, values identical across elements"), so the reader can't tell whether a parameter inside a conditional's case takes the route or the fallback.
- Float and boolean tool parameters have no row. An agent with a float target either falls back for no reason or guesses.
- The trigger names a status ("verified") but not the set of statuses that lead to the fallback.

Rewrite the table so Status is a short value and the qualification moves to Evidence. Folds in P3 3.

```markdown
| Target | Evidence | Status |
|---|---|---|
| Integer tool parameter | `verification/workflows/per-element-parameter-from-file/`: values 1 and 3 on two elements, and positional pairing in its second case | Verified |
| Text tool parameter | Galaxy's `lib/galaxy_test/workflow/map_over_expression.gxwf.yml`: per-element values `A` and `B` reach a text input | Verified |
| Per-element `when` (boolean) | Galaxy's `lib/galaxy_test/api/test_workflows.py::test_run_workflow_conditional_step_map_over_expression_tool`: one of two elements is skipped | Verified |
| Parameter inside a tool conditional's case | IWC `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun`: mapped "convert min nb of reads to parameter" feeds `samtools_view`'s `mode\|subsample_config\|subsampling_mode\|target`. Its values are identical across elements | Wiring only |
| Float or boolean tool parameter | None | Not tested |
| `select` parameter | Galaxy's `lib/galaxy_test/api/test_workflows.py::test_value_restriction_with_select_and_text_param` connects a workflow text input to a `select`, unmapped, and checks only the run form | Not tested |
| A tool conditional's test parameter | See P2 4 | Open |
```

(Checked: `test_value_restriction_with_select_and_text_param` at `test_workflows.py:11031` uses a workflow `type: text` input, not an expression-tool output, and never runs a job. That makes it unmapped wiring evidence only.)

Then state the trigger outright. Pick one option (decision for John):

- Strict: "Use the route when the target's row is Verified. For any other row, fall back in this order:"
- Lenient: "Use the route when the target's row is Verified or Wiring only. Wiring only means Galaxy accepts the connection, and the per-element value is not yet shown to differ by element. For Not tested and Open rows, fall back in this order:"

### P2 2: the motivating example hits unverified rows, and `param_type` has no answer for `select`

The section opens on rnaseq's `meta.strandedness`, but its consumers land on unverified rows. featureCounts' `strand_specificity` is a `select` (`tools-iuc/tools/featurecounts/featurecounts.xml:138`), which is Not tested. Salmon's `--libType` is a conditional's test parameter, which is Open. The page never says this, so an agent may read the example as covered. "set `param_type` to match the target parameter" also has no answer for a `select`, because `param_type` offers only text, integer, float and boolean. The rewrite leaves `select` to the table, which sends it to the fallback.

Rewrite paragraph 2:

```markdown
Carry the value as a one-value dataset per element, in a collection with the same structure and order as the data collection. Map `param_value_from_file` over it and choose `param_type` by the target: `integer` or `float` for a number, `boolean` for a boolean, and `text` for text. Connect the matching output (`integer_param`, `float_param`, `boolean_param` or `text_param`) to the target parameter of the step that maps over the data collection:
```

Add after the table:

```markdown
rnaseq's strandedness reaches rows that aren't verified. featureCounts' `strand_specificity` is a `select`, and Salmon's `--libType` is a conditional's test parameter, so both take the fallback below until those rows are verified.
```

### P2 3: fallback 1 leaves out the mapped-rejoin trap, and its link isn't bundled

In this section the branches are mapped over a collection. [[conditional-route-between-alternative-outputs]] covers unmapped routes only, and none of the three casts bundles it. #661 is exactly this case: a gated, mapped step still emits a full-size collection with null skipped elements, so `__MERGE_COLLECTION__` produces one element per branch per sample. Fallback 1 also doesn't say how to get a per-value boolean from one per-element value. That derivation is unverified, so the note should say so.

Rewrite:

```markdown
1. For a small fixed set of values, run one branch per value. Turn each value into a per-element boolean, gate that value's branch with `when`, and give the branch's step that value as a fixed parameter. Rejoin the branches with `pick_value` mapped over the branch outputs, not `__MERGE_COLLECTION__`. A gated mapped step still emits a full-size collection with its skipped elements as null, so merging returns one element per branch per sample ([#661](https://github.com/galaxyproject/foundry/issues/661)). Galaxy's `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` verifies the mapped rejoin with Galaxy's built-in `pick_value` (`tool_id: pick_value`, `pick_style: first_or_error`). The toolshed `iuc/pick_value` that the corpus uses has not been run mapped. [[conditional-route-between-alternative-outputs]] covers `pick_value`'s settings. Deriving per-value booleans from a text value with a mapped `map_param_value` is not tested.
```

(Checked: in that API test the per-element booleans come straight from mapped `param_value_from_file` with `param_type: boolean`, not from `map_param_value`.)

### P2 4: the "Open" row doesn't say what conflicts, and "edge" is undefined

"Conflicting reports in #661 and #667" makes the reader open two issues to learn what disagrees. "needs this edge" uses graph jargon the page never defines. The issue body had the facts, and they got dropped. Rewrite the Evidence cell:

```markdown
| A tool conditional's test parameter | [#661](https://github.com/galaxyproject/foundry/issues/661) reports a Galaxy 500 when one is connected. [#667](https://github.com/galaxyproject/foundry/issues/667) reports a workflow connecting one that runs on usegalaxy.org. Salmon's `--libType` (`quant_type\|libtype\|strandedness`) is such a parameter | Open |
```

### P3 1: "each job gets its own element's value" contradicts the next paragraph

Paragraph 3 says each job gets its own element's value. Paragraph 4 says a reordered collection gives each element a different element's value. The first claim holds only when the order matches. The harmonize step is also named by link alone, and that link isn't bundled. Merge the two paragraphs, state the mechanism inline, and add how the reader recognizes failure:

```markdown
Galaxy runs one job per element and pairs the two collections by position, not by element identifier. A same-length value collection in another order runs without error and gives each element a different element's value, which the fixture's second case shows. Produce the values with a step mapped over the data collection so they inherit its order. When they arrive as a separate collection, reorder them first: run `collection_element_identifiers` on the data collection, then `__SORTLIST__` with `sort_type: file` on the value collection, with the identifier file connected to `sort_type|sort_file` ([[harmonize-by-sortlist-from-identifiers]]). The sort fails the job when the identifiers don't match, and it never drops elements. [[derive-parameter-from-file]] covers the `param_value_from_file` step itself.
```

(The failure behavior comes from `verification/workflows/harmonize-by-sortlist-from-identifiers/README.md`, which read it from `SortTool` source rather than exercising it.)

### P3 2: fallback 2 leaves out the fields a `dropped` entry requires

The ledger requires `units` and a `because` that carries its citation (`open-requirements-ledger/index.md`, "A `dropped` entry carries two more fields"). Say what goes in each:

```markdown
2. Otherwise, expose one workflow-level parameter for all elements. Append a `kind: dropped` entry to the [[open-requirements-ledger]], with `units` naming the per-element parameter and `because` citing the target's row above, plus #661 or #667 for a conditional's test parameter. Expose the computing step's output as a workflow output so a user can run once, read the computed values, and re-run with the value they choose.
```

### P3 3: evidence cells overstate or under-cite

- Text row: `map_over_expression` maps over the value collection alone, with no separate data collection, so it shows per-element text values but not pairing. Restore the issue's "per-element values `A` and `B`" (rewritten in P2 1).
- The API-test row gives only a test name, while the other rows give paths. Add `lib/galaxy_test/api/test_workflows.py::` (rewritten in P2 1).
- The pairing claim has no cited evidence. Point it at the fixture's second case (done in P2 1's integer row and P3 1).

### P3 4: the opening paragraph doesn't give a source cue, and "the rows above" is ambiguous

Two tables precede the section, so "The rows above change the data" is unclear. An agent reading Nextflow also needs to know what the idiom looks like in the source. Rewrite:

```markdown
nf-core pipelines often compute a value per sample, write it into `meta`, and read it as a tool argument in that sample's later processes. In nf-core/rnaseq's `strandedness: auto` path, `subworkflows/nf-core/fastq_qc_trim_filter_setstrandedness/main.nf` returns `meta + [strandedness: ...]`, and modules such as featureCounts branch on `meta.strandedness` in their `script:` block. The collection operations above reshape data. This route keeps the data as it is and varies a tool parameter per element.
```

### Nits

- `val(meta)` row: "read back as a parameter" → "read by a later process as a tool argument".
- Diagram: label the consumer `downstream tool (mapped, target parameter)` so "parameter" doesn't read as a port name.
- README last line: sibling READMEs give a date ("On 2026-10-21, Planemo 0.75.44 ran both tests against Galaxy `release_26.1` and both passed."). Suggest `On 2026-11-10, Planemo 0.75.48 ran both cases against Galaxy \`release_26.1\` and both passed.` The date is the commit date. The debrief doesn't state a run date, so confirm it.
- README, optional: add `Both cases pass the values as a separate input rather than computing them from \`reads\`, so the second case reproduces the misordering the note warns about.` This ties the fixture's shape to the hazard the note describes.
- README title, optional: `# Parameter: per-element value from file` would match the `Kind: subject` titles of newer siblings (`Collection: …`, `Conditional: …`) and the `Parameter: derive from file` pattern title. The siblings are mixed, so this is optional.

## Cast reachability (context, not a finding against this branch)

The note is cast into `implement-galaxy-tool-step`, `nextflow-summary-to-galaxy-data-flow` and `nextflow-summary-to-galaxy-interface`. Each bundle includes `references/notes/open-requirements-ledger.md`. None includes `derive-parameter-from-file`, `harmonize-by-sortlist-from-identifiers` or `conditional-route-between-alternative-outputs`. `data-flow` ships only the pattern MOCs, which link to those pages by name. This limitation was already there before this branch, but it's the reason P2 3 and P3 1 put the mechanics inline.

</details>
