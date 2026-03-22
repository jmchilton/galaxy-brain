# Workflow Tool State: Current Implementation State

**Branch:** `wf_tool_state` (rebased on `fix_paired_unpaired_map_over`)
**Date:** 2026-03-22
**Scope:** 68 commits, 118 files changed, ~13,770 lines added / ~310 deleted

## What Exists

A new `galaxy.tool_util.workflow_state` package in `galaxy-tool-util` providing schema-aware workflow tool state validation, conversion, and cleaning — entirely independent of Galaxy's runtime. Five CLI tools are registered as console_scripts. The package includes a tool metadata cache backed by ToolShed 2.0 API, a recursive state tree walker, native and Format2 validators, a native→Format2 state converter with a schema-aware reverse path, a stale-key cleaner with classification/policy knobs, a round-trip validator with structured diff classification, and a format2 exporter. New: `galaxy.tool_util.collections` provides `CollectionTypeDescription` extracted from galaxy-data for offline collection type reasoning.

**IWC corpus status: 120/120 workflows pass roundtrip** (71 clean, 49 with benign diffs), 0 failures. 120/120 convert all steps successfully.

---

## Package Layout

All under `packages/tool_util/galaxy/tool_util/workflow_state/`:

| Module | Responsibility |
|---|---|
| `__init__.py` | Public API: `convert_state_to_format2`, `Format2State`, `ConversionValidationFailure`, `validate_workflow`, `GetToolInfo` |
| `_types.py` | `NativeWorkflowDict`, `Format2WorkflowDict`, `WorkflowFormat`, `GetToolInfo` protocol |
| `_walker.py` | `walk_native_state()` — recursive traversal of native tool_state with callback pattern. Handles conditionals (branch selection via test value, no `__current_case__` dependency), repeats, sections. Inactive conditionals (no matching branch) walk only the test parameter. |
| `convert.py` | `convert_state_to_format2()` / `convert_state_to_format2_using()`. Forward conversion: native→format2. Reverse: `encode_state_to_native()` walks format2 state with tool definitions, reverses multiple-select lists to comma strings, `json.dumps` each value. Callback factories: `make_convert_tool_state()`, `make_encode_tool_state()` for gxformat2 protocol injection. |
| `validation_native.py` | `validate_native_step_against()` — validates a native step's tool_state against a ParsedTool. Decodes double-encoded values, walks state tree with type-checking callback (integers, floats, selects against declared options, booleans, data columns, data params). |
| `validation_format2.py` | `validate_step_against()` — validates Format2 step state using Pydantic `WorkflowStepToolState` / `WorkflowStepLinkedToolState` models. `merge_inputs()` injects `ConnectedValue` markers from `in`/`connect` into state for linked validation. |
| `validate.py` | Orchestrator: `validate_workflow_cli()` detects format, dispatches to native or format2 path. `validate_tree()` for directory-level validation. Result types (`StepResult`, `WorkflowValidationResult`, `TreeValidationReport`). Formatters: text, JSON, Markdown. |
| `clean.py` | `clean_stale_state()` / `strip_stale_keys()` — removes tool_state keys not present in current tool definition. Handles dict-form tool_state (after bookkeeping strip). Supports stale key classification with `--allow`/`--deny`/`--preserve`/`--strip` policy knobs. Recursive, handles containers. Supports dry-run, in-place, and adjacent-file output. Result types, formatters. |
| `roundtrip.py` | Full round-trip validation: native→format2→native→compare. Structured `StepDiff` with `DiffType`/`DiffSeverity` classification. Benign artifact detection (all-None sections, empty repeats, connection-only sections, multiple-select normalization). Step matching by label+type with ID remapping for gxformat2 reordering. Comment comparison with child_steps remapping. `--strict` flag. Uses gxformat2 callback protocols for schema-aware conversion on both paths. |
| `cache.py` | Tool cache operations: `populate_cache()` (from workflow/directory), `add_tool()`, list/info/clear. Options models for each operation. |
| `toolshed_tool_info.py` | `ToolShedGetToolInfo` — fetches `ParsedTool` from ToolShed 2.0 TRS API, caches as JSON on filesystem. `CacheIndex` for provenance tracking (index.json). `CombinedGetToolInfo` tries ToolShed first, falls back to stock tools. |
| `workflow_tools.py` | `extract_toolshed_tools()`, `extract_all_tools()`, `load_workflow()`, format detection |
| `workflow_tree.py` | `discover_workflows()` — directory traversal with content-based detection (parses JSON/YAML, checks `a_galaxy_workflow` / `class: GalaxyWorkflow`). Discovers `.ga`, `.json`, `.gxwf.yml`, `.gxwf.yaml`, `.yml`, `.yaml`. Category grouping. `load_workflow_safe()`. |
| `connection_types.py` | Adapter over `galaxy.tool_util.collections.CollectionTypeDescription` adding sentinel types (NULL/ANY) and connection-validation-specific free functions (`can_match`, `can_map_over`, `effective_map_over`). Phase 1 of connection validation. |
| `connection_graph.py` | Connection graph builder — resolves output types, propagates map-over through multi-data reduction, strips map-over prefix for `collection_type_source`. |
| `connection_validation.py` | Per-connection type validation. Synthesizes `when` input for conditional step execution. |
| `_cli_common.py` | Shared argparse helpers: `--tool-source-cache-dir`, `-v`, `--tool-source`, `--populate-cache` |
| `_report_models.py` | Pydantic report models and shared output infra extracted from validate/clean. |
| `scripts/` | Five CLI entry points (see below) |

### New: `galaxy.tool_util.collections`

Extracted from `galaxy.model.dataset_collections.type_description` (galaxy-data) into `galaxy-tool-util` for shared use. Contains the pure-logic core of `CollectionTypeDescription`, `CollectionTypeDescriptionFactory`, `COLLECTION_TYPE_REGEX`, `map_over_collection_type()`, `_normalize_collection_type()`. The galaxy-data module is now a thin re-export shim that adds back `rank_type_plugin()` and the registry default. See COLLECTION_TYPE_REACTORING_PLAN.md.

---

## CLI Tools

### `galaxy-tool-cache` — Manage local tool metadata cache

Subcommands:

```
galaxy-tool-cache populate-workflow <path>   # cache all tools referenced by workflow(s)
galaxy-tool-cache add <tool_id>              # cache single tool (toolshed ID, TRS ID, or stock)
galaxy-tool-cache add-local <xml_path>       # cache from local tool XML
galaxy-tool-cache list [--json]              # list cached tools
galaxy-tool-cache info <trs_id>              # show details for cached tool
galaxy-tool-cache clear [prefix]             # clear cache (all or by prefix)
```

Common options: `--tool-source {auto,api,galaxy}`, `--tool-source-cache-dir DIR`, `-v`

Cache location defaults to `$GALAXY_TOOL_CACHE_DIR` or `~/.galaxy/tool_info_cache/`.

### `galaxy-workflow-validate` — Validate workflow tool_state

```
galaxy-workflow-validate <path>              # validate .ga or .gxwf.yml file or directory
```

Options:
- `--populate-cache` — auto-populate tool cache before validating
- `--tool-source {auto,api,galaxy}` — where to fetch tool defs
- `--strict` — treat skips (missing tool defs) as failures
- `--summary` — show only summary counts
- `--strip-bookkeeping` — strip bookkeeping keys before validation
- `--report-json [FILE]` / `--report-markdown [FILE]` — structured output
- Exit codes: 0=pass, 1=failures, 2=skips (with --strict)

Works on single files or entire directory trees. Auto-detects native vs Format2. Recurses into subworkflows. Outputs unencoded tool_state dicts for readability.

### `galaxy-workflow-clean-stale-state` — Remove stale tool_state keys

```
galaxy-workflow-clean-stale-state <path>     # dry-run by default
```

Options:
- `--output-template TEMPLATE` — write output (e.g. `{path}` for in-place, `{dir}/{stem}.cleaned{ext}` for adjacent). Absent = dry-run.
- `--diff` — show unified diff
- `--strip-bookkeeping` — strip bookkeeping keys
- `--allow` / `--deny` / `--preserve` / `--strip` — stale key classification policy knobs
- `--populate-cache` / `--tool-source` — same as above
- `--report-json [FILE]` / `--report-markdown [FILE]`

Outputs unencoded tool_state dicts for readability.

### `galaxy-workflow-roundtrip-validate` — Round-trip native→Format2 validation

Validates workflows by round-tripping native→Format2→native and comparing for functional and graphical equivalence. Cleans stale keys and strips bookkeeping before conversion. Uses gxformat2 callback protocols for schema-aware conversion on both export and import paths.

Output includes structured diffs with severity classification:
- **Error** — real data loss or corruption
- **Benign** — known representation artifacts (all-None sections dropped, empty repeats dropped, connection-only sections dropped, multiple-select scalar→list normalization)

Options:
- `--strict` — treat benign diffs as errors
- `--strip-bookkeeping`, `--populate-cache`, `--tool-source`, `-v`
- `--output-native FILE` / `--output-format2 FILE` — write intermediate artifacts

Summary: `120 OK (71 clean, 49 with benign diffs), 0 FAIL (total 120 workflows)`

### `galaxy-workflow-export-format2` — Schema-aware Format2 export

Exports native .ga workflows to Format2 (.gxwf.yml) using the toolbox for schema-aware conversion. Introduces `ToolInputs` protocol for toolbox-mediated export.

---

## Core Abstractions

### `GetToolInfo` Protocol
Interface for fetching `ParsedTool` by `(tool_id, tool_version)`. Implementations: `ToolShedGetToolInfo` (API + filesystem cache), `CombinedGetToolInfo` (ToolShed + stock tools fallback).

### `ToolInputs` Protocol
Interface for toolbox-mediated format2 export. Used by `galaxy-workflow-export-format2` CLI.

### gxformat2 Callback Protocols
Schema-aware state conversion injected into gxformat2 via optional callbacks:
- **`ConvertToolStateFn`** — passed to `from_galaxy_native(convert_tool_state=...)`. Converts native step tool_state to format2 `state` dict. Connections handled separately by gxformat2.
- **`NativeStateEncoderFn`** — set on `ImportOptions.native_state_encoder`. Encodes format2 `state` back to native tool_state with correct types (multiple-select lists → comma strings, etc.). `setup_connected_values()` runs before the callback.

Factory functions: `make_convert_tool_state(get_tool_info)`, `make_encode_tool_state(get_tool_info)`.

### `walk_native_state()` — The Reusable Walker
Recursive traversal of native tool_state dicts that correctly handles conditionals, repeats, and sections. Accepts a leaf callback — used by:
- **convert.py**: callback transforms values and tracks connections
- **validation_native.py**: callback type-checks values and injects ConnectedValue markers
- **clean.py**: uses the walker's unknown-key detection mode

Conditional branch selection: uses explicit test value only — `__current_case__` is no longer consulted (stripped before walking). When no branch matches the test value (inactive conditional), walks only the test parameter. Empty when branches are generated for undeclared test parameter values.

### Validation Model Duality
- **Native path**: walk_native_state() + per-parameter validation callback (imperative)
- **Format2 path**: Pydantic `WorkflowStepToolState` / `WorkflowStepLinkedToolState` models (declarative)

Both paths leverage the existing `galaxy.tool_util.parameters` infrastructure.

### State Conversion Pipeline
`convert_state_to_format2()`:
1. Fetch ParsedTool via GetToolInfo
2. Validate native step (pre-conversion check)
3. Walk native state with `convert_leaf` callback → produces Format2 `state` dict + `in` connections dict
4. Validate converted result against `WorkflowStepLinkedToolState` (post-conversion check)
5. Return `Format2State(state=..., in=...)`

`encode_state_to_native()` (reverse):
1. Walk format2 state dict with tool definitions
2. Reverse multiple-select lists → comma-delimited strings
3. Reverse data column ints → strings
4. `json.dumps` each value for native double-encoding
5. ConnectedValue markers passed through

### Structured Diff Classification
`StepDiff` dataclass with `DiffType` (value_mismatch, missing_in_roundtrip, connection_mismatch, position/label/annotation/comment_mismatch) and `DiffSeverity` (error/benign). Benign patterns:
- All-None section omitted by format2 export
- Empty repeat/list omitted by format2 export
- Connection-only section omitted (connections in `in` block)
- Multiple-select scalar normalized to list

### CollectionTypeDescription (extracted to tool-util)
Pure-logic collection type abstraction providing: `can_match_type()`, `has_subcollections_of_type()`, `effective_collection_type()`, `map_over_collection_type()`, `_normalize_collection_type()`. Used by `connection_types.py` for offline workflow connection type validation. Compound `:paired_or_unpaired` handling fixed in `has_subcollections_of_type` and `effective_collection_type`.

---

## Other Changes Outside the Package

- **`hidden_data` params modeled as optional data in tool meta-models** — `parameters/factory.py` now treats `hidden_data` like `data` in Pydantic model generation
- **`lib/galaxy/managers/workflows.py`** — Format2 export integration, clean query params on workflow download API endpoint
- **Parameter visitor refactoring** in `parameters/visitor.py` and `tool_util_models/parameters.py`
- **`galaxy.model.dataset_collections.type_description`** — now a thin re-export shim over `galaxy.tool_util.collections`
- **`GALAXY_TEST_STRIP_BOOKKEEPING_FROM_WORKFLOWS`** env var enabled in CI
- **ToolShed API fixes** — missing stock tool sources for converters and version mismatches
- **Workflow download API** — added clean query params to endpoint
- **Pydantic model fixes:**
  - `safe_field_name` + alias applied to Section/Conditional/Repeat `pydantic_template` (QIIME2 underscore-prefixed parameter names)
  - `DataColumnParameterModel`: added `gx_data_column` case to converter (str→int/list), `workflow_step_linked` support with `allow_connected_value`
  - `ConditionalParameterModel`: generate empty when branches for undeclared test parameter values (single-when conditionals)
- **API artifact tests** in `lib/galaxy_test/api/test_wf_conversion_artifacts.py` — 6 workflow tests proving Galaxy handles format2 conversion artifacts (multiple-select lists, absent sections, absent repeats, boolean normalization)
- **Tool execution tests** in `lib/galaxy_test/api/test_tool_execute.py` — 5 direct API tests × 3 input formats for repeat/select artifacts

---

## Test Coverage

### Key Test Suites

| Suite | What It Covers |
|---|---|
| `test_roundtrip.py` | Native→Format2→Native round-trip equivalence. Sweeps 70+ framework test workflows. Classifies failures. Roundtrip logic extracted to `roundtrip.py`. |
| `test_workflow_tree.py` | Phased tests: discovery → validation → cleaning → cache population. Tests report formatting (text, JSON, Markdown). |
| `test_tool_cache.py` | Tool ID parsing, cache CRUD, persistence, corrupted index recovery, CLI parser testing. |
| `test_format2_subworkflow_validation.py` | Recursive subworkflow validation (3+ nesting levels), step prefix naming ("0.0.0"). |
| `test_connection_types.py` | Collection type matching adapter tests — `can_match`, `can_map_over`, `effective_map_over`, sentinel types, `paired_or_unpaired` asymmetries, `sample_sheet` normalization. Ported from TS `terminals.test.ts` and `collection_semantics.yml`. |
| `test_modules.py` | Workflow step modules, state computation, data I/O. |
| `test_parameter_specification.py` | Pydantic model validation for all parameter types × all state representations. New entries: `gx_data_column` workflow_step_linked, underscore-named section/conditional, single-when conditional. |
| `test_wf_conversion_artifacts.py` | API workflow tests for format2→native conversion artifacts — proves Galaxy executes roundtripped workflows correctly. |
| `test_tool_execute.py` | Direct tool execution tests for repeat/select conversion artifacts across 3 API input formats. |

### IWC Test Workflows
11 real-world IWC workflows added under `test/unit/workflows/iwc/` (RNA-seq, ChIP-seq, variant calling, mass spec, image analysis, etc.) — used as regression data for discovery and validation.

### Test data: `lib/galaxy_test/base/data/wf_conversion/`
Format2 source workflows + converted .ga files with baked-in artifacts for API testing. README documents provenance and how to add more.

---

## Deliverable Status vs PROBLEM_AND_GOAL.md

| Deliverable | Status | Notes |
|---|---|---|
| **D1: State Encoding Conversion** | **Complete** | `convert.py` + `_walker.py`. Forward (native→format2) and reverse (format2→native) via `encode_state_to_native()`. Handles all param types including `gx_data_column`. gxformat2 callback protocols for injection on both paths. |
| **D2: State Validation** | **Complete** | `validation_native.py` (native), `validation_format2.py` (format2 + connection merging). Both use existing Pydantic infra. |
| **D3: Native Workflow Validator** | **Complete** | `validate.py` orchestrator, native path. Per-step validation with structured results. |
| **D4: Format2 Workflow Validator** | **Complete** | `validate.py` orchestrator, format2 path. Validates `state` + `in` connections. |
| **D5: Round-Trip Validation** | **Complete** | `galaxy-workflow-roundtrip-validate` CLI. Full native→format2→native pipeline with structured diff classification (error/benign severity), graphical equivalence checking (positions, labels, annotations, comments), step ID remapping for gxformat2 reordering. `--strict` flag. **120/120 IWC workflows pass** (71 clean, 49 benign diffs). |
| **D6: IWC Workflow State Verification** | **Complete** | Full IWC corpus: 120 workflows, all convert and pass roundtrip. Stale key cleaning integrated into roundtrip pipeline. API tests confirm Galaxy handles all conversion artifacts. |
| **D7: IWC Lint-on-Merge** | Not started | D6 baseline established. CI integration in IWC repo still needed. |
| **D8: Format2 Export from Galaxy** | **Complete** | `galaxy-workflow-export-format2` CLI for schema-aware export via toolbox. `ToolInputs` protocol introduced. Clean query params added to workflow download API. Format2 API export via toolbox integrated. |
| **D9: Connection Validation** | In progress | Phase 0 (CollectionTypeDescription extraction + paired_or_unpaired bugfix), Phase 1 (connection_types.py adapter + tests), and Phase 2 (connection_graph.py builder with map-over propagation, multi-data reduction, conditional when synthesis) complete. Phases 3-5 (per-connection validation engine, CLI integration, collection_semantics.yml tracking) not started. See CONNECTION_VALIDATION.md. |

### Bonus: Stale State Cleaning
Not in the original deliverables but emerged as a practical need — `galaxy-workflow-clean-stale-state` removes obsolete tool_state keys using tool definitions. Now includes stale key classification with `--allow`/`--deny`/`--preserve`/`--strip` policy knobs. Integrated into roundtrip pipeline (strip bookkeeping + clean stale before conversion).

### Bonus: API Artifact Tests
Conversion artifact safety verified through Galaxy API tests — multiple-select list form, absent all-None sections, absent empty repeats, and boolean case normalization all execute correctly. Key finding: absent repeats work when tool templates use `len()` and `#for` (not direct indexing).

---

## Recent Work (since 2026-03-18)

### gxformat2 Schema-Aware Callback Protocols (PLAN_GXFORMAT2_SCHEMA_PROTOCOL.md)
Symmetric `ConvertToolStateFn` / `NativeStateEncoderFn` callbacks injected into gxformat2's `from_galaxy_native()` and `python_to_workflow()`. gxformat2 branch: `state_callbacks`. Galaxy side: `make_convert_tool_state()` and `make_encode_tool_state()` factories. Replaces the old post-processing hack (`replace_tool_state_with_format2_state`).

### Roundtrip Validation Overhaul
- **Graphical equivalence** — compare positions, labels, annotations, and workflow comments
- **Step ID remapping** — match steps by label+type (3-pass) to handle gxformat2 reordering
- **Stale key cleaning** — strip bookkeeping + clean stale keys before conversion
- **Walker simplification** — removed all `__current_case__` handling, conditional branch selection uses only test parameter value
- **Structured diffs** — `StepDiff` with `DiffType`/`DiffSeverity`, benign pattern classification
- **`--strict` flag** — treat benign diffs as errors
- **Workflow discovery** — content-based detection (parse JSON/YAML), supports .json/.yml/.yaml in addition to .ga/.gxwf.yml
- **Comment child_steps remapping** — frame comment step references remapped through step ID mapping

### Conversion Fixes
- **`gx_data_column`** — str→int (single), comma-string→list[int] (multiple) in forward conversion; reverse preserves list form
- **Multiple select reverse** — return `[str(v)]` list not `",".join()` comma string (native stores lists)
- **QIIME2 underscore field names** — `safe_field_name` + alias on Section/Conditional/Repeat `pydantic_template`, plus conditional test parameter field aliasing inside When models
- **Single-when conditionals** — generate empty when branches for undeclared test parameter values across all state representations
- **`DataColumnParameterModel`** — `workflow_step_linked` support with `allow_connected_value`
- **`clean_stale_state`** — handle dict-form tool_state after bookkeeping strip

### Connection Validation Progress
- `connection_graph.py` — graph builder with output type resolution
- Map-over propagation through multi-data reduction (`list:list` → `collapse_dataset` → downstream)
- Strip map-over prefix when resolving `collection_type_source`
- Synthesize `when` input for conditional step execution
- Model non-data connections with unified type field

### API Artifact Tests (PLAN_ROUNDTRIP_ARTIFACT_TESTS.md)
- 6 workflow API tests + 5 tool execution tests proving Galaxy handles all conversion artifacts
- Test data in `lib/galaxy_test/base/data/wf_conversion/` with format2 sources and converted .ga files
- Key finding: absent repeats safe with good templates; `visit_input_values` defaults to `[]`

### Key Commits (since 2026-03-18)
- `f3093a6c6c` — Generate empty when branches for single-when conditionals
- `c7ab158a34` — Structured diff classification with benign severity
- `c8a0705437` — Strip bookkeeping before stale cleaning, simplify conditional walker
- `390f3b7a9f` — gx_data_column conversion, underscore field names, step ID mapping
- `8345935718` — Wire gxformat2 state callbacks, implement encode_state_to_native
- `0406f008e1` — API tests for format2→native conversion artifacts
- `ffeeceab34` — Compare graphical equivalence in roundtrip, fix step reordering
- `966d88efcf` — Synthesize 'when' input for conditional step execution
- `57e7140937` — Propagate map-over through multi-data reduction

---

## What You Can Do Today

1. **Cache tool metadata** from ToolShed 2.0 for any workflow or individual tool
2. **Validate any .ga or .gxwf.yml workflow** against current tool definitions — get structured pass/fail/skip results per step, in text, JSON, or Markdown
3. **Validate entire directory trees** of workflows (e.g. IWC repo) in one command
4. **Clean stale keys** from native workflows — with classification and policy knobs for fine-grained control
5. **Convert native tool_state to Format2 state** programmatically and via CLI (`galaxy-workflow-export-format2`)
6. **Run round-trip equivalence validation** on any workflow or directory — **120/120 IWC workflows pass** with structured diff classification (error vs benign severity)
7. **Validate collection type compatibility** between workflow connections via `connection_types.py` and `connection_graph.py` (library API)
8. **Strip bookkeeping keys** from workflows during validation and cleaning
9. **Schema-aware format2→native encoding** via gxformat2 callback protocol — correct type handling for multiple selects, data columns, etc.

## What's Not Done Yet

- **Connection validation** (D9) — Phases 3-5: per-connection validation engine, CLI `--connections` flag, collection_semantics.yml test tracking
- **IWC lint-on-merge** (D7) — D6 baseline established, CI integration in IWC repo still needed
- **gxformat2 release** — callback protocol PR not yet merged/released, Galaxy pin not bumped
- No **Format2→native conversion** as a standalone operation (reverse encoding exists but only within roundtrip pipeline)
- External subworkflow references (string `run` keys) are skipped, not resolved
- `connection_types.py` F2 bug: `has_subcollections_of_type` `endswith` false positive for `"list:paired_or_unpaired".endswith("paired")` — marked xfail, needs colon-prefix fix
- Absent conditional routing — conditionals without `is_default_when` don't allow absent (`{}`) in the Pydantic model; depends on test parameter defaults
