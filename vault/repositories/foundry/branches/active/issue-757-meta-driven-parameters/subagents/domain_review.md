Run via Claude Opus 5.5 at high effort.

Acted on in `15360ffd`: P2 1 (route used for every target but the Open row, with a workflow test; float/boolean row), P2 2 (mapped `pick_value` rejoin with the API test), P3 1 (ledger `units`/`because`), P3 2 (pairing wording), P3 5 (`implement-galaxy-tool-step` trigger, Mold revision 15), nits, and untouched-line tells at the intro, evidence-list heading, IWC citation, and two table-row semicolons.

Not acted on:
- P3 3 upstream issues for the #661 500 / #667 `--connections` skip: question for John.
- P3 4 `state:` over `tool_state:` + `ConnectedValue`: all sibling fixtures use the old style; convention call for John.
- Untouched "Low-Confidence TODOs" and "Mold Use" sections: deleting/moving them widens scope; question for John. The `branch { ... }` row's semicolon stays (#758 owns that row).

<details><summary>Full review</summary>

# Domain review: `issue-757-meta-driven-parameters` (a9f7a45b)

**Verdict: approve after small fixes. No P1s.** The branch covers everything #757 asked for: a short section built on mapped `param_value_from_file`, the evidence table, the pairing rule, the fallback order, an open row linking #661/#667, a verification fixture with a README, regenerated casts and no pattern page. I checked the evidence against primary sources and every claim held up (see the end of this file).

There are two P2s, and both concern the fallback paragraph, which a runtime agent will act on. First, the fallback triggers on "isn't verified", which is stricter than the issue's "isn't available", so it cuts routes the engine supports. Second, fallback 1 points at a rejoin recipe that has only been verified for scalar routes. The remaining findings are small.

Scope reviewed: `git diff origin/main...HEAD` covers `content/research/nextflow-to-galaxy-channel-shape-mapping/index.md` and `verification/workflows/per-element-parameter-from-file/`. The three cast copies have bodies byte-identical to the source, and `_provenance.json` and `Dashboard.md` show only regenerated drift.

## Findings on new lines

### P2 1. The fallback triggers on "isn't verified", which over-drops, and the table doesn't cover every type the prose offers

Line 128: "When the target parameter's row isn't verified, fall back in this order". The issue's wording was "Fallback when the edge isn't **available**". As written, an agent targeting the following must fall back to gated branches or a uniform scalar:

- a `select` parameter ("Not tested");
- a parameter inside a tool conditional's case ("Wiring only"). That is `mode|subsample_config|subsampling_mode|target` in IWC consensus-peaks, a numeric parameter that IWC wires exactly this way.

That cuts source behavior for lack of precedent. The guiding principles (Corpus-First) say: "Missing precedent is something to record, not a reason to cut." The only edge with a reported failure is the conditional test parameter (#661: Galaxy 500s).

The prose at line 107 also lists `float_param` and `boolean_param` as typed outputs to connect, but the table has no float row, and its boolean row covers `when`, not a boolean tool parameter. An agent targeting a float or boolean tool parameter can't tell whether "the row isn't verified" applies to it.

Suggested replacement for line 128:

> Use the mapped route for every row except the open one. Fall back only when the target is a tool conditional's test parameter, or when a test of the mapped route fails, in this order:

Also add a row, or narrow line 107 to the verified outputs:

> | Float or boolean tool parameter | None | Not tested |

If John prefers to keep "isn't verified" as the trigger, still add the float/boolean row so the trigger is decidable.

### P2 2. Fallback 1's rejoin points at a pattern verified only for scalar routes

Line 130: "Rejoin the branches per [[conditional-route-between-alternative-outputs]]." That pattern's fixture (`verification/workflows/conditional-route-between-alternative-outputs/`) gates `type: data` inputs with `type: boolean` scalars. There is no collection and no per-element `when`. Fan-in after mapped `when`-gated branches is exactly what #661 reports going wrong.

Galaxy has an API test for the mapped case, `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` in `lib/galaxy_test/api/test_workflows.py`. It runs two mapped `param_value_from_file` boolean gates and a `pick_value` merge with `pick_style: first_or_error`. The pattern instead recommends `only` when exactly one branch should run, and whether `only` works per element is unverified.

Suggested replacement for the second sentence of line 130:

> Rejoin the branches with a mapped `pick_value` per [[conditional-route-between-alternative-outputs]], using `pick_style: first_or_error`. Galaxy's API test `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` covers this mapped merge.

### P3 1. Fallback 2's ledger entry omits the fields the ledger requires

Line 131 says to "append a `kind: dropped` entry ... naming the per-element variation". The [[open-requirements-ledger]] says a `dropped` entry carries `units` and a `because` that "**must carry its citation**". The runtime agent should be told to cite something.

Suggested replacement:

> append a `kind: dropped` entry to the [[open-requirements-ledger]] whose `units` names the per-element value and whose `because` cites the open or failing row above.

### P3 2. The mispairing sentence is wrong for permutations with fixed points

Line 117: "A same-length collection in another order runs without error and gives each element a different element's value." With three or more elements, a reordering can leave some elements in place, and those get their own value. Suggested replacement:

> A same-length collection in another order runs without error and gives each element the value at its position, not its own.

### P3 3. §1 question on the open row: are there upstream issues?

The open edge concerns upstream behavior. #661 reports a Galaxy 500, and #667 reports a `gxwf validate --connections` skip in galaxy-tool-util-ts plus a misplaced `ConnectedValue` in the generated schema. Neither Foundry issue links a `galaxyproject/galaxy` or `galaxy-tool-util-ts` issue.

The #661/#667 links were mandated by the issue, so keep them. Question for John: should upstream issues be filed for the 500 and the `--connections` skip, and linked from the "Open" row when they exist? Separately, a small verification case that connects a mapped `text_param` into a test-tool conditional's test parameter would settle the conflicting reports.

### P3 4. Fixture uses `tool_state` with `ConnectedValue` boilerplate (§5 future-facing, §4 boilerplate entries)

`per-element-parameter.gxwf.yml` uses `tool_state:` with `input1: {__class__: ConnectedValue}`, `input: ...` and `lineNum: ...` entries. Galaxy's own `map_over_expression.gxwf.yml` has no state block at all, and its API tests use `state:` with only `param_type`. §5 prefers `state` over `tool_state`.

All 32 sibling fixtures use the old style, so this is a convention question. Suggested fixture shape, re-run after the change:

```yaml
  - id: read_count
    tool_id: param_value_from_file
    tool_version: 0.1.0
    in:
      - id: input1
        source: per_element_count
    out:
      - id: integer_param
    state:
      param_type: integer
      remove_newlines: true
  - id: head
    tool_id: Show beginning1
    tool_version: 1.0.2
    in:
      - id: input
        source: reads
      - id: lineNum
        source: read_count/integer_param
    out:
      - id: out_file1
```

The `label:` lines that duplicate `id:` can probably go too. If changing the siblings is wanted, that belongs in a separate issue.

### P3 5. `implement-galaxy-tool-step` may never load the new section

The note is `load: on-demand` in `content/molds/implement-galaxy-tool-step/index.md`, with triggers about collection shapes ("data_collection inputs, mapped outputs, reductions...", "File/list/paired... inputs or outputs"). Wiring a per-element value into a tool parameter matches neither trigger, so the implementing agent may never open the section (§6.4/§6.6 reachability).

Suggested addition to the second reference's `trigger` in that Mold:

> ..., or when connecting a per-element computed value to a mapped step's tool parameter.

The data-flow and interface Molds load the note upfront, so they are fine.

### Nit 1. "neighbour" in the second test's `doc`

The repo uses "neighbor" 19 times and "neighbour" 4 times. Suggested: `"Elements pair by position: a value collection in another order gives each element its neighbor's value"`.

### Nit 2. "The rows above" is ambiguous

Line 105 sits below two tables. The issue asked for this contrast, so keep it but point it at the right table:

> The shape rows and explicit operations above change the data. This route leaves the data as it is and changes a tool parameter per element.

## Tells in untouched lines of the same note (§4)

These lines are cast into three Molds' runtime context, two of them upfront. They are pre-existing, so they could be fixed in this PR or in a `work/ready-implement` follow-up.

- **Line 61, stale status, and semicolons that `foundry-documentation` bans.** "Evidence quality is uneven: ...; ...; `fromFilePairs` and arbitrary deep tuple mapping remain low-confidence without direct fixture evidence." The Confidence column already carries this. Replacement:
  > This note maps source-level Nextflow channel shapes onto Galaxy data and dataset-collection shapes. The Confidence column marks how well each row is grounded.
- **Lines 150–156, "Low-Confidence TODOs", are speculative open-work bullets (§4).** They are not runtime instructions.
  - Bullets 1–3 are authoring work and become issues or get deleted. Bullet 3 also duplicates the row at line 73.
  - Bullets 4 and 5 are real rules and should move into the table:
    - groupTuple row Notes: "Preserve `list:list` when the run axis matters downstream. Reduce to `list` only when it doesn't."
    - Arbitrary deep tuples row Notes: "Don't use `list:list` just because a Nextflow tuple is nested."
- **Lines 158–163, "Mold Use".** These lines are not instructions, because the readers are those very Molds, and they duplicate `related_molds`. They are also stale: `nextflow-summary-to-galaxy-template` doesn't reference this note (there is no cast copy and no `ref:` in its `index.md`). Delete the section, and drop `nextflow-summary-to-galaxy-template` from `related_molds` unless that Mold should load the note.
- **Line 142, "Pinned fixture examples used by the research pass:", is archaeology and survey mechanics.** Replacement: "Nextflow fixture examples:".
- **Line 148, `$IWC_FORMAT2/virology/.../influenza-consensus-and-subtyping.gxwf.yml`.** This is a fixture-root path a runtime agent won't have. Cite the abstract ID `virology/influenza-isolates-consensus-and-subtyping/influenza-consensus-and-subtyping`.
- **Line 98, unspecific recipe.** "identifier extraction, filtering, sorting, or relabeling" could now name the recipes: "`__SORTLIST__` per [[harmonize-by-sortlist-from-identifiers]], or [[sync-collections-by-identifier]] when membership differs".
- Line 81, the `branch { ... }` row, is out of scope here per #757 (#758 owns it).

## Not flagged (the issue asked for these)

- The evidence table, the "rows above change the data" contrast, the pairing paragraph, fallback 2 as a whole, and the #661/#667 links.
  - Position pairing is Galaxy's designed map-over semantics (`walk_collections`), not a §1 bug.
  - The second fixture case pins it, so a future Galaxy change that adds identifier checks would turn the test red and flag the text.
- The README's "Passed on Planemo 0.75.48 against Galaxy `release_26.1`" line and its backticked `[[...]]` match sibling READMEs.

## Evidence checked

- `lib/galaxy_test/workflow/map_over_expression.gxwf.yml` exists on `origin/release_26.1`. It maps `param_value_from_file` `text_param` into `validation_default`'s text `input1`, with per-element outputs A/B.
- `test_run_workflow_conditional_step_map_over_expression_tool` exists (`test_workflows.py:4394`) and asserts one of two jobs skipped.
- In IWC `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun` (`origin/main`), steps 18–20 are labeled "split min value", "convert min nb of reads to parameter" and "select random reads", and step 20 connects `mode|subsample_config|subsampling_mode|target`, which sits inside conditional cases. The values come from one min value repeated, so they are identical across elements.
- nf-core/rnaseq `subworkflows/nf-core/fastq_qc_trim_filter_setstrandedness/main.nf:368,408` branches on `meta.strandedness == 'auto'` and writes `meta + [strandedness: ...]`.
- `harmonize-by-sortlist-from-identifiers`, `derive-parameter-from-file`, `conditional-route-between-alternative-outputs` and `open-requirements-ledger` all exist. The ledger's `kind: dropped` contract is at lines 49–75.
- I did not run the fixture. The coordinator reports both cases passed on Planemo 0.75.48 against Galaxy `release_26.1`.

Security: nothing sensitive found, so no private report was written.

</details>
