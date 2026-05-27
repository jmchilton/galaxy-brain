# UDT Connection-Validation Fixtures — Declarative, Cross-Language

**Date:** 2026-05-23
**Parent plan:** [[USER_DEFINED_TOOL_STEP_VALIDATION]] (Phases A–E landed)
**Companion docs:**
- [[CURRENT_STATE]]
- TS port: `~/projects/repositories/galaxy-tool-util-ts/packages/connection-validation/`

---

## 1. Gap

Parent plan §9.8 listed `UDT-feeds-regular-tool`, `regular-tool-feeds-UDT`, `data_collection`-typed UDT output, and UDT-in-subworkflow as expected fixtures. Only the subworkflow case landed (`test_inline_udt_workflows.py::test_udt_inside_format2_subworkflow_resolved`). The rest are absent.

In addition, the existing inline-UDT connection tests:

- `test_inline_udt_connection_diagnostic_attributed_to_consumer` admits in its own comment "No type mismatches in this minimal workflow." It only asserts that the result dict is keyed by the consumer step id, not that an actual mismatch lands there. **The consumer-attribution claim is structurally verified, not behaviorally.**
- No fixture exercises `effective_map_over` / `collection_type_rank` propagation through an inline UDT.
- No fixture exercises a UDT producing a `data_collection`-typed output.

The connection graph "just works" theory from §5.6 of the parent plan is plausible (the same `ResolvedStep` shape feeds the same downstream code) but unlocked by tests.

## 2. Existing declarative seam — already cross-language

Both repos already have a parallel, declarative, file-based connection-validation corpus:

| Side | Driver | Fixture dir | Expected sidecar |
|---|---|---|---|
| Python | `test/unit/tool_util/workflow_state/test_connection_workflows.py` | `test/unit/tool_util/workflow_state/connection_workflows/*.gxwf.yml` | `connection_workflows/expected/<stem>.yml` |
| TypeScript | `packages/connection-validation/test/connection-workflows.test.ts` | `packages/core/test/fixtures/connection_workflows/*.gxwf.yml` | `connection_workflows/expected/<stem>.yml` |

Conventions both sides honor:

- Filename prefix `ok_` ⇒ workflow must validate; `fail_` ⇒ must not.
- Sidecar `expected/<stem>.yml` is a list of `{target: [path,...], value: ...}` pairs, verified by `dict_verify_each` (Python) / `dictVerifyEach` (TS) against the serialized `ConnectionValidationReport`.
- Tools resolved by side-specific helpers: `FunctionalGetToolInfo` (walks `test/functional/tools/`) on Python; `loadParsedToolCache` (reads `parsed_tools/*.json`) on TS.

**This is the right home for UDT connection fixtures.** Sidecar YAMLs are language-agnostic data, not test code; one fixture file locks the same behavior on both sides.

## 3. TS-side parity prerequisite

`loadParsedToolCache` only reads JSON tool dumps; it does not parse `step.tool_representation`. To run UDT-bearing fixtures, the TS `GetToolInfo` test helper needs an inline-tool fast path equivalent to Python's `resolve_for_step` — parse the YAML representation inline rather than expecting a cache hit.

**This is TS-port work**, but the fixture layout is identical regardless. Recommended ordering:

1. Land Python fixtures + sidecars (this plan).
2. File the inline-tool resolver upgrade as a TS-side task with the Python fixtures as the parity target.
3. TS port copies the fixtures + sidecars verbatim; tests go green when the resolver lands.

The fixtures must be **self-contained** (no `tool_uuid`-only references); every UDT step carries its `tool_representation`/`run` body inline.

## 4. Fixture catalog

All paths under `test/unit/tool_util/workflow_state/connection_workflows/` (Python) and `packages/core/test/fixtures/connection_workflows/` (TS).

UDT body used throughout is the `cat_user_defined` shape that already exists at `test/functional/tools/cat_user_defined.yml` — keeps the offline corpus coupled to the live UDT framework test. Collection-output and format-source variants extend that body inline in the fixture.

### 4.1 ok_ fixtures (must validate)

| Fixture | Shape | Locks |
|---|---|---|
| `ok_udt_to_regular_dataset.gxwf.yml` | input → UDT(data) → cat1(data) | UDT data output feeds regular tool data input. Baseline producer-side parity. |
| `ok_regular_to_udt_dataset.gxwf.yml` | input → cat1(data) → UDT(data) | UDT data input accepts regular tool data output. Baseline consumer-side parity. |
| `ok_udt_chain.gxwf.yml` | input → UDT → UDT | UDT-to-UDT chain. Exercises the inline resolver twice in one graph. |
| `ok_udt_collection_output.gxwf.yml` | input → UDT(`type: data_collection`, `collection_type: list`, `discover_datasets`) → list-consumer | UDT collection output declaration propagates `collection_type` into `ResolvedOutputType`. |
| `ok_udt_collection_input.gxwf.yml` | list input → UDT(`input1: type: data_collection, collection_type: list`) → list output | UDT collection-typed input resolves without map-over confusion. |
| `ok_udt_map_over_list.gxwf.yml` | list input → UDT(data input) → list output via implicit map-over | `effective_map_over` propagation through a UDT producer. Step's `map_over` field in the report should be `"list"`. |
| `ok_udt_format_source_propagates.gxwf.yml` | input(format: bed) → UDT with `output: format_source: input1` → format-aware consumer | Already covered structurally by `test_inline_udt_output_format_source_resolves_to_inline_input`; promoting to declarative locks the report-level resolution. |
| `ok_udt_in_subworkflow.gxwf.yml` | parent → subworkflow{ UDT } → parent consumer | Promotes the in-tree `test_udt_inside_format2_subworkflow_resolved` to declarative form. |

### 4.2 fail_ fixtures (must not validate)

| Fixture | Shape | Locks |
|---|---|---|
| `fail_udt_dataset_to_collection_consumer.gxwf.yml` | UDT produces data → consumer requires `data_collection` | Real type-mismatch through UDT producer. **The first test that exercises an `"invalid"` status on a UDT-producer connection.** |
| `fail_collection_to_udt_dataset.gxwf.yml` | list collection → UDT data input (no map-over declared) | Pre-resolved collection cannot feed UDT scalar input without implicit map-over fallback. |
| `fail_udt_consumer_diagnostic_on_consumer.gxwf.yml` | Same shape as fail_udt_dataset_to_collection_consumer with sidecar asserting diagnostic lands on consumer step | Replaces the no-op `test_inline_udt_connection_diagnostic_attributed_to_consumer` with a real assertion: `step_results[<consumer>].connections[0].status == "invalid"` and `step_results[<producer>].connections == []`. |

### 4.3 Sidecar expectations — what to assert

For each fixture, the `expected/<stem>.yml` must include:

- `[valid]` — boolean
- `[summary, ok|invalid|skip]` — connection counts
- For each meaningful connection: `[step_results, <i>, connections, <j>, status]` and `[..., mapping]` where map-over applies
- For map-over fixtures: `[step_results, <udt_step_i>, map_over]` non-null
- For collection-output fixtures: `[step_results, <udt_step_i>, resolved_outputs, <k>, collection_type]`
- For fail_ fixtures: `[step_results, <consumer_i>, connections, <j>, errors]` is non-empty *and* `[step_results, <producer_i>, errors]` is empty (consumer-attribution lock)

These assert against the existing `ConnectionValidationReport` shape — no new report fields required.

## 5. Functional-tool dependencies

Most fixtures reference existing functional tools (`cat1`, `multi_data_param`, `collection_paired_test`, etc.). Two cases need extension:

- **UDT collection output** — extend the inline UDT body in `ok_udt_collection_output.gxwf.yml` to declare:
  ```yaml
  outputs:
    - name: output1
      type: data_collection
      collection_type: list
      discover_datasets:
        pattern: "__name_and_ext__"
        directory: "outputs"
  ```
  Self-contained; no new functional tool fixture.
- **List consumer for UDT collection output** — `collection_paired_test` accepts paired collections, not lists. May need to add a small `list_consumer.xml` functional test tool. Cheaper: pick an existing functional tool that takes a `data_collection` typed list input (e.g., `multi_data_param`'s flat list shape, or `collection_creates_list` reversed). Survey existing `test/functional/tools/` before adding a new one.

## 6. Cross-language fixture sync

Two options for keeping the parallel directories in lockstep:

### Option A — Manual `cp` (recommended near-term)

Drop fixtures and sidecars into the Python tree first. Open a sibling PR in `galaxy-tool-util-ts` that `cp`s the same files into `packages/core/test/fixtures/connection_workflows/`. CI runs both suites.

**Drift risk:** Real. Mitigation: a small `scripts/check_fixture_parity.py` (committed in both repos) that diffs the two fixture directories and fails CI if they differ. Run as a pre-commit hook on both sides.

### Option B — Canonical source, generated copies

Move fixtures into a third location (gxformat2's `examples/` tree is the obvious candidate — already cross-language and depended on by both). Each side's test driver loads from the gxformat2 install.

**Cost:** Touches a third repo, bumps a dep pin, slows iteration. Worth it long-term; overkill for landing this gap.

**Recommendation: Option A** + the parity script. Promote to Option B in a separate PR once the fixture set stabilizes.

## 7. Test driver changes

`test_connection_workflows.py` auto-discovers by glob — no driver change needed once fixtures land. Same on TS side (`for (const f of fixtures)`).

The only edit needed: **delete** `test_inline_udt_connection_diagnostic_attributed_to_consumer` from `test_inline_udt_workflows.py` once `fail_udt_consumer_diagnostic_on_consumer.gxwf.yml` lands. It's currently a no-op and the fixture supersedes it.

The other `test_inline_udt_workflows.py` connection tests (`test_connection_graph_inline_outputs_resolved`, `test_connection_validation_inline_udt_succeeds`, `test_inline_udt_output_format_source_resolves_to_inline_input`) can stay — they test the graph layer directly with Python-dict synthesis. Fixtures lock end-to-end behavior; unit tests lock structural invariants. Both have value.

## 8. Phasing

### Phase A — corpus extension, Python side

1. Add the 8 ok_ + 3 fail_ fixtures from §4 to `test/unit/tool_util/workflow_state/connection_workflows/`.
2. Author sidecar `expected/<stem>.yml` for each per §4.3.
3. Survey `test/functional/tools/` for an appropriate list-collection consumer; add one only if none exists.
4. Run `pytest test/unit/tool_util/workflow_state/test_connection_workflows.py` to confirm all ok_ pass and fail_ fail.
5. Delete the no-op `test_inline_udt_connection_diagnostic_attributed_to_consumer`.

### Phase B — TS port parity

1. File issue in `galaxy-tool-util-ts` referencing this plan: TS connection-validation needs an inline-tool resolver path in its `GetToolInfo` test helper.
2. Once landed there, `cp` the 11 fixtures + sidecars into `packages/core/test/fixtures/connection_workflows/`.
3. Commit the `scripts/check_fixture_parity.py` companion script (or a `make check-fixture-parity` target) in both repos.

### Phase C — promote to canonical (optional, deferred)

Move fixtures to gxformat2's `examples/connection_workflows/` (or similar). Bump deps. Out of scope until corpus stabilizes.

## 9. Open questions

- TS port: ETA on inline-tool resolver in `GetToolInfo` test helper? Blocks Phase B sync.
- Fixture parity enforcement: pre-commit hook vs CI-only check?
- For `fail_collection_to_udt_dataset`, does the current Python connection graph emit an `invalid` status, or does it skip? (Run the smallest fixture first to confirm before authoring sidecar expectations.)
- Should `ok_udt_collection_output.gxwf.yml` also assert on `resolved_outputs[i].collection_type == "list"`, or is that an implementation detail of the propagation pass we'd rather not lock?
- Long-term home: do we want a third shared fixtures repo (Option B in §6), or is parallel-with-parity-check the durable answer?
