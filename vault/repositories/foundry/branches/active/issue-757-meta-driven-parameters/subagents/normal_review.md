Run via Claude Opus 5.5 at high effort.

Acted on in `15360ffd`: P2 1 (fallback 1 now spells out per-element booleans and the mapped built-in `pick_value` rejoin, citing the API test), P3 4 (precise test paths), nits (pairing wording, "rows above", README run line, neighbour, `verification/README.md` prose-citation line).

Not acted on:
- P3 1 link to `[[galaxy-collection-semantics]]`: already in `related_notes`; the pairing paragraph stays self-contained for casts.
- P3 2 `list:paired` reads over a paired input with a `list` of values: not verified; left out rather than claimed.
- P3 3 `[[nfcore-meta-map-to-galaxy-params]]` link: the `select` case is now named via featureCounts' `strand_specificity`; adding the link is optional.

<details><summary>Full review</summary>

# Review: `issue-757-meta-driven-parameters` (galaxyproject/foundry#757)

Reviewed `git diff origin/main...HEAD` at `a9f7a45b` (one commit on `e72d75cb`).

## Verdict

Mergeable after one small fix. The section is correct about Galaxy, every "Done when" item is met, and the fixture is a good one: case 2 pins the pairing rule with an assertion, not just prose. The one real gap is fallback 1. The headline example, rnaseq strandedness driving salmon `--libType`, sits on the Open row, so fallback 1 is the route an agent will actually take for it, and that route is the least specified part of the section. The rest are small reuse and citation fixes.

## Checked and correct

- **Positional pairing.** `walk_collections` in `lib/galaxy/model/dataset_collections/structure.py` (`release_26.1`) indexes every collection with `collection[index]` and never compares identifiers. Fixture case 2 shows the same thing at runtime.
- **Per-element `when` row.** `test_run_workflow_conditional_step_map_over_expression_tool` (`lib/galaxy_test/api/test_workflows.py`, `release_26.1`) asserts exactly one skipped job out of two.
- **Text row.** `map_over_expression.gxwf.yml` maps `param_value_from_file/text_param` into `validation_default`'s text `input1`, and the per-element outputs `A` and `B` are asserted in `map_over_expression.gxwf-tests.yml`.
- **IWC row.** `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun` steps 18 to 20 are labelled "split min value", "convert min nb of reads to parameter" and "select random reads". The connection is `mode|subsample_config|subsampling_mode|target`, so it is inside a conditional's case. The values are identical across elements: step 17 (`tp_text_file_with_recurring_lines`) repeats one min value N times.
- **#661 / #667.** #661 reports a 500 on a connected conditional test param, and #667 reports the same edge running green on usegalaxy.org. "Conflicting reports" is a fair summary.
- **rnaseq claim.** It is true at the pinned fixture (`nf-core/rnaseq` 3.24.0, `47b3b0d3`). `subworkflows/nf-core/fastq_qc_trim_filter_setstrandedness/main.nf:408` returns `meta + [strandedness: strandedness, ...]`. The note doesn't cite it, though (P3 3).
- **Casts.** The note body is byte-identical in all three casts. The `_provenance.json` hash and commit bumps match the casting convention, and `npm run validate` gives 0 errors.
- **Fixture.** It matches the galaxy-brain original at `f4e9c0bf`, with `name:` fixed to `label:` and case 2 added. The step layout, `tool_version` pins, `filetype: txt` and `param_value_from_file` state match `derive-parameter-from-file/derive-integer-from-file.gxwf.yml`. Each case asserts both line count and last line on both elements, so a step parameterized once for the whole collection fails it.
- **Workflow lint.** `planemo workflow_lint --skip best_practices per-element-parameter.gxwf.yml` on Planemo 0.75.48, the same command the verification CI runs, passes: tests are structurally correct and tool ids and versions are valid.
- **Scope.** The `branch { ... }` row is untouched, as #757 asked.

## Findings

### P2 1: Fallback 1 is the headline case's real route but gives no per-element mechanics

Salmon `--libType` is a conditional test parameter, which is the Open row. The section's motivating example (`meta.strandedness`) therefore lands on fallback 1: "gate one branch per value with a per-element `when` … Rejoin the branches per [[conditional-route-between-alternative-outputs]]."

That pattern page only covers workflow-level routing. Its one-of-N recipe runs `map_param_value` on a workflow enum, and its fixture gates scalar `cat1` steps on workflow booleans. It never says how to get **one boolean per element per value**, and it never says the merge is mapped. An agent following the link has to invent both halves. #661 shows what that costs: the run concatenated gated branches with `__MERGE_COLLECTION__` and got 3N elements for N samples.

The evidence is in Galaxy, not the corpus. `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` (`release_26.1`) gates two mapped `cat1` steps on mapped booleans and rejoins them with a mapped `pick_value`, two elements in and two out.

**Suggested fix (two sentences in fallback 1).** The full fan-in recipe is #661's job (its `conditional-branch-fan-in` recipe for `galaxy-collection-patterns.md`), so keep these mechanics short rather than restating pattern content here:
- Per value, produce the per-element boolean with the chain the note's own Verified "Per-element `when`" row covers: a mapped step writes one boolean file per element, then mapped `param_value_from_file` (`param_type: boolean`) feeds `when`. If the note mentions mapping `map_param_value` over the `text_param` collection as a shortcut, mark it unverified.
- Rejoin with `pick_value` mapped over the branch outputs, never `__MERGE_COLLECTION__`, because a skipped mapped element is null, not absent. Cite the API test above and link #661 for the full recipe. The API test uses Galaxy's in-tree `pick_value`, not the `iuc/pick_value/0.2.0` that the pattern page prescribes, so say it doesn't count as evidence for the Tool Shed tool.

### P3 1: The pairing rule restates [[galaxy-collection-semantics]] without linking it

The note already lists [[galaxy-collection-semantics]] in `related_notes` and its Evidence section, and that note is cast into `implement-galaxy-tool-step`. Its `BASIC_MAPPING_TWO_INPUTS_WITH_IDENTICAL_STRUCTURE` entry is the existing statement of linked two-input map-over. It describes the precondition as "identical structure (same element identifiers in the same order)", which reads as though Galaxy checks identifiers.

This section's real contribution is that Galaxy checks only structure and length, and the identifier half is left to the author. Fixture case 2 proves it. The section should link the semantics entry and say this outright, so the two notes don't read as contradicting each other. That note is vendored from upstream, so the clarification belongs here, not there.

Optional: the IWC wiring is corpus evidence for the same point. Step 19's collection comes from `split_file_to_collection`, whose identifiers are split-file names, and it pairs with the sample BAM collection `n rmDup BAM`.

### P3 2: "Same structure … as the data collection" may be stricter than Galaxy (unverified)

The common nf-core input is `list:paired` reads consumed by a tool's `paired` collection input, salmon included. That step maps over `list`, so the matching value collection is a `list`, not a `list:paired`. Read literally, "same structure as the data collection" says a `list` of values can't drive that step. Consider "the same structure and order as the step's map-over", plus a one-line `list:paired`/`list` example.

Partly grounded. [[galaxy-collection-semantics]]'s `MAPPING_LIST_PAIRED_OVER_PAIRED` shows a `list:paired` mapped over a `paired` input yielding a `list` map-over. No example links that subcollection map-over to a second `list` input, though, and I have not run it, so keep it as a caveat or verify it.

### P3 3: The tool-side meta-map note is not linked, and the rnaseq claim is uncited

[[nfcore-meta-map-to-galaxy-params]] is the wrapper-side half of the same problem. It tells `convert-nfcore-module-to-galaxy-tool` to turn `meta.strandedness` into a `<param type="select">`. So wrappers that Foundry itself generates for this exact case land on the `select` row, which this section marks "Not tested". The two notes should link each other through `related_notes`, and the `select` row should say why it matters.

Separately, the Evidence section's pinned-fixture list should cite `workflow-fixtures/pipelines/nf-core__rnaseq/subworkflows/nf-core/fastq_qc_trim_filter_setstrandedness/main.nf` for the `strandedness: auto` claim, alongside the rnaseq entry already there.

### P3 4: Two Galaxy-test citations are less checkable than they look

- The text row cites `map_over_expression.gxwf.yml`, but the per-element assertion is in `map_over_expression.gxwf-tests.yml`. That workflow also maps the text param over one collection with no second data collection. It verifies per-element text values, not pairing, and the row could say so in a few words.
- Neither Galaxy row names a ref. Add `release_26.1`, which the fixture README already uses.

## Nits

- "A same-length collection in another order … gives each element a different element's value." That holds for a two-element swap only. With more elements, some may keep their own value. Try "silently pairs elements with other elements' values".
- "The rows above change the data." This sits right after the Explicit Galaxy Operations table, and the shape table above that maps shapes rather than changing data. "The collection operations above reshape data. This route…" reads more clearly.
- The fixture README says "Passed on Planemo 0.75.48 against Galaxy `release_26.1`." Siblings date the run and say how many cases passed, e.g. "On 2026-11-10, Planemo 0.75.48 ran both cases against Galaxy `release_26.1` and both passed."
- "neighbour" in the case 2 `doc` should be "neighbor". The repo uses US spelling: 202 "behavior" against 1 "behaviour".
- `verification/README.md` says fixtures verify pattern claims through `verification_paths`. This looks like the first fixture backing only a research note, cited from prose that no validator checks. One sentence there would keep the README accurate.

## Not findings

- Not making this a pattern page matches #757's rationale: IWC shows only wiring, with identical values.
- `evidence tier` in "Done when" is met by the table's Status column.

</details>
