# Workflow Tool State: Current Implementation State

**Branch:** `wf_tool_state` (rebased on `dev`)
**Date:** 2026-05-22
**Scope:** 84 commits above merge base, ~285 files changed, ~36,600 lines added / ~390 deleted (test fixtures, Jinja templates, report goldens, and IWC golden cache data dominate the insert count)

## What Exists

A `galaxy.tool_util.workflow_state` package in `galaxy-tool-util` providing schema-aware workflow tool state validation, conversion, cleaning, linting, round-trip verification, and Tool Shed search --- entirely independent of Galaxy's runtime. A unified `gxwf` CLI registers every operation as a subcommand and forwards to gxformat2 for `viz` / `abstract-export` / `mermaid`; the underlying `gxwf-*` standalone scripts remain registered as console_scripts (7 single-file + 7 tree variants), plus `galaxy-tool-cache` for tool metadata management. The package sits atop gxformat2's normalized Pydantic models (`NormalizedNativeWorkflow`, `NormalizedNativeStep`, `NormalizedFormat2`) and communicates with gxformat2 via callback protocols (`state_encode_to_format2`, `state_encode_to_native`) for schema-aware format conversion.

Also includes: a tool metadata cache backed by ToolShed 2.0 API, a recursive state tree walker for both native and format2 encodings, native and format2 validators, a workflow-test-file validator, a native-to-format2 state converter with a schema-aware reverse path, a stale-key cleaner with classification/policy knobs, a round-trip validator with structured diff classification and Pydantic report models, a format2 exporter, a format2-to-native importer, a two-level JSON Schema validation backend, legacy encoding/parameter detection, workflow prechecking, Tool Shed search/repo-search/tool-versions/tool-revisions (TypeScript-parity HTTP client + models), Jinja2-templated tree reports, and a generic tree orchestrator for batch operations.

`galaxy.tool_util.collections` provides `CollectionTypeDescription` extracted from galaxy-data for offline collection type reasoning.

**IWC corpus status: 120/120 workflows pass roundtrip** (71 clean, 49 with benign diffs), 0 failures. 120/120 convert all steps successfully. *(Number reflects the last full sweep; gated on `GALAXY_TEST_IWC_DIRECTORY`, not re-run as part of this doc refresh.)*

---

## Package Layout

All under `lib/galaxy/tool_util/workflow_state/`:

| Module | Responsibility |
|---|---|
| `__init__.py` | Public API: `convert_state_to_format2`, `Format2State`, `ConversionValidationFailure`, `validate_workflow`, `export_workflow_to_format2`, `GetToolInfo`, `ToolInputs`, plus library entry points `validate_single`, `clean_single`, `roundtrip_single`, `export_single`, `lint_single` |
| `_types.py` | `NativeWorkflowDict`, `Format2WorkflowDict`, `WorkflowFormat`, `GetToolInfo` protocol |
| `_util.py` | Shared helpers: `coerce_select_value`, `is_connected_or_runtime`, `step_connected_paths`, `step_tool_state`, `step_input_connections`, `StepLike` union type, `decode_double_encoded_values` |
| `_walker.py` | `walk_native_state()` and `walk_format2_state()` --- recursive traversal of tool_state dicts with callback pattern. Handles conditionals (branch selection via test value, no `__current_case__` dependency), repeats, sections. |
| `_state_merge.py` | `inject_connections_into_state()` --- unified ConnectedValue marker injection for format2 validation and conversion. Param-first tree walk handles conditionals, repeats, sections, and leaf params. |
| `_encoding.py` | Pre-check helpers for `--strict-encoding` and `--strict-structure`: structural shape validation and legacy-encoding detection on raw workflow dicts. Fails fast before normalization with stage-specific error messages. |
| `_cli_common.py` | `ToolCacheOptions` base model, `build_base_parser()`, `cli_main()`, `setup_tool_info()`, `add_report_args()`, `--strict-{structure,encoding,state}` plumbing, `--output-schema` wiring --- shared CLI infrastructure |
| `_tree_orchestrator.py` | `collect_tree()` / `run_tree()` generic discover-load-process-aggregate loop. `TreeContext`, `WorkflowOutcome`, `TreeResult`, `skip_workflow()`. |
| `_report_models.py` | Pydantic report models: `WorkflowResultBase`, `WorkflowValidationResult`, `StepResult`, `StepDiff`, `SingleCleanReport`, `SingleRoundTripReport` (now carry before/after content), unified lint report bases. |
| `_report_output.py` | Shared output infrastructure for CLI report emission (JSON/Markdown/text routing) |
| `_report_templates.py` | Jinja2 environment for tree-report markdown rendering. Templates live in `templates/reports/`; rendered exclusively against `model_dump(by_alias=True, mode="json")`. Replaced hand-written Python markdown formatters. |
| `templates/reports/` | Jinja2 templates: `validate_tree.md.j2`, `validate_tests_tree.md.j2`, `clean_tree.md.j2`, `export_tree.md.j2`, `lint_tree.md.j2`, `roundtrip_tree.md.j2`, `to_native_tree.md.j2`, plus `_macros.md.j2` and `connection_section.md.j2`. |
| `convert.py` | Forward: `convert_state_to_format2()` --- native to format2 with pre/post validation. Reverse: `encode_state_to_native()` --- format2 to native via `walk_format2_state`. Callback factories: `make_convert_tool_state()`, `make_encode_tool_state()`. |
| `validation.py` | Router: dispatches to format2 or native validation based on format detection |
| `validation_native.py` | `validate_native_step_against()` --- validates native tool_state via `WorkflowStepNativeToolState.model_validate()` with connection injection. `--clean` support for pre-validation cleanup. `get_parsed_tool_for_native_step()`. |
| `validation_format2.py` | `validate_format2_state()` --- shared validation function used by both convert.py and direct format2 validation. Validates against `WorkflowStepToolState`, injects connections, validates against `WorkflowStepLinkedToolState`. |
| `validation_json_schema.py` | Two-level JSON Schema validation: Level 1 structural (workflow shape) + Level 2 per-step tool state. Also: `validate_native_workflow_json_schema()` for native .ga per-step validation using `WorkflowStepNativeToolState` schemas. For external tooling (TypeScript, VS Code, CI) that can't use the Python Pydantic models. |
| `validation_tests.py` | Adapter over `galaxy.tool_util_models.Tests.model_validate` for workflow-test files (`*-tests.yml` / `*-test.yml` / `*.gxwf-tests.yml`). Flattens `ValidationError` into structured diagnostics. |
| `validate.py` | Orchestrator: `validate_workflow_cli()` with unified state + connection validation pipeline. Single-file and tree modes. `--mode json-schema` backend. Structured results, formatters. |
| `validate_tests.py` | Orchestrator for workflow-test-file validation. Schema-only (no tool cache). Parallel to `validate.py`. Single-file and tree modes. |
| `connection_types.py` | Adapter over `CollectionTypeDescription` adding sentinel types (NULL/ANY) and connection-validation-specific free functions. |
| `connection_graph.py` | Connection graph builder --- resolves output types, propagates map-over through multi-data reduction, strips map-over prefix for `collection_type_source`. Uses `NormalizedNativeWorkflow`. |
| `connection_validation.py` | Per-connection type validation. Synthesizes `when` input for conditional step execution. |
| `clean.py` | `clean_stale_state()` / `strip_stale_keys()` --- removes tool_state keys not in current tool definition. Defaults to full clean policy. Policy knobs: `--allow`/`--deny`/`--preserve`/`--strip`. Structural step cleaning, format2 support, `--skip-uuid`. Single-file and tree modes. |
| `roundtrip.py` | Full round-trip: native to format2 to native to compare. Pydantic models: `StepResult` (diffs now `list[StepDiff]`, not `list[str]`), `RoundTripResult`, `BenignArtifact`, `StepDiff`, `ComparisonResult`, `StepIdMappingResult`, `RoundTripValidationResult`, `RoundTripTreeReport`. Structured markdown/JSON reports. Single-file and tree modes. |
| `export_format2.py` | Schema-aware native-to-format2 export via `ConversionOptions` callback. `ExportResult` wraps `NormalizedFormat2` with `.format2_dict`. Single-file and tree modes. Position normalization to `left`/`top` only. |
| `to_native_stateful.py` | Schema-aware format2-to-native conversion via `state_encode_to_native` callback. `ToNativeResult`, `StepEncodeStatus` (both now Pydantic models, not dataclasses). `skip_replacement_params` `StepStatus`. Single-file and tree modes. |
| `lint_stateful.py` | Two-phase pipeline: structural lint (delegating to gxformat2) + tool state validation. Combined exit codes. Single-file and tree modes. Lint modeling unified with shared base classes. |
| `precheck.py` | `precheck_native_workflow()` --- scans all tool steps (with subworkflow recursion) for legacy encoding signals; any YES skips workflow. Wired into validate, clean, roundtrip. |
| `legacy_encoding.py` | Classifies native tool_state as legacy-encoded (nested=False) vs modern (nested=True) using schema-aware signals: container params still strings, select value quoting mismatches. |
| `legacy_parameters.py` | Classifies `${...}` replacement parameters: YES (typed field, skip validation), MAYBE_ASSUMED_NO (text/hidden, validate normally), NO. `scan_native_state()`. |
| `stale_keys.py` | Stale key classification for workflow tool_state |
| `cache.py` | Tool cache operations: `populate_cache()`, `add_tool()`, list/info/clear. JSON Schema export: `structural-schema` (gxformat2 workflow schema), `schema` (per-tool `WorkflowStepToolState` schemas). |
| `toolshed_tool_info.py` | `ToolShedGetToolInfo` --- fetches `ParsedTool` from ToolShed 2.0 TRS API, caches as JSON on filesystem. `CacheIndex`, `CombinedGetToolInfo`. Refetch, clear-count, stat/raw/remove operations. |
| `tool_search.py` | High-level Tool Shed search service. Mirrors TypeScript `ToolSearchService`. Fans queries across configured Tool Shed sources, dedupes `(owner, repo, tool_id)` first-source-wins, sorts by server score. |
| `_toolshed_search_client.py` | HTTP client for Tool Shed search, repo search, revisions, and TRS versions. Mirrors `packages/search/src/client/` on the TypeScript side. |
| `_toolshed_search_models.py` | Pydantic models for Tool Shed search and repo-search wire payloads. Mirrors `@galaxy-tool-util/search` TypeScript models. |
| `workflow_tools.py` | `load_workflow()` --- loads .ga or .gxwf.yml files |
| `workflow_tree.py` | `discover_workflows()` --- content-based directory traversal. Category grouping. |
| `scripts/` | CLI entry points + `gxwf` unified dispatcher (see below) |

### `galaxy.tool_util.collections`

Extracted from `galaxy.model.dataset_collections.type_description` (galaxy-data) into `galaxy-tool-util` for shared use. Contains the pure-logic core of `CollectionTypeDescription`, `CollectionTypeDescriptionFactory`, `COLLECTION_TYPE_REGEX`, `map_over_collection_type()`, `_normalize_collection_type()`. The galaxy-data module is now a thin re-export shim.

---

## CLI Tools

### `gxwf` --- Unified dispatcher

Single console entry point wrapping every workflow_state operation as a subcommand. Subcommands fall in four families:

- **State ops (single-file)**: `state-validate`, `validate-tests`, `state-clean`, `lint-stateful`, `roundtrip-validate`, plus `convert` (in-process format conversion)
- **State ops (tree variants)**: same names with `-tree` suffix
- **Tool Shed search**: `tool-search`, `repo-search`, `tool-versions`, `tool-revisions` (no standalone console_scripts; only available via `gxwf <sub>`)
- **gxformat2 passthroughs (in-process dispatch)**: `viz`, `abstract-export`, `mermaid`

Convention: `gxwf <op>` is equivalent to invoking the standalone `gxwf-<op>` script where one exists.

### `galaxy-tool-cache` --- Manage local tool metadata cache

```
galaxy-tool-cache populate-workflow <path>   # cache all tools referenced by workflow(s)
galaxy-tool-cache add <tool_id>              # cache single tool
galaxy-tool-cache add-local <xml_path>       # cache from local tool XML
galaxy-tool-cache list [--json]              # list cached tools
galaxy-tool-cache info <trs_id>              # show details for cached tool
galaxy-tool-cache clear [prefix]             # clear cache
galaxy-tool-cache structural-schema          # export gxformat2 workflow JSON Schema
galaxy-tool-cache schema <tool_id>           # export per-tool WorkflowStepToolState JSON Schema
```

### gxwf-* Commands (7 single-file + 7 tree variants)

| Single-file | Tree variant | Purpose |
|---|---|---|
| `gxwf-state-validate` | `gxwf-state-validate-tree` | Validate workflow tool_state against tool definitions |
| `gxwf-validate-tests` | `gxwf-validate-tests-tree` | Validate workflow-test files (`*-tests.yml`) against the `Tests` schema (no tool cache needed) |
| `gxwf-state-clean` | `gxwf-state-clean-tree` | Remove stale tool_state keys |
| `gxwf-roundtrip-validate` | `gxwf-roundtrip-validate-tree` | Round-trip native to format2 to native equivalence |
| `gxwf-to-format2-stateful` | `gxwf-to-format2-stateful-tree` | Schema-aware native to format2 export |
| `gxwf-to-native-stateful` | `gxwf-to-native-stateful-tree` | Schema-aware format2 to native conversion |
| `gxwf-lint-stateful` | `gxwf-lint-stateful-tree` | Structural lint + tool state validation |

All share common options via `ToolCacheOptions`: `--populate-cache`, `--tool-source {auto,shed,galaxy}`, `--tool-source-cache-dir DIR`, `-v`, `--output-schema`. Single-file commands reject directories with a hint to use the `-tree` variant. Tree variants accept `--report-json`/`--report-markdown` for structured output (markdown rendered via Jinja2 templates under `templates/reports/`).

Strictness is decomposed into three orthogonal axes wired through every CLI:
- `--strict-structure` --- fail on structural workflow-dict problems
- `--strict-encoding` --- fail on legacy-encoded tool_state
- `--strict-state` --- fail on tool_state validation errors
- `--strict` --- shorthand for all three

### `gxwf-state-validate` specifics

- `--mode {pydantic,json-schema}` --- Pydantic (default) or JSON Schema validation backend
- `--tool-schema-dir DIR` --- pre-exported schemas for offline JSON Schema mode
- `--clean` --- run the full clean pipeline (bookkeeping + stale keys) before validating, for uncleaned workflows (renamed from `--strip`)
- `--strict-structure`/`--strict-encoding`/`--strict-state` / `--strict` --- treat skips at each stage as failures
- `--summary` --- summary counts only
- `--connections` --- run connection validation alongside state validation (unified pipeline)
- `--report-json [FILE]` / `--report-markdown [FILE]`

### Library Entry Points

`*_single` functions in the package public API (`validate_single`, `clean_single`, `roundtrip_single`, `export_single`, `lint_single`) expose each operation as a callable for in-process use without going through `argparse` / `sys.exit`.

### CLI Architecture

Single-file and tree variants share a common orchestrator (`_tree_orchestrator.py`). Each operation defines:
- A `process_one(info, wf_dict, tool_info) -> T` callback
- An `aggregate(TreeResult[T]) -> Report` function
- Formatters: `format_text`, `format_summary`, plus a Jinja2 markdown template
- `compute_exit_code(Report) -> int`

The orchestrator handles discovery, loading, error capture, skip tracking, and report emission. The unified `gxwf` dispatcher composes per-module `register(subparsers)` functions so every standalone script is reachable as both a console_script and a `gxwf <sub>` subcommand.

---

## Core Abstractions

### `GetToolInfo` Protocol
Interface for fetching `ParsedTool` by `(tool_id, tool_version)`. Implementations: `ToolShedGetToolInfo` (API + filesystem cache), `CombinedGetToolInfo` (ToolShed + stock tools fallback).

### gxformat2 Callback Protocols
Schema-aware state conversion injected into gxformat2 via optional callbacks on `ConversionOptions`:
- **`state_encode_to_format2`** --- passed to `to_format2()`. Converts native step tool_state to format2 `state` dict.
- **`state_encode_to_native`** --- passed to `to_native()`. Encodes format2 `state` back to native tool_state with correct types.

Factory functions: `make_convert_tool_state(get_tool_info)`, `make_encode_tool_state(get_tool_info)`.

### gxformat2 Normalized Models
All workflow access goes through gxformat2 Pydantic models:
- `NormalizedNativeWorkflow` / `NormalizedNativeStep` --- typed access to steps, connections, tool_state, position, labels
- `NormalizedFormat2` --- typed access to format2 workflow structure
- `StepLike = Union[NormalizedNativeStep, NativeStepDict]` --- backward compat union

### `walk_native_state()` / `walk_format2_state()` --- The Reusable Walkers
Recursive traversal of tool_state dicts that correctly handles conditionals, repeats, and sections. Accept leaf callbacks. Used by: convert.py, validation_native.py, clean.py, stale_keys.py, connection_graph.py, legacy_parameters.py.

Conditional branch selection uses explicit test value only --- `__current_case__` is never consulted. `_select_which_when_native()` is the shared branch resolution function.

### Validation Pipelines
- **Native path**: `WorkflowStepNativeToolState.model_validate()` with connection injection via `inject_connections_into_state()` (declarative Pydantic). Optional `--strip` pre-pass removes bookkeeping/stale keys. All three validation paths are now declarative Pydantic-based.
- **Format2 path**: `validate_format2_state()` --- Pydantic `WorkflowStepToolState` / `WorkflowStepLinkedToolState` models (declarative)
- **JSON Schema path**: `validation_json_schema.py` --- two-level validation using exported JSON Schemas (for external tooling)
- **Legacy detection**: `precheck_native_workflow()` skips workflows with legacy encoding; `scan_native_state()` skips steps with `${...}` replacement parameters in typed fields

### State Conversion Pipeline
`convert_state_to_format2()`:
1. Scan for legacy replacement parameters --- bail on YES
2. Validate native step (pre-conversion check)
3. Walk native state with `convert_leaf` callback --- produces format2 `state` dict + `in` connections dict
4. Validate converted result via shared `validate_format2_state()` (post-conversion check)
5. Return `Format2State(state=..., in=...)`

`encode_state_to_native()` (reverse):
1. Walk format2 state dict with tool definitions via `walk_format2_state()`
2. Reverse multiple-select lists, data column ints to strings
3. `json.dumps` each value for native double-encoding
4. ConnectedValue markers passed through

### `WorkflowStepNativeToolState` --- Native State Representation
Pydantic state model for validated native (.ga) tool_state. Parallel to `WorkflowStepLinkedToolState` (format2). Adds `RuntimeValue` model (alongside `ConnectedValue`). Broadens types to accept native double-encoding artifacts: `NativeInt` (StrictInt|StrictStr with int validation), `NativeFloat` (StrictInt|StrictFloat|StrictStr with float validation), string booleans (`"true"`/`"false"`), comma-delimited multi-selects. Created via `create_workflow_step_native_model()`. `StateRepresentationT` now includes `"workflow_step_native"`.

### Structured Diff Classification
`StepDiff` with `DiffType` (value_mismatch, missing_in_roundtrip, connection_mismatch, position/label/annotation/comment_mismatch) and `DiffSeverity` (error/benign). Benign patterns: all-None sections, empty repeats, connection-only sections, multiple-select scalar-to-list normalization.

### JSON Schema Validation
Two-level validation for external tooling:
- **Level 1 (structural)**: validates workflow dict against gxformat2's `GalaxyWorkflow.model_json_schema()`
- **Level 2 (per-step)**: validates each step's `state` against its tool's `WorkflowStepToolState.model_json_schema()`

Native .ga workflows also validated via `validate_native_workflow_json_schema()` using `WorkflowStepNativeToolState` JSON Schemas.

Schemas exported via `galaxy-tool-cache structural-schema` and `galaxy-tool-cache schema`.

---

## Other Changes Outside the Package

- **`hidden_data` params modeled as optional data in tool meta-models** --- `parameters/factory.py` now treats `hidden_data` like `data`
- **`lib/galaxy/managers/workflows.py`** --- format2 export via `_export_as_format2()` with toolbox-backed `ToolboxGetToolInfo`; `_clean_native_dict()` integration; `clean` / `clean_preserve` / `clean_strip` parameters threaded through `workflow_to_dict()`; precheck integration
- **`lib/galaxy/webapps/galaxy/api/workflows.py`** --- `clean`, `clean_preserve`, `clean_strip` query params on `GET /api/workflows/{id}/download` (applies to `ga`, `format2`, `format2_wrapped_yaml` styles; invalid category → 400, missing toolbox → 409)
- **`lib/galaxy/webapps/galaxy/api/tools.py`** --- `GET /api/tools/{id}/parsed`, `/versions/{v}/parsed`, `/versions/{v}/parameter_request_schema`, `/versions/{v}/parameter_landing_request_schema`, `/versions/{v}/parameter_test_case_xml_schema` (mirrors ToolShed tool endpoints so `galaxy-tool-cache` / `--tool-source galaxy` can pull metadata from a running Galaxy)
- **Parameter visitor refactoring** in `parameters/visitor.py` and `tool_util_models/parameters.py`
- **`galaxy.model.dataset_collections.type_description`** --- thin re-export shim over `galaxy.tool_util.collections`
- **`GALAXY_TEST_STRIP_BOOKKEEPING_FROM_WORKFLOWS`** env var enabled in CI
- **`pyproject.toml`** --- gxformat2 bumped to `git+https://github.com/jmchilton/gxformat2.git@abstraction_applications` (branch dep; must be released and pinned back to a PyPI version range before this lands on `dev`)
- **ToolShed API fixes** --- missing stock tool sources for converters and version mismatches
- **Pydantic model fixes:**
  - `safe_field_name` + alias for QIIME2 underscore-prefixed parameter names
  - `DataColumnParameterModel`: `gx_data_column` case in converter, `workflow_step_linked` support
  - `ConditionalParameterModel`: generate empty when branches for undeclared test parameter values
  - `ConditionalParameterModel`: JSON Schema `oneOf` ambiguity fix --- test parameter required in explicit when branches when `__absent__` branch exists
  - `clean.py`: fixed unmatched conditional branches skipping `__current_case__` stripping
  - `ParsedTool`: `description` empty-string normalized to `None` via model_validator
  - `RulesModel`: discriminated union rules, constrained mappings, regex validation, `mappings`→`mapping` rename
- **API artifact tests** in `lib/galaxy_test/api/test_wf_conversion_artifacts.py`
- **Tool execution tests** in `lib/galaxy_test/api/test_tool_execute.py`
- **`doc/source/dev/wf_tooling.md`** --- developer documentation for the CLI toolkit

---

## Test Coverage

### Test Suites

| Suite | What It Covers |
|---|---|
| `test_roundtrip.py` | Native to format2 to native equivalence, sweeps 70+ framework workflows |
| `test_workflow_tree.py` | Phased: discovery, validation, cleaning, cache population. Report formatting. |
| `test_tree_orchestrator.py` | Generic orchestrator: basic run, collect, skip, error, include_format2, empty dir, exit codes |
| `test_tool_cache.py` | Cache CRUD, persistence, CLI parser tests for all commands |
| `test_tool_caching_golden.py` | YAML-driven golden tests with real ToolShed data (fastqc, multiqc, trimmomatic, cat1). Nested structure path assertions, format_version validation, SHA256 checksum integrity. |
| `test_iwc_sweep.py` | IWC corpus sweep: validate, clean, export, roundtrip, to-native-stateful, lint-stateful, json-schema (format2 + native). Gated on `GALAXY_TEST_IWC_DIRECTORY`. |
| `test_format2_subworkflow_validation.py` | Recursive subworkflow validation (3+ nesting levels) |
| `test_connection_types.py` | Collection type matching: `can_match`, `can_map_over`, sentinel types, `paired_or_unpaired` |
| `test_connection_graph.py` | Graph builder, map-over propagation |
| `test_connection_validation.py` | Per-connection type validation |
| `test_connection_workflows.py` | End-to-end connection workflow fixtures under `connection_workflows/` (ok/fail expectations) |
| `test_collection_semantics_coverage.py` | Tracks coverage against the algebra truth-table for `workflow_format_validation` |
| `test_json_schema_structural.py` | Structural JSON Schema validation tests |
| `test_json_schema_tool_state.py` | Per-step tool state JSON Schema validation tests |
| `test_json_schema_integration.py` | End-to-end JSON Schema validation pipeline tests |
| `test_json_schema_export.py` | JSON Schema export tests |
| `test_tool_cache_schema.py` | Schema subcommand tests for galaxy-tool-cache |
| `test_legacy_parameters.py` | Replacement parameter classification tests |
| `test_legacy_encoding.py` | Legacy encoding detection with real .ga workflows |
| `test_precheck.py` | Workflow prechecking with real .ga workflows |
| `test_validate_tests.py` | Workflow-test-file validation (`*-tests.yml` against `Tests` model) |
| `test_gxwf_cli.py` | Unified `gxwf` dispatcher tests --- subcommand registration, passthrough wiring, exit codes |
| `test_strict_options.py` | `--strict-{structure,encoding,state}` and `--strict` shorthand behavior across CLIs |
| `test_report_templates.py` | Jinja2 markdown template rendering for all tree reports |
| `test_report_model_fields.py` | Report model field-shape contract tests |
| `test_report_json_contract.py` | JSON output contract (golden files under `report_json_contract_goldens/`) |
| `test_toolshed_search.py` | Tool Shed search service, dedup/sort, model parsing |
| `test_toolshed_search_cli.py` | `gxwf tool-search` / `repo-search` / `tool-versions` / `tool-revisions` CLI tests |
| `test_workflow_state_helpers.py` | Shared utility tests (`_util.py`, `_walker.py`, `_state_merge.py`) |
| `test_wf_conversion_artifacts.py` | API workflow tests for format2 conversion artifacts |
| `test_tool_execute.py` | Direct tool execution tests for repeat/select artifacts |
| `test_declarative.py` | YAML-driven declarative tests for clean, validate, export_format2, clean_then_validate. Navigates workflow structure directly via path-based assertions. Synthetic fixtures + IWC workflows including subworkflow recursion. |

### IWC Test Workflows
Real-world IWC workflows under `test/unit/workflows/iwc/` used as checked-in regression data. Broader corpus is loaded on demand by `test_iwc_sweep.py` when `GALAXY_TEST_IWC_DIRECTORY` is set.

---

## Deliverable Status vs PROBLEM_AND_GOAL.md

| Deliverable | Status | Notes |
|---|---|---|
| **D1: State Encoding Conversion** | **Complete** | `convert.py` + `_walker.py`. Forward and reverse via callback protocols. |
| **D2: State Validation** | **Complete** | Native now Pydantic-based (`WorkflowStepNativeToolState`), format2 (`validation_format2.py`), JSON Schema extended to native .ga (`validation_json_schema.py`). All three paths declarative. |
| **D3: Native Workflow Validator** | **Complete** | `validate.py` orchestrator, native path. Unified state + connection pipeline. |
| **D4: Format2 Workflow Validator** | **Complete** | `validate.py` orchestrator, format2 path. Validates `state` + `in` connections. |
| **D5: Round-Trip Validation** | **Complete** | `gxwf-roundtrip-validate` CLI. Full pipeline with structured diff classification, graphical equivalence, step ID remapping. **120/120 IWC workflows pass.** |
| **D6: IWC Workflow State Verification** | **Complete** | Full corpus verified. API tests confirm Galaxy handles all conversion artifacts. |
| **D7: IWC Lint-on-Merge** | Not started | D6 baseline established. CI integration in IWC repo still needed. |
| **D8: Format2 Export from Galaxy** | **Complete** | `gxwf-to-format2-stateful` CLI + Galaxy API integration. |
| **D9: VS Code Extension** | In progress | JSON Schema export pipeline complete (structural + per-tool schemas). Two-level validation backend complete. Tool registry service, dynamic completions, connection source completions, workspace integration not started. |
| **D10: Full gxformat2 in IWC** | Not started | Depends on D7 + gxformat2 release. |

### Bonus: Stale State Cleaning
`gxwf-state-clean` with classification/policy knobs. Integrated into roundtrip pipeline.

### Bonus: Legacy Encoding / Parameter Detection
`precheck.py` + `legacy_encoding.py` + `legacy_parameters.py` --- three-layer detection allowing graceful skip of workflows that can't be meaningfully validated or converted.

### Bonus: JSON Schema Validation Backend
`validation_json_schema.py` + `galaxy-tool-cache structural-schema`/`schema` --- enables external tooling (TypeScript, VS Code, CI) to validate workflows without the Python runtime. Foundation for D9.

### Bonus: Format2-to-Native Conversion
`gxwf-to-native-stateful` --- standalone schema-aware format2 to native conversion (was previously only available within the roundtrip pipeline).

### Bonus: gxwf-lint-stateful
Two-phase pipeline combining gxformat2's structural lint with tool state validation.

### Bonus: Workflow-Test-File Validation
`gxwf-validate-tests` + `gxwf-validate-tests-tree` validate `*-tests.yml` files against the `Tests` Pydantic model without requiring a tool cache. Used by VS Code and CI to lint test files alongside the workflows they exercise.

### Bonus: Tool Shed Search Subcommands
`gxwf tool-search`, `repo-search`, `tool-versions`, `tool-revisions` --- Python-side parity with the TypeScript `@galaxy-tool-util/search` package. HTTP client, Pydantic wire models, dedup/sort service. Foundation for tool insertion UX in CLI and VS Code.

### Bonus: Unified `gxwf` Dispatcher with gxformat2 Passthrough
Single `gxwf` console_script registers every workflow_state subcommand plus in-process passthroughs to `gxformat2.cytoscape` (viz), `gxformat2.abstract` (abstract-export), and `gxformat2.mermaid` (mermaid). One CLI surface, one help tree, one place to discover capabilities.

### Bonus: Jinja2-Templated Reports
All tree-mode markdown reports render through Jinja2 templates in `templates/reports/` against `model_dump(by_alias=True, mode="json")`. Eliminates hand-written Python formatters and keeps report shape decoupled from CLI code.

---

## What You Can Do Today

1. **Cache tool metadata** from ToolShed 2.0 *or* a running Galaxy instance (`--tool-source galaxy`) for any workflow or individual tool
2. **Export JSON Schemas** for workflow structure and per-tool state --- usable by any language
3. **Validate any workflow** against tool definitions --- native or format2, Pydantic or JSON Schema backend, single file or entire directory tree
4. **Validate workflow-test files** (`*-tests.yml`) against the `Tests` schema with no tool cache required
5. **Validate connections** alongside state in a unified pipeline
6. **Clean stale keys** with classification and policy knobs (default policy = full clean)
7. **Convert native to format2** with schema-aware state blocks via CLI, library, or Galaxy `GET /api/workflows/{id}/download?style=format2&clean=true`
8. **Convert format2 to native** with schema-aware encoding via CLI or library
9. **Run round-trip equivalence validation** --- 120/120 IWC workflows pass (last full sweep)
10. **Lint workflows** with combined structural + stateful checks; orthogonal `--strict-{structure,encoding,state}` axes
11. **Detect legacy encoding** and replacement parameters --- graceful skip instead of false failures
12. **Search Tool Shed** from the CLI: tools, repos, versions, revisions
13. **Render workflows** as Cytoscape / Mermaid / abstract CWL via `gxwf viz`/`mermaid`/`abstract-export` (in-process gxformat2 dispatch)
14. **Batch process** entire directory trees with Jinja2-templated JSON/Markdown reports

## What's Not Done Yet

- **IWC lint-on-merge** (D7) --- CI integration in IWC repo
- **VS Code extension** (D9) --- substantial planning under `VS_CODE_*.md` (architecture, conversion, mermaid, tool-search LSP, cache tree, tool view); JSON Schema export, tool-search Python service, and `gxwf` dispatcher are landed foundations. Tool registry hookup, dynamic completions, and connection completions still pending --- tracked in companion VS_CODE plans.
- **Full gxformat2 in IWC** (D10) --- depends on D7 + gxformat2 release
- **Connection validation CLI** --- `connection_validation.py` engine exists but phases 3-5 (per-connection validation, `collection_semantics.yml` tracking) not complete
- **gxformat2 release** --- callback protocol branch (`abstraction_applications`) still depended on directly via git; not yet merged/released; Galaxy `pyproject.toml` pin must be restored to a PyPI version range before this branch can land on `dev`
- External subworkflow references (string `run` keys) are skipped, not resolved
- `connection_types.py` F2 bug: `has_subcollections_of_type` `endswith` false positive for `"list:paired_or_unpaired".endswith("paired")` --- marked xfail
