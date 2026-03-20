# Workflow Tool State: Current Implementation State

**Branch:** `wf_tool_state` (rebased on `fix_paired_unpaired_map_over`)
**Date:** 2026-03-18
**Scope:** 49 commits, 132 files changed, ~13,350 lines added / ~2,500 deleted

## What Exists

A new `galaxy.tool_util.workflow_state` package in `galaxy-tool-util` providing schema-aware workflow tool state validation, conversion, and cleaning — entirely independent of Galaxy's runtime. Five CLI tools are registered as console_scripts. The package includes a tool metadata cache backed by ToolShed 2.0 API, a recursive state tree walker, native and Format2 validators, a native→Format2 state converter, a stale-key cleaner with classification/policy knobs, a round-trip validator, and a format2 exporter. New: `galaxy.tool_util.collections` provides `CollectionTypeDescription` extracted from galaxy-data for offline collection type reasoning.

---

## Package Layout

All under `packages/tool_util/galaxy/tool_util/workflow_state/`:

| Module | Responsibility |
|---|---|
| `__init__.py` | Public API: `convert_state_to_format2`, `Format2State`, `ConversionValidationFailure`, `validate_workflow`, `GetToolInfo` |
| `_types.py` | `NativeWorkflowDict`, `Format2WorkflowDict`, `WorkflowFormat`, `GetToolInfo` protocol |
| `_walker.py` | `walk_native_state()` — recursive traversal of native tool_state with callback pattern. Handles conditionals (branch selection via test value / `__current_case__` / default), repeats, sections. Optionally detects unknown keys. |
| `convert.py` | `convert_state_to_format2()` / `convert_state_to_format2_using()`. Transforms native double-encoded JSON tool_state into Format2 `state` dict + `in` connections dict. Double-validates (before and after transformation). |
| `validation_native.py` | `validate_native_step_against()` — validates a native step's tool_state against a ParsedTool. Decodes double-encoded values, walks state tree with type-checking callback (integers, floats, selects against declared options, booleans, data params). |
| `validation_format2.py` | `validate_step_against()` — validates Format2 step state using Pydantic `WorkflowStepToolState` / `WorkflowStepLinkedToolState` models. `merge_inputs()` injects `ConnectedValue` markers from `in`/`connect` into state for linked validation. |
| `validate.py` | Orchestrator: `validate_workflow_cli()` detects format, dispatches to native or format2 path. `validate_tree()` for directory-level validation. Result types (`StepResult`, `WorkflowValidationResult`, `TreeValidationReport`). Formatters: text, JSON, Markdown. |
| `clean.py` | `clean_stale_state()` / `strip_stale_keys()` — removes tool_state keys not present in current tool definition. Supports stale key classification with `--allow`/`--deny`/`--preserve`/`--strip` policy knobs. Recursive, handles containers. Supports dry-run, in-place, and adjacent-file output. Result types, formatters. |
| `roundtrip.py` | Round-trip validation logic extracted from test_roundtrip.py. Native→Format2→revalidate pipeline. |
| `cache.py` | Tool cache operations: `populate_cache()` (from workflow/directory), `add_tool()`, list/info/clear. Options models for each operation. |
| `toolshed_tool_info.py` | `ToolShedGetToolInfo` — fetches `ParsedTool` from ToolShed 2.0 TRS API, caches as JSON on filesystem. `CacheIndex` for provenance tracking (index.json). `CombinedGetToolInfo` tries ToolShed first, falls back to stock tools. |
| `workflow_tools.py` | `extract_toolshed_tools()`, `extract_all_tools()`, `load_workflow()`, format detection |
| `workflow_tree.py` | `discover_workflows()` — directory traversal, content validation, category grouping. `load_workflow_safe()`. |
| `connection_types.py` | Adapter over `galaxy.tool_util.collections.CollectionTypeDescription` adding sentinel types (NULL/ANY) and connection-validation-specific free functions (`can_match`, `can_map_over`, `effective_map_over`). Phase 1 of connection validation. |
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

Validates workflows by round-tripping native→Format2→native and comparing for functional equivalence. Detects conversion failures per-step and structural diffs in the reimported result.

### `galaxy-workflow-export-format2` — Schema-aware Format2 export

Exports native .ga workflows to Format2 (.gxwf.yml) using the toolbox for schema-aware conversion. Introduces `ToolInputs` protocol for toolbox-mediated export.

---

## Core Abstractions

### `GetToolInfo` Protocol
Interface for fetching `ParsedTool` by `(tool_id, tool_version)`. Implementations: `ToolShedGetToolInfo` (API + filesystem cache), `CombinedGetToolInfo` (ToolShed + stock tools fallback).

### `ToolInputs` Protocol
Interface for toolbox-mediated format2 export. Used by `galaxy-workflow-export-format2` CLI.

### `walk_native_state()` — The Reusable Walker
Recursive traversal of native tool_state dicts that correctly handles conditionals, repeats, and sections. Accepts a leaf callback — used by:
- **convert.py**: callback transforms values and tracks connections
- **validation_native.py**: callback type-checks values and injects ConnectedValue markers
- **clean.py**: uses the walker's unknown-key detection mode

Conditional branch selection: tries explicit test value first → `__current_case__` index fallback → default `when` fallback. This means `__current_case__` is treated as a hint, not authoritative — consistent with the goal of proving it unnecessary.

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

### IWC Test Workflows
11 real-world IWC workflows added under `test/unit/workflows/iwc/` (RNA-seq, ChIP-seq, variant calling, mass spec, image analysis, etc.) — used as regression data for discovery and validation.

---

## Deliverable Status vs PROBLEM_AND_GOAL.md

| Deliverable | Status | Notes |
|---|---|---|
| **D1: State Encoding Conversion** | Implemented | `convert.py` + `_walker.py`. Handles all param types. Strips bookkeeping. |
| **D2: State Validation** | Implemented | `validation_native.py` (native), `validation_format2.py` (format2 + connection merging). Both use existing Pydantic infra. |
| **D3: Native Workflow Validator** | Implemented | `validate.py` orchestrator, native path. Per-step validation with structured results. |
| **D4: Format2 Workflow Validator** | Implemented | `validate.py` orchestrator, format2 path. Validates `state` + `in` connections. |
| **D5: Round-Trip Validation** | Implemented | `galaxy-workflow-roundtrip-validate` CLI. Logic extracted from `test_roundtrip.py` into `roundtrip.py`. Sweeps 70+ workflows. |
| **D6: IWC Workflow State Verification** | In progress | Full IWC corpus validated (111 workflows, 509 tools, 0 skips). **86/111 clean**, 25 have 124 stale keys across ~50 steps. All 509 tools cached. Stale key classification added with policy knobs. Cleaning pass and upstream PRs to IWC still needed. |
| **D7: IWC Lint-on-Merge** | Not started | Blocked on D6 cleanup. No CI integration or pre-commit hook in IWC repo yet. |
| **D8: Format2 Export from Galaxy** | Implemented | `galaxy-workflow-export-format2` CLI for schema-aware export via toolbox. `ToolInputs` protocol introduced. Clean query params added to workflow download API. Format2 API export via toolbox integrated. |
| **D9: Connection Validation** | In progress | Phase 0 (CollectionTypeDescription extraction + paired_or_unpaired bugfix) and Phase 1 (connection_types.py adapter + tests) complete. Phases 2-5 (graph builder, validation engine, CLI integration, collection_semantics.yml tracking) not started. See CONNECTION_VALIDATION.md. |

### Bonus: Stale State Cleaning
Not in the original deliverables but emerged as a practical need — `galaxy-workflow-clean-stale-state` removes obsolete tool_state keys using tool definitions. Now includes stale key classification with `--allow`/`--deny`/`--preserve`/`--strip` policy knobs. Directly supports D6.

---

## Recent Work (since 2026-03-13)

### Rebased on `fix_paired_unpaired_map_over`
Branch rebased on top of the `fix_paired_unpaired_map_over` branch to incorporate bug fixes discovered when starting map/reduce workflow validation code. Includes compound `:paired_or_unpaired` handling fix in `has_subcollections_of_type` and `effective_collection_type`.

### Connection Validation Foundation
Started work on inter-step connection type validation (CONNECTION_VALIDATION.md). Required extracting `CollectionTypeDescription` from galaxy-data into galaxy-tool-util (COLLECTION_TYPE_REACTORING_PLAN.md). Phases completed:
- **Phase 0.1:** Extract `CollectionTypeDescription` into `galaxy.tool_util.collections` (1817599a8a)
- **Phase 0.2:** Fix compound `:paired_or_unpaired` bug in base class (b11e5ee5de)
- **Phase 1:** `connection_types.py` adapter with sentinel types, delegating free functions, tests ported from TS

### Key Commits
- `828e09578f` — Add clean query params to workflow download API endpoint
- `5d7d78b926` — Add format2 API export via toolbox, introduce ToolInputs protocol
- `50c2f97e9e` — Add stale key classification with --allow/--deny/--preserve/--strip knobs
- `e7a84fdcb1` — Add galaxy-workflow-roundtrip-validate CLI
- `9c9b44ec8c` — Add galaxy-workflow-export-format2 CLI for schema-aware format2 export
- `1817599a8a` — Extract CollectionTypeDescription into galaxy-tool-util for shared use
- `b11e5ee5de` — Fix compound :paired_or_unpaired handling in has_subcollections_of_type
- `d3f6f25d0d` — Output unencoded tool_state dicts from clean/validate scripts

---

## What You Can Do Today

1. **Cache tool metadata** from ToolShed 2.0 for any workflow or individual tool
2. **Validate any .ga or .gxwf.yml workflow** against current tool definitions — get structured pass/fail/skip results per step, in text, JSON, or Markdown
3. **Validate entire directory trees** of workflows (e.g. IWC repo) in one command
4. **Clean stale keys** from native workflows — with classification and policy knobs for fine-grained control
5. **Convert native tool_state to Format2 state** programmatically and via CLI (`galaxy-workflow-export-format2`)
6. **Run round-trip equivalence validation** via CLI (`galaxy-workflow-roundtrip-validate`) or test suite
7. **Validate collection type compatibility** between workflow connections via `connection_types.py` (library API, Phase 1 only)
8. **Strip bookkeeping keys** from workflows during validation and cleaning

## What's Not Done Yet

- **Connection validation** (D9) — Phases 2-5: graph builder, per-connection validation engine, CLI `--connections` flag, collection_semantics.yml test tracking
- **IWC state verification** (D6) — corpus validated, 25/111 workflows have stale keys. Need to run cleaner and submit cleanup PRs to IWC
- **IWC lint-on-merge** (D7) — needs D6 baseline first, then CI integration in IWC repo
- **Galaxy instance as tool source** (`--tool-source galaxy`) — raises `NotImplementedError`
- No **Format2→native conversion** (only native→Format2 exists)
- External subworkflow references (string `run` keys) are skipped, not resolved
- `connection_types.py` F2 bug: `has_subcollections_of_type` `endswith` false positive for `"list:paired_or_unpaired".endswith("paired")` — marked xfail, needs colon-prefix fix
