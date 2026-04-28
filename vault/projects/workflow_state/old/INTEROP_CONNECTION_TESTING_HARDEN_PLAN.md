# Interop Connection Testing — Hardening Plan

## Goal

Maximize **declarative** test coverage of the Galaxy connection validator so the same corpus can be consumed by `galaxy-tool-util-ts`. Three workstreams, all Galaxy-side, all incremental:

- **WI-5 fixture sweep** — fill `workflow_format_validation:` coverage for `collection_semantics.yml` examples that warrant a full graph fixture.
- **WI-6 conversion** — promote `test_connection_validation.py` programmatic tests to declarative `connection_workflows/` fixtures where they fit.
- **Orphan audit** — push fixtures currently in `KNOWN_ORPHANS` into the `collection_semantics.yml` catalog where they make a real semantic claim.

Background: `INTEROP_CONNECTION_TESTING_PLAN.md` (the original interop design) and `CONNECTION_REBASE_PLAN.md` (the recent rebase). Status section in the interop plan lists the post-rebase coverage baseline (40/42 algebra, 7/42 fixture).

Both ends of this plan are tested by `test_collection_semantics_coverage.py` — the cross-check fails the build if a new fixture isn't either referenced by an example or listed in `KNOWN_ORPHANS`, and fails if a new example isn't covered by `algebra:` / `workflow_format_validation:` / `EXPECTED_NEITHER`.

---

## Combined Effort & Output

| Workstream | New `.gxwf.yml` | New tool XMLs | New examples in `collection_semantics.yml` | Programmatic tests deleted/converted |
|---|---|---|---|---|
| WI-5 fixture sweep | 3 | 0 | 0 (links existing examples) | 0 |
| WI-6 conversion | 7 | 0 | 0 | 10 convert + 3 delete (trivial) |
| Orphan audit | 0 | 0 | 3 | 0 |
| **Total** | **10** | **0** | **3** | **13** |

Estimated effort: **6–8 hours** total, splittable across reviewers.

---

## WI-5 — Fixture Sweep

### Triage criteria

- **Algebra-only sufficient**: pure unary type relationship (output type vs input slot type), fully captured by `accepts` / `can_map_over` / `effective_map_over`.
- **Fixture warranted**: graph-level concern — `collection_type_source` / `structured_like` resolution, multi-input map-over composition, sub-collection extraction with implicit map-over arithmetic, nested rank ≥ 3 cases.
- **Cannot fixturize**: runtime-only validity claims that don't reduce to parser-layer type checking.

### Coverage today

40/42 examples carry `algebra:`. 7/42 also carry `workflow_format_validation:`. The two without algebra are runtime-only (`BASIC_MAPPING_INCLUDING_SINGLE_DATASET`, `BASIC_MAPPING_TWO_INPUTS_WITH_IDENTICAL_STRUCTURE`) and stay in `EXPECTED_NEITHER`.

### New fixtures (3)

All use `collection_paired_or_unpaired` (already in `test/functional/tools/`); no new tool XMLs.

| Fixture stem | Example label | Workflow shape | Validates |
|---|---|---|---|
| `ok_list_paired_to_paired_or_unpaired` | `MAPPING_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED` | `list:paired` collection input → tool with `paired_or_unpaired` slot → dataset out | Sub-collection extraction + asymmetry (paired ⊂ paired_or_unpaired) |
| `ok_list_list_paired_to_paired_or_unpaired` | `MAPPING_LIST_LIST_PAIRED_OVER_PAIRED_OR_UNPAIRED` | `list:list:paired` collection input → tool with `paired_or_unpaired` slot → dataset out | Higher-rank nesting with same asymmetry rule |
| `ok_list_to_paired_or_unpaired` | `MAPPING_LIST_OVER_PAIRED_OR_UNPAIRED` | `list` collection input → tool with `paired_or_unpaired` slot → dataset out | `single_datasets` sub_collection_type mapping (each list element wrapped as unpaired) |

### Sidecar shape

```yaml
- target: [step_results, 1, map_over]
  value: "list"
- target: [step_results, 1, connections, 0, status]
  value: "ok"
- target: [step_results, 1, connections, 0, mapping]
  value: "list"
```

After landing, add `workflow_format_validation: { fixture: <stem> }` to the three example entries in `collection_semantics.yml`.

### Why not more

The 32 remaining algebra-only examples are pure unary type rejections / matches (`COLLECTION_INPUT_*_NOT_CONSUMES_*`, `*_REDUCTION_INVALID`, `SAMPLE_SHEET_*` symmetric-or-asymmetric matches). Algebra captures them completely; a fixture would just confirm "the validator wires `accepts` into edge validation" — already implicitly true for every passing fixture.

---

## WI-6 — Programmatic → Fixture Conversion

### Triage criteria

- **Convert**: uses only functional test tools, asserts only on observable workflow outputs (status / mapping / map_over / errors), no `make_parsed_tool` / `TextParameterModel` / `ToolOutputInteger` synthesis, no unknown-tool-id setup.
- **Keep**: synthesizes Python model objects; needs unknown tool ids; tests Python-only types; depends on `MockGetToolInfo` overrides for inner workflows.
- **Delete**: trivial edge case implicitly covered by fixture mechanics.

### Disposition (23 methods)

**Convert (10):**
- `TestStepMapOver.test_compatible_map_over_from_multiple_inputs` → `ok_two_list_inputs_map_over.gxwf.yml`
- `TestStepMapOver.test_mixed_direct_and_mapover` → `ok_paired_and_data_no_map_over.gxwf.yml`
- `TestMapOverVariants.test_list_paired_over_paired_or_unpaired` → reuses `ok_list_paired_to_paired_or_unpaired` (WI-5 above)
- `TestMapOverVariants.test_list_list_over_list_paired_or_unpaired` → `ok_list_list_over_list_paired_or_unpaired.gxwf.yml`
- `TestMultiDataReduction.test_sample_sheet_to_multi_data_ok` → `ok_sample_sheet_to_multi_data.gxwf.yml`
- `TestEndToEnd.test_three_step_chain` → `ok_simple_chain_dataset.gxwf.yml` (distinct from existing `ok_chain_map_over_propagates`: no collections involved)
- `TestEndToEnd.test_summary_counts` → sidecar assertion on `result.summary["ok"]` count
- `TestSubworkflow.test_basic_passthrough` → `ok_subworkflow_passthrough.gxwf.yml`
- `TestSubworkflow.test_collection_type_propagation` → `ok_subworkflow_list_propagation.gxwf.yml`
- `TestSubworkflow.test_map_over_inside_subworkflow` → fixture with inline subworkflow

**Keep programmatic (10):**
- `TestConnectionValidation.test_unresolved_tool_skips` — needs unknown tool_id.
- `TestStepMapOver.test_compatible_sibling_map_overs_with_different_strings` — regression for the `compatible()` rewrite; Python-level assertion.
- `TestSubworkflow.test_nested_subworkflow` — two-level nesting; sidecar paths get unwieldy.
- `TestSubworkflow.test_unresolved_inner_tool_graceful` — unknown inner tool id.
- All five `TestParameterConnections.*` — synthesize `TextParameterModel` / `ToolOutputInteger` / `parameter_input` shapes that fixtures don't model.

**Delete (3):**
- `TestStepMapOver.test_no_connections_no_map_over` — empty-step trivial case.
- `TestEndToEnd.test_empty_workflow` — 0 steps; covered by loader.
- `TestEndToEnd.test_input_only_workflow` — inputs only, no connections.

### Subworkflow rule of thumb

Up to **one level** of subworkflow nesting is fixturable — sidecar paths stay readable. Two levels deep, paths like `step_results[2].resolved_outputs[0]...` get O(depth) brittle. Fixture `gxformat2` requires explicit `input_subworkflow_step_id` on connections crossing the subworkflow boundary; verify with the basic passthrough fixture before scaling.

### Sidecar examples

```yaml
# ok_two_list_inputs_map_over
- target: [step_results, 2, map_over]
  value: "list"
- target: [step_results, 2, connections, 0, status]
  value: "ok"

# ok_subworkflow_list_propagation
- target: [step_results, 1, map_over]
  value: "list"
- target: [step_results, 2, connections, 0, mapping]
  value: "list"
```

---

## Orphan Audit

8 fixtures currently in `KNOWN_ORPHANS`. Of these:

### Stay orphan (5)

Genuine plumbing or validator-internal concerns that don't fit a single `collection_semantics.yml` label:

- `ok_dataset_to_dataset` — pure non-collection passthrough.
- `ok_chain_map_over_propagates` — workflow engine map-over propagation, not a single semantic claim.
- `ok_any_collection_accepts_list` — uses the validator-internal `collection_type_source` inspector tool.
- `ok_collection_type_source` — same; tests type-extraction mechanics.
- `ok_structured_like` — exercises `structured_like` output modifier (validator retyping), not catalog semantics.

Tighten the `KNOWN_ORPHANS` comments to spell out *why* each one stays — current comments are terse.

### Promote to collection_semantics.yml (3)

#### `ok_collection_output_with_map_over` → new `COLLECTION_OUTPUT_PRODUCES_NESTED_MAPPING`

Place after `MAPPING_LIST_PAIRED_OVER_PAIRED`. Tests sub-collection mapping where a tool's static `list:paired` output composes with an outer `list` map-over to produce `list:list:paired` — distinct from MAPPING_LIST_PAIRED_OVER_PAIRED which only tests *consuming* `list:paired`.

```yaml
- example:
    label: COLLECTION_OUTPUT_PRODUCES_NESTED_MAPPING
    assumptions:
    - datasets: ["d_1,...,d_n"]
    - tool1:
        in: {i: list}
        out: {c: "collection<list:paired>"}
    - tool2:
        in: {i: "collection<paired>"}
        out: {o: dataset}
    - collections:
        C: [list, {i1: d_1, ..., in: d_n}]
    then:
        type: map_over
        invocation:
            inputs:
                i: {type: map_over, collection: C}
        produces:
            c:
                type: collection
                collection_type: "list:paired"
                elements:
                    i1:
                        type: nested_elements
                        elements:
                            forward: {type: ellipsis}
                            reverse: {type: ellipsis}
    tests:
        workflow_format_validation:
            fixture: ok_collection_output_with_map_over
        algebra:
          - {op: can_map_over, output: list, input: NULL}
```

#### `fail_incompatible_map_over` → new `SIBLING_MAP_OVER_TYPE_MISMATCH_INVALID`

Place after `PAIRED_OR_UNPAIRED_NOT_CONSUMED_BY_LIST_WHEN_MAPPING`. Tests sibling map-over rejection — two inputs whose contributed map-over types don't `compatible()`.

```yaml
- example:
    label: SIBLING_MAP_OVER_TYPE_MISMATCH_INVALID
    assumptions:
    - datasets: ["d_1,...,d_n", d_f, d_r]
    - tool:
        in: {i1: dataset, i2: dataset}
        out: {o: dataset}
    - collections:
        C_list: [list, {i1: d_1, ..., in: d_n}]
        C_paired: [paired, {forward: d_f, reverse: d_r}]
    then:
        type: invalid
        invocation:
            inputs:
                i1: {type: map_over, collection: C_list}
                i2: {type: map_over, collection: C_paired}
    is_valid: false
    tests:
        workflow_format_validation:
            fixture: fail_incompatible_map_over
```

#### `ok_paired_maps_over_multi_data` → new `PAIRED_MAPS_OVER_MULTI_DATA`

Place after `PAIRED_REDUCTION_INVALID`. Closes a real specification gap: `collection_semantics.yml` documents that `paired` *cannot reduce* into `dataset<multiple=true>` (PAIRED_REDUCTION_INVALID), but says nothing about whether map-over is still available. The validator path (`connection_validation.py:268-277`) takes the non-list-like fall-through and accepts the connection as a map-over (each pair element fed singly; step runs twice; `multiple=true` is satisfied because per-execution arity is 1).

The sidecar asserts `step_results[1].map_over == "paired"` and `connections[0].mapping == "paired"` — i.e. it's testing map-over, not reduction. No contradiction with `PAIRED_REDUCTION_INVALID`; both behaviors are correct via different codepaths.

```yaml
- example:
    label: PAIRED_MAPS_OVER_MULTI_DATA
    doc: |
        A ``paired`` collection cannot reduce into a ``multiple=true`` data
        input (see PAIRED_REDUCTION_INVALID — only list-like collections
        reduce). It can, however, map over such an input: each pair element
        is fed singly, and the step runs twice. ``multiple=true`` does not
        block this — the slot accepts >=1 dataset, and the per-execution
        cardinality is 1.
    assumptions:
    - datasets: [d_f, d_r]
    - tool:
        in: {i: "dataset<multiple=true>"}
        out: {o: dataset}
    - collections:
        C: [paired, {forward: d_f, reverse: d_r}]
    then:
        type: map_over
        invocation:
            inputs:
                i: {type: map_over, collection: C}
    tests:
        workflow_format_validation:
            fixture: ok_paired_maps_over_multi_data
        algebra:
          - {op: can_map_over, output: paired, input: NULL}
```

---

## Implementation Order

Independent; can be done in any order or in parallel. Suggested sequence by reviewer load:

1. **WI-5** (3 fixtures) — smallest, validates the fixture-creation pipeline against current scaffolding.
2. **Orphan promotions** (2 examples + risk-flag investigation) — catalog edits + cross-check still passes.
3. **WI-6 conversions** (10 fixtures + 3 deletions) — biggest; do in batches (map-over variants → multi-data → subworkflow), one PR per batch.

Each step keeps `test_collection_semantics_coverage.py` and `test_connection_workflows.py` green; no flag-day cutover.

---

## Sanity Checks (after each batch)

- `pytest test/unit/tool_util/workflow_state/ test/unit/data/dataset_collections/ -q` — green.
- `python -c "from galaxy.model.dataset_collections.types.semantics import check; assert not check()"` — cross-refs clean.
- `KNOWN_ORPHANS` set in `test_collection_semantics_coverage.py` shrinks by exactly the number of promoted orphans.
- `EXPECTED_NEITHER` unchanged (no example losing coverage).
- For deleted programmatic tests: `git log -p` shows the conceptual coverage moved into a fixture (don't silently drop assertions).
- For converted tests: the sidecar asserts *at least as much* as the deleted programmatic test (mapping value, status, error count, summary counts).

---

## Open Questions

- **`test_three_step_chain` distinctness** — confirm it doesn't redundantly cover `ok_chain_map_over_propagates`. If overlap is exact, delete instead of converting.
- **`test_summary_counts` sidecar shape** — current sidecar schema asserts on `step_results[*]` paths. Does it support top-level `summary.ok` / `summary.invalid` assertions, or do we need a small schema extension?
- **Keep `MockGetToolInfo` synth helpers?** — once the 10 conversions land, `connection_test_fixtures.py` gets used only by the 10 retained programmatic tests. Worth slimming if the helpers stop pulling weight.
- **TS-side parity for new `op: compatible` cases** — the truth-table loader on the TS side will need an `op: compatible` handler when it lands. Note for the eventual TS-side WI-4 consumer.
