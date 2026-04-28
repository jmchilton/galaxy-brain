# Interop Connection Testing Plan

## Goal

Make Galaxy's connection-validation tests consumable by the forthcoming TypeScript connection validator in `galaxy-tool-util-ts`, so both languages run the same corpus against the same expectations and the same tool definitions — without coupling the TS side to Galaxy's Python tool-XML parser.

Scope: the pieces needed *now* to unblock TS connection validation at the CLI level. Does not cover cross-CLI diff (idea #7) or goldens (idea #4) — those sit on top and can land later.

## Context

- Galaxy side (branch `wf_tool_state`, worktree `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state`) already has the Python connection validator and four test files: `test_connection_types.py` (algebra), `test_connection_graph.py`, `test_connection_validation.py` (programmatic), `test_connection_workflows.py` (fixture-driven).
- Fixture tests live at `test/unit/tool_util/workflow_state/connection_workflows/*.gxwf.yml` with sidecar `expected/*.yml` files using a `target: [path, …] / value: X` schema driven by `dict_verify_each`.
- TS side (this repo) already has a `make sync-*` convention reading `GALAXY_ROOT` / `GXFORMAT2_ROOT`. Pattern examples: `sync-golden`, `sync-param-spec`, `sync-test-format-schema` (the latter invokes a Python script via `$(GALAXY_PYTHON) = $(GALAXY_ROOT)/.venv/bin/python`).
- Tier 1 workflow-graph package (`TS_CONNECTION_REFACTOR_IN_GX_PLAN.md`) is half done; that plan owns the pure algebra in TS. This plan hands it (and the coming TS connection validator) the test corpus it needs.

## Decisions (locked)

1. **Fixture home in Galaxy**: stays at `test/unit/tool_util/workflow_state/connection_workflows/`. Established pattern, minimal blast radius. Sync target points here.
2. **TS destination**: `packages/core/test/fixtures/connection_workflows/`. Mirrors `packages/core/test/fixtures/golden/`.
3. **ParsedTool JSON cache**: lives in this repo at `packages/core/test/fixtures/connection_workflows/parsed_tools/<tool_id>.json`. Not in Galaxy.
4. **Tool list**: auto-derived by walking the synced `*.gxwf.yml` fixtures for `tool_id:` refs. No hand-maintained manifest.
5. **Sidecar schema**: ported verbatim. TS gets a `dictVerifyEach` helper with the same `target: [path,…] / value: X` entries.
6. **Fixtures without sidecars**: allowed — `ok_*` just asserts valid, `fail_*` just asserts invalid, same as Python today.
7. **`sample_sheet` collection types**: defer. Not blocking.

---

## Work Items

### WI-1: Sync fixture corpus (Galaxy → TS)

Add two Makefile targets in the TS repo:

```make
CONN_WF_SRC = $(GALAXY_ROOT)/test/unit/tool_util/workflow_state/connection_workflows
CONN_WF_DST = packages/core/test/fixtures/connection_workflows

sync-connection-workflows:
    # guard GALAXY_ROOT; rm -rf dst; cp *.gxwf.yml; cp expected/*.yml
```

`sync-connection-workflows` copies `*.gxwf.yml` and `expected/*.yml` only. No parsed-tool work here; that's WI-2.

Rolled into the top-level `sync` target alongside existing `sync-golden` etc. Add a `check-sync-connection-workflows` (SHA diff) matching the existing pattern.

### WI-2: Sync ParsedTool JSON cache (new Python sync script)

New script: `scripts/sync-parsed-tools.py` (this repo). Invoked via `$(GALAXY_PYTHON)` (Galaxy's venv). Responsibilities:

1. Walk `$CONN_WF_DST/*.gxwf.yml`, collect every `tool_id:` value referenced in `steps.*`. Tool IDs like `gx_data`, `collection_paired_test`, `collection_type_source`, etc. (current fixtures use Galaxy's functional test tools under `$GALAXY_ROOT/test/functional/tools/`).
2. For each tool_id, resolve via the same logic `FunctionalGetToolInfo` uses: `functional_test_tool_source(tool_id)` with recursive directory walk fallback (port from `test/unit/tool_util/workflow_state/functional_tool_info.py` — ~20 lines).
3. Parse with `galaxy.tool_util.model_factory.parse_tool`.
4. Serialize via Pydantic: `parsed_tool.model_dump_json(indent=2, exclude_none=True, by_alias=True)` (match whatever serialization shape the TS ParsedTool Effect Schema expects — cross-check against `packages/schema/src/tool/parsed-tool.ts` before committing).
5. Write one file per tool: `packages/core/test/fixtures/connection_workflows/parsed_tools/<tool_id>.json`.
6. Write SHA256 manifest `parsed_tools.sha256` for CI verification (match the `sync-test-format-schema` pattern).
7. Exit non-zero on any unresolved tool_id, listing them. No silent skips (loud failure requested — counters Galaxy's current `FunctionalGetToolInfo` exception-swallowing; see idea #8 from the brainstorm).

Makefile:

```make
PARSED_TOOLS_DST = $(CONN_WF_DST)/parsed_tools
GALAXY_PYTHON ?= $(GALAXY_ROOT)/.venv/bin/python

sync-parsed-tools: sync-connection-workflows
    # guard GALAXY_ROOT + GALAXY_PYTHON
    PYTHONPATH="$(GALAXY_ROOT)/lib" "$(GALAXY_PYTHON)" scripts/sync-parsed-tools.py \
        --fixtures $(CONN_WF_DST) --out $(PARSED_TOOLS_DST) --galaxy-root $(GALAXY_ROOT)
```

Order matters: `sync-parsed-tools` depends on `sync-connection-workflows` so tool discovery reads the just-synced fixtures (one source of truth). Both folded into the top-level `sync`.

### WI-3: Fixture + tool loader in TS

Small util in `packages/core/src/testing/` (or `packages/core/test/helpers/` if it shouldn't ship):

- `loadConnectionFixtures(dir)` → array of `{ stem, workflow, expected?: ExpectationEntry[] }`. Uses `js-yaml`.
- `loadParsedToolCache(dir)` → `Map<string, ParsedTool>` decoded via the existing Effect Schema.
- `dictVerifyEach(actual, entries)` — verbatim port of the Python helper. Walks `target: [path,…]` segments (strings as keys, numbers as indices), asserts `value:` equality. Throws with the same error message shape for parity.
- A `createFixtureGetToolInfo(cache)` adapter producing whatever `GetToolInfo` shape the TS validator will want — stub for now, finalized when the validator lands.

Exports from `@galaxy-tool-util/core` under a `testing` subpath so downstream packages (including the future connection-validation package) can consume without duplication.

### WI-4: Truth-table for collection-type algebra (idea #3)

Replace the hand-ported `test_connection_types.py` cases with a YAML truth table that both sides consume.

**Canonical location**: new file in Galaxy: `test/unit/tool_util/workflow_state/connection_type_cases.yml`. Owned by the module under test; synced to TS.

Shape (informal):

```yaml
- op: can_match          # can_match | can_map_over | effective_map_over
  output: list:paired
  input: paired
  expected: true
  semantics_ref: MAPPING_LIST_PAIRED_OVER_PAIRED   # optional
  note: "…"                                         # optional

- op: effective_map_over
  output: list:list
  input: list:paired_or_unpaired
  expected: list
  semantics_ref: MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED
```

Special tokens for sentinels: `NULL`, `ANY`. Parser resolves via `NULL_COLLECTION_TYPE` / `ANY_COLLECTION_TYPE`.

- **Python consumer**: `test_connection_types.py` becomes a single parametrized test that loads the YAML and dispatches on `op`. Keep only the few hand-written tests for sentinel *properties* (`is_collection`, `rank == -1`, etc.) that aren't naturally table-shaped.
- **TS consumer**: new `packages/workflow-graph/test/connection-type-cases.test.ts` loads the same YAML (synced via new `sync-connection-type-cases` target → `packages/workflow-graph/test/fixtures/connection_type_cases.yml`). Dispatches to the ported `canMatch` / `canMapOver` / `effectiveMapOver` from `collection-type.ts`.
- **Case coverage**: first pass mechanically translates every case currently in `test_connection_types.py` (Python-only). Second pass cross-refs `collection_semantics.yml` labels and fills gaps. `semantics_ref` makes coverage tractable.
- Sync target mirrors existing patterns:
  ```make
  sync-connection-type-cases:
      cp $(GALAXY_ROOT)/test/unit/tool_util/workflow_state/connection_type_cases.yml \
         packages/workflow-graph/test/fixtures/connection_type_cases.yml
  ```

**Order**: land the YAML + Python loader in Galaxy first (red-to-green: new test passes against existing algebra). Then TS side consumes on top of workflow-graph Phase 2.

### WI-5: `workflow_format_validation` tracking in `collection_semantics.yml` (idea #5)

Extend `collection_semantics.yml` (42 examples) with a new test-tracking key alongside existing `tool_runtime`, `workflow_runtime`, `workflow_editor`.

```yaml
tests:
    tool_runtime:
        api_test: "test_tool_execute.py::test_map_over_collection"
    workflow_runtime:
        framework_test: "collection_semantics_cat_0"
    workflow_editor: "accepts paired data -> data connection"
    workflow_format_validation:
        fixture: "ok_list_paired_to_paired"     # fixture stem in connection_workflows/
        type_cases:                               # optional — which algebra cases map here
          - {op: can_map_over, output: "list:paired", input: "paired"}
```

Notes:

- `fixture` references `connection_workflows/<stem>.gxwf.yml`. Language-neutral: both Python and TS can resolve by stem.
- `type_cases` is optional and only needed for examples that reduce to pure algebra without a workflow fixture.
- Some examples may legitimately have neither (e.g. subtleties that are still runtime-only). Empty `workflow_format_validation: {}` is allowed as a tracking placeholder.

Action items:

1. Add a `collection_semantics.yml` schema/validator pass (already happens for the other keys?) to enforce that referenced fixture stems exist.
2. Sweep all 42 examples, fill in `workflow_format_validation` where coverage exists today. Gaps → new fixtures (folds into WI-6 backlog).
3. Add a one-off Python script `test/unit/tool_util/workflow_state/test_collection_semantics_coverage.py` that cross-checks: every `workflow_format_validation.fixture` → real file; every `.gxwf.yml` fixture → referenced by at least one example (or flagged `orphan: true`).

### WI-6: Convert convertible programmatic tests into fixtures (idea #6)

Walk `test_connection_validation.py` and identify cases that *only* need a workflow + tool defs. Candidates (based on my read of the current file):

- `TestMapOverVariants.test_list_paired_over_paired_or_unpaired`
- `TestMapOverVariants.test_list_list_over_list_paired_or_unpaired`
- `TestMultiDataReduction.test_sample_sheet_to_multi_data_ok` (defer — needs sample_sheet tool, per locked decision #7)
- `TestEndToEnd.test_three_step_chain`
- `TestEndToEnd.test_summary_counts`
- All of `TestSubworkflow.*` — subworkflows are expressible as nested gxformat2 YAML.
- `TestStepMapOver.test_compatible_map_over_from_multiple_inputs`
- `TestStepMapOver.test_mixed_direct_and_mapover`

Each converted test:

1. New `.gxwf.yml` under `connection_workflows/` — ideally the tool IDs it references already exist in functional test tools. If a test needs a synthetic tool shape not present, write a minimal tool XML under `test/functional/tools/` (preferred) or skip the conversion.
2. Sidecar `expected/*.yml` capturing the specific assertions the programmatic test made (`map_over`, `connections[*].status`, `connections[*].mapping`, etc.).
3. Delete the programmatic test once the fixture covers it.

**Keep programmatic** (don't convert):

- `TestConnectionValidation.test_unresolved_tool_skips` — needs an unknown tool id.
- `TestParameterConnections.*` — synthesizes parameter models directly; exercise code paths fixture-loading skips.
- `TestSubworkflow.test_unresolved_inner_tool_graceful` — unknown tool dependency.
- Anything using `ToolOutputInteger` or similar one-offs without a functional test tool.

Non-goal: 100% conversion. The goal is that *every case that naturally fits the fixture shape* gets to TS for free.

---

## Implementation Order

1. **WI-1** (fixture sync) — trivial, unblocks everything.
2. **WI-2** (parsed-tools sync script) — sketch script against current fixtures; `pnpm --filter @galaxy-tool-util/core test` stays green with no consumers yet.
3. **WI-3** (TS loader + `dictVerifyEach`) — tested by snapshot-style "loads N fixtures" test; real consumers arrive with the validator.
4. **WI-4** (type-algebra truth table) — Galaxy side first, then TS after workflow-graph Phase 2 lands. Can proceed in parallel with 1-3.
5. **WI-5** (`workflow_format_validation` keys in `collection_semantics.yml`) — Galaxy-only, no TS dependency. Run anytime.
6. **WI-6** (programmatic → fixture conversion) — after WI-1 so new fixtures immediately sync to TS. Incremental; one commit per batch is fine.

WI-4, WI-5, WI-6 are independent of each other and of the TS validator; sequence by reviewer bandwidth.

---

## Status (2026-04-25)

Galaxy-side foundations landed on `wf_tool_state`. Recap by WI:

### WI-4 — type-algebra truth table

**Done**:
- `test/unit/tool_util/workflow_state/connection_type_cases.yml` exists and drives `test_connection_types.py` as a parametrized loader.
- Ops covered: `can_match`, `can_map_over`, `effective_map_over`, `compatible` (~100 cases).
- Sentinel resolution: `NULL` / `null` / `~` → NULL_COLLECTION_TYPE; `ANY` → ANY_COLLECTION_TYPE. Unquoted in YAML.
- Pydantic schema for `tests.algebra` entries lives in `lib/galaxy/model/dataset_collections/types/semantics.py` (`AlgebraCaseRef`); `op` Literal accepts the four ops above.
- `validate_algebra_refs` in `semantics.check()` ensures every `algebra:` entry in `collection_semantics.yml` matches a row in `connection_type_cases.yml`.

**Remaining**:
- TS-side consumer (`packages/workflow-graph/test/connection-type-cases.test.ts`) and sync target. Blocked on workflow-graph Phase 2 + a sync script — both TS-repo work, no further Galaxy-side blockers.

### WI-5 — `workflow_format_validation` + `algebra` tracking

**Done**:
- `WorkflowFormatValidationTest` and `AlgebraCaseRef` Pydantic models in `semantics.py` extend `ExampleTests` with `workflow_format_validation` and `algebra` keys.
- `connection_workflows_dir()` and `connection_type_cases_path()` helpers + `load_examples()` exposed (was `_load_examples`).
- Cross-checks: `validate_workflow_format_validation_refs` (fixture stem → real .gxwf.yml on disk) and `validate_algebra_refs` (algebra entries → truth-table rows) both wired into `semantics.check()`.
- `test/unit/tool_util/workflow_state/test_collection_semantics_coverage.py` adds two-direction coverage tests:
  - Every `.gxwf.yml` fixture is referenced by an example or in `KNOWN_ORPHANS` (with reasons).
  - Every example has `algebra` or `workflow_format_validation` coverage, or is in `EXPECTED_NEITHER` (with reasons).
- 40/42 examples covered by `algebra:`; 7/42 covered by `workflow_format_validation:`. Two examples in `EXPECTED_NEITHER` (`BASIC_MAPPING_INCLUDING_SINGLE_DATASET`, `BASIC_MAPPING_TWO_INPUTS_WITH_IDENTICAL_STRUCTURE`) — runtime-only validity claims that don't reduce to pure algebra or fixture-loadable scenarios.
- `LIST_NOT_MATCHES_SAMPLE_SHEET` and `LIST_PAIRED_NOT_MATCHES_SAMPLE_SHEET_PAIRED` promoted to algebra coverage after the post-rebase asymmetry guard (`startswith("sample_sheet")` in `accepts` / `can_map_over`) made them enforceable.

**Remaining**:
- Sweep the 35 examples without `workflow_format_validation:` and decide which warrant a fixture vs. staying algebra-only. Algebra coverage is the cheaper validation; fixture coverage exercises the full graph + tool resolution. Most pure-algebra examples likely don't need a fixture, but `MAPPING_LIST_PAIRED_OVER_*`, multi-input, and subworkflow scenarios benefit from one.

### WI-6 — programmatic → fixture conversion

**Done**:
- 15 fixtures live under `connection_workflows/` (`fail_*`, `ok_*`).

**Remaining**:
- 23 programmatic test methods still in `test_connection_validation.py`. Candidates from the original list:
  - `TestMapOverVariants.test_list_paired_over_paired_or_unpaired`
  - `TestMapOverVariants.test_list_list_over_list_paired_or_unpaired`
  - `TestEndToEnd.test_three_step_chain` — already partly mirrored by `ok_chain_map_over_propagates`; verify and delete?
  - `TestEndToEnd.test_summary_counts`
  - `TestSubworkflow.*` (most)
  - `TestStepMapOver.test_compatible_map_over_from_multiple_inputs` — likely fixturable
  - `TestStepMapOver.test_mixed_direct_and_mapover` — likely fixturable
- Keep programmatic per the original plan: `TestParameterConnections.*`, `test_unresolved_*`, `TestSubworkflow.test_unresolved_inner_tool_graceful`, plus the new `TestStepMapOver.test_compatible_sibling_map_overs_with_different_strings` (regression test, fits a fixture but adds little parity value).

### Out-of-scope work that landed alongside

- **Upstream rebase** (see `CONNECTION_REBASE_PLAN.md`): three commits from `map_match_logic` rebased onto `wf_tool_state` — `accepts`/`compatible` split, `can_map_over` rename, docstring reframe. Ripple-effect renames in `connection_types.py` / `connection_validation.py` followed.
- **`compatible()` free function + `_resolve_step_map_over` rewrite**: the followup-refactor section of the rebase plan, now committed (`0ee1effdbf`). Sibling map-over contributions now resolve via symmetric `compatible()` instead of raw string equality. TS truth-table consumer will need an `op: compatible` handler when it lands.

---

## File / Path Cheatsheet

### Galaxy repo (source of truth)

```
test/unit/tool_util/workflow_state/
├── connection_workflows/
│   ├── *.gxwf.yml                       # synced
│   └── expected/*.yml                   # synced, verbatim schema
├── connection_type_cases.yml            # NEW (WI-4), synced
├── test_connection_types.py             # slimmed to sentinel tests + YAML loader (WI-4)
├── test_connection_validation.py        # shrinks as fixtures convert (WI-6)
└── test_collection_semantics_coverage.py  # NEW (WI-5)

lib/galaxy/model/dataset_collections/types/collection_semantics.yml
    # gains `workflow_format_validation:` entries (WI-5)
```

### TS repo (this repo)

```
packages/core/test/fixtures/connection_workflows/
├── *.gxwf.yml                           # from sync-connection-workflows
├── expected/*.yml
├── parsed_tools/
│   ├── <tool_id>.json                   # from sync-parsed-tools
│   └── parsed_tools.sha256

packages/core/src/testing/ (or test/helpers/)
├── load-connection-fixtures.ts          # WI-3
├── parsed-tool-cache.ts                 # WI-3
└── dict-verify-each.ts                  # WI-3

packages/workflow-graph/test/fixtures/connection_type_cases.yml   # WI-4
packages/workflow-graph/test/connection-type-cases.test.ts        # WI-4

scripts/sync-parsed-tools.py             # WI-2
Makefile                                 # +targets: sync-connection-workflows, sync-parsed-tools, sync-connection-type-cases
```

---

## Risks / Open Points

- **ParsedTool serialization parity.** `parsed_tool.model_dump_json()` must produce JSON that decodes cleanly through the TS Effect `ParsedTool` schema. Verify once against a known-good tool (e.g. `fastqc-parsed-tool.json` already in `packages/core/test/fixtures/`) before committing the whole cache. If mismatches surface, the fix is on the serialization flags, not the schema.
- **Functional test tool location.** `functional_test_tool_directory()` resolves to `$GALAXY_ROOT/test/functional/tools/`. Script must handle recursive search (some tools live under subdirs — see `_find_tool_source` in `functional_tool_info.py`).
- **`dict_verify_each` semantics.** Confirm the exact Python implementation (`test/unit/tool_util/workflow_state/util.py` presumably) before porting — there may be a "skip if missing" or "regex match" knob I haven't seen.
- **Fixture drift during conversion (WI-6).** Converted fixtures must assert *at least as much* as the programmatic test they replace. Review checklist: for each deletion, the sidecar explicitly captures every non-trivial assertion the Python test made.
- **`collection_semantics.yml` schema.** If there's a schema file for it (pydantic or similar), extend that too. Haven't located it yet — first thing WI-5 should check.

## Unresolved Questions

- `dict_verify_each` — extra features beyond `target`/`value` (e.g. absence check, regex)?
- Should synced `parsed_tools/` be gitignored or committed? Existing `packages/core/test/fixtures/golden/*.json` is committed — follow that.
- Where exactly does `test/helpers/` vs `src/testing/` land for WI-3 — do we want the loader importable from other packages? If yes: `src/testing/` + subpath export. If it's only for the future connection-validation package in this monorepo: internal helpers are fine.
- Future new package for the TS validator itself — `@galaxy-tool-util/connection-validation`? (Deferred to the validator plan, not this one.)
- WI-5 fixture sweep — do we want fixture coverage for *every* algebra-coverable example (more sync surface, lockstep with TS validator), or only for cases that need full graph/tool resolution (`MAPPING_LIST_PAIRED_OVER_*`, multi-input, subworkflow)?
- WI-6 — convert subworkflow tests to fixtures? Fixture format supports inline subworkflows but the sidecar assertions get nested-step-prefix-heavy. May be worth keeping subworkflow coverage programmatic.
