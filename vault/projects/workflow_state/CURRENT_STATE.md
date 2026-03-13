# Workflow Tool State: Current Implementation State

**Branch:** `wf_tool_state` (rebased on `origin/dev`)
**Date:** 2026-03-13
**Scope:** 24 commits, 54 files changed, ~6,600 lines added

## What Exists

A new `galaxy.tool_util.workflow_state` package in `galaxy-tool-util` providing schema-aware workflow tool state validation, conversion, and cleaning — entirely independent of Galaxy's runtime. Three CLI tools are registered as console_scripts. The package includes a tool metadata cache backed by ToolShed 2.0 API, a recursive state tree walker, native and Format2 validators, a native→Format2 state converter, and a stale-key cleaner.

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
| `clean.py` | `clean_stale_state()` / `strip_stale_keys()` — removes tool_state keys not present in current tool definition. Recursive, handles containers. Supports dry-run, in-place, and adjacent-file output. Result types, formatters. |
| `cache.py` | Tool cache operations: `populate_cache()` (from workflow/directory), `add_tool()`, list/info/clear. Options models for each operation. |
| `toolshed_tool_info.py` | `ToolShedGetToolInfo` — fetches `ParsedTool` from ToolShed 2.0 TRS API, caches as JSON on filesystem. `CacheIndex` for provenance tracking (index.json). `CombinedGetToolInfo` tries ToolShed first, falls back to stock tools. |
| `workflow_tools.py` | `extract_toolshed_tools()`, `extract_all_tools()`, `load_workflow()`, format detection |
| `workflow_tree.py` | `discover_workflows()` — directory traversal, content validation, category grouping. `load_workflow_safe()`. |
| `_cli_common.py` | Shared argparse helpers: `--tool-source-cache-dir`, `-v`, `--tool-source`, `--populate-cache` |
| `scripts/` | Three CLI entry points (see below) |

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
- `--report-json [FILE]` / `--report-markdown [FILE]` — structured output
- Exit codes: 0=pass, 1=failures, 2=skips (with --strict)

Works on single files or entire directory trees. Auto-detects native vs Format2. Recurses into subworkflows.

### `galaxy-workflow-clean-stale-state` — Remove stale tool_state keys

```
galaxy-workflow-clean-stale-state <path>     # dry-run by default
```

Options:
- `--output-template TEMPLATE` — write output (e.g. `{path}` for in-place, `{dir}/{stem}.cleaned{ext}` for adjacent). Absent = dry-run.
- `--diff` — show unified diff
- `--populate-cache` / `--tool-source` — same as above
- `--report-json [FILE]` / `--report-markdown [FILE]`

---

## Core Abstractions

### `GetToolInfo` Protocol
Interface for fetching `ParsedTool` by `(tool_id, tool_version)`. Implementations: `ToolShedGetToolInfo` (API + filesystem cache), `CombinedGetToolInfo` (ToolShed + stock tools fallback).

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

---

## Other Changes Outside the Package

- **`hidden_data` params modeled as optional data in tool meta-models** — `parameters/factory.py` now treats `hidden_data` like `data` in Pydantic model generation
- **`lib/galaxy/managers/workflows.py`** — ~40 lines changed (likely Format2 export integration)
- **Parameter visitor refactoring** in `parameters/visitor.py` and `tool_util_models/parameters.py`

---

## Test Coverage

~2,900 lines of test code across 15 files.

### Key Test Suites

| Suite | Lines | What It Covers |
|---|---|---|
| `test_roundtrip.py` | 1,105 | Native→Format2→Native round-trip equivalence. Sweeps 70+ framework test workflows. Classifies failures. |
| `test_workflow_tree.py` | 648 | Phased tests: discovery → validation → cleaning → cache population. Tests report formatting (text, JSON, Markdown). |
| `test_tool_cache.py` | 366 | Tool ID parsing, cache CRUD, persistence, corrupted index recovery, CLI parser testing. |
| `test_format2_subworkflow_validation.py` | 183 | Recursive subworkflow validation (3+ nesting levels), step prefix naming ("0.0.0"). |
| `test_modules.py` | 531 | Workflow step modules, state computation, data I/O (pre-existing, likely modified). |

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
| **D5: Round-Trip Validation** | Partially implemented | `test_roundtrip.py` sweeps 70+ workflows. Conversion pipeline exists. No standalone CLI utility yet. IWC workflows added but full IWC suite validation not demonstrated as a repeatable operation. |
| **D6: IWC Workflow State Verification** | In progress | Full IWC corpus validated (111 workflows, 509 tools, 0 skips). **86/111 clean**, 25 have 124 stale keys across ~50 steps. All 509 tools cached (10 via `add-local` fallback for stock/expression tools). Failures triaged — mostly stale keys (`saveLog`, `__workflow_invocation_uuid__`, `__identifier__`, fastp PE params, racon params). Cleaning pass and upstream PRs to IWC still needed. |
| **D7: IWC Lint-on-Merge** | Not started | Blocked on D6 cleanup. No CI integration or pre-commit hook in IWC repo yet. |
| **D8: Format2 Export from Galaxy** | Started | `workflows.py` manager changes (~40 lines). Full integration unclear — likely needs the round-trip CLI (D5) to gate export. |

### Bonus: Stale State Cleaning
Not in the original deliverables but emerged as a practical need — `galaxy-workflow-clean-stale-state` removes obsolete tool_state keys using tool definitions. Useful for workflow maintenance and as a prerequisite to clean validation. Directly supports D6 (cleaning IWC workflows to pass validation).

---

## What You Can Do Today

1. **Cache tool metadata** from ToolShed 2.0 for any workflow or individual tool
2. **Validate any .ga or .gxwf.yml workflow** against current tool definitions — get structured pass/fail/skip results per step, in text, JSON, or Markdown
3. **Validate entire directory trees** of workflows (e.g. IWC repo) in one command
4. **Clean stale keys** from native workflows — dry-run to see what would be removed, or write cleaned output in-place or adjacent
5. **Convert native tool_state to Format2 state** programmatically (library API, not yet CLI-exposed)
6. **Run round-trip equivalence tests** via the test suite (70+ workflows)

## What's Not Done Yet

- No standalone **round-trip validation CLI** (D5) — exists only as test infrastructure
- **IWC state verification** (D6) — corpus validated, 25/111 workflows have stale keys. Need to run `galaxy-workflow-clean-stale-state` and submit cleanup PRs to IWC
- **IWC lint-on-merge** (D7) — needs D6 baseline first, then CI integration (GitHub Actions or pre-commit) in IWC repo
- **Format2 export from Galaxy UI/API** (D8) — changes started in workflows.py but not complete
- **Galaxy instance as tool source** (`--tool-source galaxy`) — raises `NotImplementedError`
- No **Format2→native conversion** (only native→Format2 exists)
- External subworkflow references (string `run` keys) are skipped, not resolved
