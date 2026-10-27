Toward 🎯 #210 - `gxwf validate-tests --workflow` now catches dataset-vs-collection and `collection_type` mismatches, and warns on input datatype mismatches, instead of passing tests that fail in Galaxy.

On the real egapx run from the issue (Galaxy Workflow Foundry; inline subworkflow + user-defined tools), the tests file asserts `star_bam` as a single dataset. The workflow maps the producing step over a `list:paired_or_unpaired` input, so Galaxy produces a `list`:

```
# main
$ gxwf validate-tests galaxy-workflow.gxwf-tests.yml --workflow galaxy-workflow.gxwf.yml
galaxy-workflow.gxwf-tests.yml: OK

# this branch
galaxy-workflow.gxwf-tests.yml: 1 validation error(s)
  /0/outputs/star_bam: Output 'star_bam' is a 'list' collection but is asserted as a dataset; use class: Collection. [workflow_output_kind]
```

The same file with the issue's other cases mutated in:

| Issue case (egapx) | main | branch |
|---|---|---|
| dataset-form assertion on a `list` output (`star_bam`) | pass | **error** `workflow_output_kind` |
| `filetype: bam` on a `format: fasta` input | pass | warning `workflow_input_format` |
| `class: Collection` on a data input | pass | warning: Galaxy maps the workflow over it |
| `collection_type: list:paired` on the `list` output `stats` | pass | pass: `stats`'s shape can't be resolved (below) |
| `ftype: bam` on a fasta output | pass | pass: not in scope (below) |

***Errors are only what Galaxy's workflow test runner fails on:*** `class: File` on a collection input, a `collection_type` the input can't accept, an output asserted as a dataset when it's a collection (or the reverse), and an output `collection_type` that differs. ***Datatype checks cover inputs only, and only warn***, because Galaxy doesn't enforce an input's `format` when the workflow is invoked. Collection map-over also only warns. Warnings don't make a file invalid.

***No new errors on tests that pass today.*** Comparing main and branch on IWC (127 tests files, run by planemo in IWC CI; 612 workflow outputs resolved) and Galaxy's own `lib/galaxy_test/workflow/` (53 files): zero new errors, and identical summary counts. The Galaxy corpus mostly exercises inputs: its framework tools aren't in the tool cache, so only 3 of its outputs resolve. The sweeps changed the design twice:
- Galaxy's own passing tests bind collections to `data` inputs, so that case is a map-over warning, not an error.
- IWC asserts collections with `element_tests` and no `class`, which planemo accepts, so that counts as collection form too.

***`valid: true` doesn't mean every output was checked.*** Output shapes come from the connection graph, read offline from the local tool cache; outputs it can't resolve are skipped silently. On egapx only 2 of 17 resolve, even with every tool cached: connection validation skips `pick_value`'s repeat inputs, so all steps downstream stay unknown (a separate connection-validation gap). Results can differ between machines with different caches.

<details><summary>How it works</summary>

- **Inputs**:
  - The extractors now keep `format` and `collection_type`, for both format2 and native workflows.
  - Collection compatibility uses the editor's `CollectionTypeDescription.accepts`, so `sample_sheet:paired` into `list:paired` passes, and a deeper collection that would map over is a warning.
  - `filetype` is checked against `format` with `producesAcceptableDatatype` over the bundled datatypes snapshot (parent PR). `auto` and formats named verbatim are skipped.
- **Outputs**:
  - The new `resolveWorkflowOutputCollectionTypes` (`connection-validation`) maps workflow output labels through `WorkflowGraph.outputMap`, including subworkflows and inline user-defined tools.
  - The `collection_type` comparison is exact, as in Galaxy's runner.
- **Shapes assume the declared inputs.** Sometimes a test's job collections differ from the declared input types: map-over, `sample_sheet` into `list`, or anything but `list` into an untyped collection input. That test's output checks are then skipped rather than guessed.
- **Contract**:
  - `TestFormatDiagnostic` gains optional `severity` (absent means error).
  - CLI reports gain `warnings`.
  - `validate-tests` and `validate-tests-tree` gain `--cache-dir`. Tools are read from the cache only, never fetched; `galaxy-tool-cache populate-workflow` fills it.
  - Both commands now share one workflow loader instead of two copies.

</details>

<details><summary>Tests</summary>

- `packages/schema/test/cross-check-kinds.test.ts`: covers
  - extraction (format2 + native) and each input/output keyword;
  - `sample_sheet` acceptance, and the map-over and divergence skips;
  - `element_tests` without `class`, `filetype: auto`, and shed-only formats.
- `packages/connection-validation/test/workflow-output-types.test.ts`:
  - subworkflow map-over resolves to `list`;
  - a dataset output resolves to `null`, and a passthrough input to its declared type;
  - an unknown tool is omitted.
- `packages/cli/test/validate-tests.test.ts` and `validate-tests-tree.test.ts`: end to end on that workflow, with errors vs warnings, exit codes, and an output labelled `constructor`.

</details>

**Not in scope: output `ftype` vs the producing tool's format** (issue ask 3), so this doesn't close #210. It needs datatype propagation through `format_source` and change-datatype actions in the connection graph.

## Risks

A two-way door, but a gate: new errors make some existing tests files invalid, and Foundry treats `validate-tests` as a hard check.

<details><summary>Risk Details</summary>

- **Galaxy vs planemo.**
  - The reference is Galaxy's workflow test runner. Planemo is more lenient: it never checks a dataset's `ftype`, and ignores a top-level `collection_type` on collection outputs.
  - So `workflow_output_collection_type` can fail a file that `planemo test` passes but Galaxy's runner fails.
  - No IWC test hits this.
- **Coverage depends on the graph.** Output checks only cover outputs the connection graph can resolve: uncached tools and skipped edges (such as `pick_value` repeats) leave everything downstream unchecked.
- **New dependency.** `schema` now depends on `workflow-graph`, whose one runtime dependency is `pyre-to-regexp`. The VS Code extension's bundle of `schema` picks it up. The 250 KB snapshot stays behind its subpath; only the CLI imports it.
- **Lenient datatype check.** It inherits the client mapping's leniency for `subclass="true"` siblings (parent PR).

</details>

<details><summary>Risk Review Advice</summary>

Check whether `workflow_output_collection_type` should be an error even though planemo ignores it. Check that "skip output checks when job collections differ" isn't too blunt for Foundry's tests; the alternative is resolving shapes per test, seeded with the job's input types.

</details>

## Context

Builds on 🌿[issue_210_datatypes_snapshot](https://github.com/jmchilton/galaxy-tool-util-ts/tree/issue_210_datatypes_snapshot) (datatypes snapshot). Downstream, in galaxyproject/foundry#731 step 4, the `implement-galaxy-workflow-test` Mold's "no collection/datatype mismatches" claim becomes true for collection shape. For datatypes it still overclaims: output `ftype` stays unchecked, and input `filetype` only warns. Minor bumps: `schema`, `connection-validation`, `cli`.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Fixed a false positive on outputs labelled <code>constructor</code>/<code>toString</code>; input-type aliases now derived from the canonical table.</summary>

Three fixes:
- Resolved output shapes are now a `Map`; an `in {}` lookup hit `Object.prototype`. Red→green CLI test.
- Data/collection input type aliases are derived from `INPUT_TYPE_TO_SCHEMA` instead of hand-copied.
- Input kind checks dispatch on the job's `class`.

The sweeps were byte-identical after each fix. Deferred: resolving output shapes per test, seeded with the job's input types, which would replace the divergence skip.

</details>

### ✅ Second Frontier Model Review

<details><summary>Four findings, none changed code: two contradicted by Galaxy's source, two outside this branch.</summary>

- Comma-separated `collection_type` on a workflow input: Galaxy's `validate_state` rejects it.
- `attributes.collection_type` ignored: Galaxy's verifier and planemo read `attributes.type`, so checking it would flag tests Galaxy passes.
- Classless `element_tests` still fails the synced Galaxy schema: true on main too.
- Unlabelled native outputs aren't shape-checked: Galaxy tests address outputs by label.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
