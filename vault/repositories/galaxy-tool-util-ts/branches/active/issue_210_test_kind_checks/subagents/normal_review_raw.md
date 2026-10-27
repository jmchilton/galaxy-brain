# Review: galaxy-tool-util-ts `issue_210_test_kind_checks` (`519e956e..8e4b0d7e`)

Reviewed commits `3c0c9787` and `8e4b0d7e` (27 files, +829/−111). Affected tests pass locally: schema cross-check (29), cli validate-tests (9), connection-validation (59).

## Verdict

Request changes, for one real bug (P1 1). The structure is good. The CLI's duplicate `loadWorkflowShape` and the per-file `asRecord`/`asString` copies collapse into `tests-cross-check.ts` and `coerce.ts`. Map-over direction (`actual.canMapOver(accepted)`), `sample_sheet` normalisation, and collection-form detection (`class: Collection` / `element_tests` / `elements`) match Galaxy's `verify_collection`. The `schema → workflow-graph` dependency is acceptable (see P3 4).

However, output shape checks assume the job feeds each collection input exactly its declared type. The map-over skip only covers the case where a job maps over an input. It doesn't cover a type Galaxy accepts that differs from the declared one. In that case a test that passes in Galaxy fails the gate.

## P1 1: Output shapes are resolved from declared input types, not the types the job provides (implementation verified)

`resolveWorkflowOutputCollectionTypes` runs the connection graph once per workflow, seeded with each input's declared `collection_type`. `checkTestsAgainstWorkflow` skips output shape checks only when an input in that test case emits `workflow_input_collection_map_over`.

When the job supplies an accepted but different type, nothing is skipped. Downstream shapes then differ from what the graph resolved, and exact-equality `workflow_output_collection_type` / `workflow_output_kind` errors fire on tests Galaxy would pass:

- `sample_sheet` / `sample_sheet:X` into a `list` / `list:X` input. `accepts()` normalises these to equal, but the real collection stays `sample_sheet*` downstream. Galaxy's own `SAMPLE_SHEET_PAIRED_MAPPING_OVER_PAIRED` case asserts `collection_type: sample_sheet` after a map-over.
- `paired` into `paired_or_unpaired`, and `list` / `list:paired` into `list:paired_or_unpaired`.
- Any type into an untyped `type: collection` input. Here the two sides disagree:
  - The extractors leave `collectionType` absent, so the input check treats the input as "any".
  - `graph-builder.ts` `_resolveInputStep` defaults it to `"list"`, which matches Galaxy's `default_collection_type`. Outputs therefore resolve as if the job gave a `list`.

The Galaxy and IWC sweeps found 0 such errors only because the affected Galaxy cases assert `asserts:` / text on those outputs, not `collection_type`. The corpora don't cover this case, so it isn't disproved.

<details><summary>Evidence</summary>

Built branch, `gxwf validate-tests passthrough.gxwf-tests.yml --workflow passthrough.gxwf.yml --json`:

```yaml
# passthrough.gxwf.yml
class: GalaxyWorkflow
inputs:
  input1: {type: collection, collection_type: list}
  untyped: {type: collection}
outputs:
  out1: {outputSource: input1}
  out2: {outputSource: untyped}
steps: {}
```

```yaml
# passthrough.gxwf-tests.yml
- doc: sample_sheet into list input, passthrough
  job:
    input1:
      class: Collection
      collection_type: sample_sheet
      rows: {el1: []}
      elements: [{identifier: el1, class: File, contents: "x"}]
    untyped:
      class: Collection
      collection_type: list:paired
      elements:
        - identifier: el1
          class: Collection
          elements:
            - {identifier: forward, class: File, contents: "f"}
            - {identifier: reverse, class: File, contents: "r"}
  outputs:
    out1: {class: Collection, collection_type: sample_sheet}
    out2: {class: Collection, collection_type: list:paired}
```

Result: `valid: false`:

- `/0/outputs/out1/collection_type`: "is a 'list' collection but collection_type 'sample_sheet' is asserted"
- `/0/outputs/out2/collection_type`: "is a 'list' collection but collection_type 'list:paired' is asserted"

Galaxy compares `collection_type` by exact string equality against the real HDCA, so both assertions pass there.

Passthrough is the minimal repro. The same divergence propagates through `structured_like` outputs and downstream map-over.

</details>

Fix: generalise the skip. Any collection input whose job `collection_type` isn't exactly the type the graph assumed should skip that case's output shape checks, the same as map-over does. The graph assumes the declared type, or `list` when no type is declared.

<details><summary>Details</summary>

In `check.ts`, rename `mapsOver` to `shapesDiverge` (or similar). Set it from `checkInputKind` whenever the job's collection differs from the type the graph assumed:

```ts
// checkInputKind returns { diagnostics, diverges }
const assumed = declared.collectionType ?? "list"; // graph-builder's default
if (isCollection && COLLECTION_INPUT_TYPES.has(declared.type) && actualCollectionType !== assumed) {
  diverges = true;
}
```

`diverges` is also true whenever a `MAP_OVER` diagnostic is emitted.

Alternatively, have the extractors default `collectionType` to `"list"` as Galaxy and `graph-builder` do. That also turns `list:paired` → untyped input into a `workflow_input_collection_type` error. That's arguably right, since Galaxy's input is `list`, but it is stricter than Galaxy's non-enforcement at invocation. Keeping it skip-only is the conservative choice for a hard gate.

Add the repro above as a red→green case in `cross-check-kinds.test.ts`, with an output shape that has `collectionType: "list"` and `job.collection_type: sample_sheet`. Add one case for the untyped input.

Precise follow-up, not needed now: re-run the graph per test case, seeded with the job's actual input types.

</details>

## P3 (non-blocking)

### P3 1: `filetype` equal to a declared format still warns when the datatype isn't in the snapshot

`producesAcceptableDatatype` uses `isSubType`, which returns false for any extension missing from the snapshot, even an exact match. Shed datatypes and site-local datatypes therefore always warn.

Repro: input `format: [myshedtype]`, job `filetype: myshedtype` → `workflow_input_format` "not a known Galaxy datatype".

```diff
   if (isFile && datatypes && declared.format && filetype && filetype !== "auto") {
+    if (declared.format.includes(filetype)) return [];
     if (producesAcceptableDatatype(datatypes, declared.format, [filetype]).canAccept) return [];
-    const known = filetype in datatypes.datatypesMapping.ext_to_class_name;
+    const known = Object.hasOwn(datatypes.datatypesMapping.ext_to_class_name, filetype);
```

The `Object.hasOwn` change avoids prototype keys such as `constructor`. The plan already defers the `fastqsanger` → `fastqsanger.gz` warning, which needs implicit-conversion awareness. Confirmed it fires; not re-raised.

### P3 2: Unlabelled native workflow outputs are never shape-checked

`extractNativeOutputs` names an output `label ?? output_name`. `_buildWorkflowOutputMap` keys the same output `label || "<stepId>:<output_name>"`. Unlabelled `.ga` outputs therefore never resolve and are silently skipped. This is a missed check, not a false positive. It would be cleaner to give both one naming rule, or to skip unlabelled outputs explicitly.

### P3 3: `WorkflowGraph.outputMap` is optional although `buildWorkflowGraph` always sets it

The doc comment says "always set by `buildWorkflowGraph`", but both consumers (`graph-builder.ts:195`, `workflow-output-types.ts:16`) have to write `?? {}`. Nothing in the repo builds `WorkflowGraph` literals, because tests only read `sortedStepIds`. Make it required, unless external constructors are a real concern for this public type. If they are, say so in the comment.

### P3 4: `schema → workflow-graph` dependency

Acceptable:

- `workflow-graph` has no internal dependencies, so there's no cycle.
- It is `sideEffects: false`.
- `check.ts` imports only root exports (`CollectionTypeDescription`, `producesAcceptableDatatype`, and the `DatatypesMapperModel` type).
- The snapshot stays behind its subpath, so the VS Code web bundle doesn't pull it in.

Option injection (`{ acceptsCollection, datatypes }`) would keep `schema` leaf-pure, but it costs more API surface than it saves. Reusing `connection-validation`'s `canMatch`/`canMapOver` isn't possible, because `connection-validation` → `schema` would create a cycle. Comma variants don't apply to workflow inputs (research confirms the single type).

Ask: update the repo `CLAUDE.md` line "Dependency chain: `schema` ← `core` ← `cli`". It was already stale (no `connection-validation`/`workflow-graph`), and `schema` now has an internal dependency.

### P3 5: Test gaps

- `validate-tests-tree.test.ts` gets no new case. Nothing covers the new `warnings` field, the warnings printed for OK files, or `cacheDir` pass-through for the tree command.
- No committed end-to-end case on a native `.ga`. The CLI tests use only the format2 fixture; native extraction is unit-tested only for `format`/`collection_type`. `.ga` was exercised only by the manual IWC sweep.
- Untested branches: `filetype: auto` skip, the unknown-filetype message (`known: false`), and `elements` without `class` as collection form.
- The CLI test reaches into another package's fixtures (`../../connection-validation/test/fixtures/...`). This works, but it couples the two packages' test trees.

### P3 6: The bare `catch { return {}; }` in `resolveOutputCollectionTypes` hides graph-builder bugs

Skipping is the safe direction for a gate. Still, a `TypeError` in the graph builder would silently disable all output shape checks. Consider catching only expected failures, or surfacing a single warning ("output shapes not checked: …").

### P3 7: Docs imply `--cache-dir` is required for tool steps

`docs/packages/cli.md` says "other tool steps need cached tools (`--cache-dir`)". Without the flag, the default cache (`~/.galaxy/tool_info_cache`) is still read, as the verification run shows. Suggest: "tool steps resolve from the local tool cache (default or `--cache-dir`); never fetched".

### P3 8: `--cache-dir` without `--workflow` is silently ignored in `validate-tests`

Minor. Either warn, or document that it only applies with `--workflow`.

## Checked and fine

- **Map-over direction:**
  - `list:paired` → `paired` input warns.
  - `list:paired` → `list` input errors (it can't map).
  - `paired_or_unpaired` cases follow `canMapOver`.
  - The Galaxy `sample_sheet:paired` → `paired_or_unpaired` cases go through the map-over warning and skip.
- **Skipping output checks on map-over is right.** Reductions (multiple data inputs, `list` consumers) mean outputs aren't uniformly prefixed, so computing them isn't safe without re-running the graph.
- **`class: File` on a collection input as a hard error is correct.** Galaxy has no auto-wrap.
- **The `_sniff_` / `input` formats** are handled by `producesAcceptableDatatype`; `auto` is skipped explicitly.
- **validate-tests and validate-tests-tree now share one cross-check path** and the same `errors`/`warnings` split. `valid` and the exit code ignore warnings in both.
- **Report contract:** the `warnings` field and the optional `severity` are additive. No TS (gxwf-web/ui) or Python (gxformat2, gxwf-web, planemo) consumer of these reports exists. The VS Code plugin imports only the DTO types, and the new fields are optional.
- **The subworkflow output map refactor** (`_buildSubworkflowOutputMap` → `innerGraph.outputMap`) is behaviour-preserving.
