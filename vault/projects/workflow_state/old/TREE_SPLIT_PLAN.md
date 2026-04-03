# Plan: Split Single-File and Tree CLI Commands

**Date:** 2026-03-29
**Branch:** `wf_tool_state_applications` (builds on `wf_tool_state`)
**Status:** DRAFT

## Problem

Every `gxwf-*-stateful` command currently auto-detects `os.path.isdir(workflow_path)` and branches into single-file vs tree mode. This creates several concrete problems:

### P1. Output semantics are irreconcilable

Single-file commands naturally write converted content to **stdout** (pipe-friendly, composable). Tree commands need to write **N files** — stdout is nonsensical. Today this tension manifests as:

- `export_format2.py` → stdout by default, `-o FILE` for single output. **No tree support at all** despite the infrastructure existing.
- `to_native_stateful.py` → same stdout-by-default pattern. No tree support.
- `clean.py` → single-file mode has a `dry_run` concept (no `--output-template` = don't write, just show diff). Tree mode always writes. The `--diff` flag is only meaningful for single files.
- `roundtrip.py` → single-file has `--output-native` / `--output-format2` artifact output. Tree mode silently ignores these.

### P2. Result model wrapping hack

Single-file results (`SingleValidationReport`, `SingleCleanReport`) must be **manually wrapped** into `TreeValidationReport` / `TreeCleanReport` via `wrap_single_validation()` / `wrap_single_clean()` just to reuse the markdown formatter. This exists because we have one formatter contract but two result shapes.

### P3. Duplicated is_dir branching in every module

Each module reimplements the same pattern:
```python
is_dir = os.path.isdir(options.workflow_path)
if is_dir:
    return _run_tree(...)
else:
    return _run_single(...)
```

This appears in: `validate.py:700`, `clean.py:627`, `roundtrip.py:1281`, `validate.py:622` (json-schema mode). Each branch has different error handling, precheck behavior, and output logic.

### P4. Connection validation is bolted on

`_run_connection_validation()` in `validate.py:535` has its **own** `is_dir` check and its **own** tree-walking loop, completely separate from the main validation pipeline. The TODO at line 702 acknowledges this:
```python
# TODO: This feels like asymmetric - we should do the single or multiple dance
# between state and connection validation in some symmetric way.
```

`lint_stateful.py` also calls `_run_connection_validation` as a bolt-on at line 200-202, importing it from validate.py and suffering the same is_dir branching.

### P5. Report format inconsistency

Single-file JSON output uses `SingleValidationReport` (flat step list). Tree JSON uses `TreeValidationReport` (nested by workflow). Users switching from single-file to directory get a **different JSON schema** with no migration path.

### P6. Precheck handling diverges

- Single-file: prints to stderr and returns exit 0 (`clean.py:639-641`)
- Tree: records `skipped_reason` in a `WorkflowCleanResult` dataclass (`clean.py:441-451`)
- These are the same concept with different output contracts

### P7. discover_workflows() imported inside domain functions

Every tree function does a late `from .workflow_tree import discover_workflows` inside the function body. Discovery is a cross-cutting concern that should be orchestrated from outside, not embedded in domain logic.

### P8. lint_stateful.py inherits all validate.py pain points

`lint_stateful.py` imports `validate_workflow_cli`, `_run_connection_validation`, `wrap_single_validation`, and `format_tree_markdown` directly from validate.py. It inherits the wrapping hack (P2) and the bolt-on connection validation (P4). A tree variant would need to duplicate all of this again.

---

## Design: `-tree` Command Variants

Split each command into two entry points with clear contracts:

| Single-file command | Tree command |
|---|---|
| `gxwf-state-validate` | `gxwf-state-validate-tree` |
| `gxwf-state-clean` | `gxwf-state-clean-tree` |
| `gxwf-roundtrip-validate` | `gxwf-roundtrip-validate-tree` |
| `gxwf-to-format2-stateful` | `gxwf-to-format2-stateful-tree` |
| `gxwf-to-native-stateful` | `gxwf-to-native-stateful-tree` |
| `gxwf-lint-stateful` | `gxwf-lint-stateful-tree` |

### Single-file contract
- **Input:** one workflow file path (error if directory)
- **Content output:** stdout by default, `-o FILE` overrides
- **Reports:** `--report-json`, `--report-markdown` for structured output
- **JSON shape:** flat (`SingleXReport`) — always one workflow
- **Exit codes:** 0=ok, 1=failures, 2=policy error

### Tree contract
- **Input:** one directory path (error if file)
- **Content output:** write files in-place or to `--output-dir DIR` tree. Never stdout.
- **Reports:** `--report-json`, `--report-markdown` for aggregated results
- **JSON shape:** tree (`TreeXReport`) — always N workflows grouped by category
- **Summary:** printed to stderr (counts, per-workflow one-liners)
- **Exit codes:** 0=all ok, 1=any failures, 2=policy error

### Shared contract (both)
- `--populate-cache`, `--tool-source`, `--tool-source-cache-dir`, `-v`
- `--allow`/`--deny` (or `--preserve`/`--strip` for clean)
- `--strict`

---

## Implementation Steps

### Phase 0: Extract `TreeOrchestrator` — shared tree-walking infrastructure

**New file:** `_tree_orchestrator.py`

A generic driver that handles the discover->load->process->aggregate->report loop:

```python
@dataclass
class TreeContext:
    root: str
    tool_info: GetToolInfo
    output_dir: Optional[str] = None

def run_tree(
    ctx: TreeContext,
    process_one: Callable[[WorkflowInfo, dict], T],
    aggregate: Callable[[str, List[Tuple[WorkflowInfo, T]]], TreeReport],
    format_text: Callable[[TreeReport], str],
    format_markdown: Callable[[TreeReport], str],
    report_options: HasReportDests,
    include_format2: bool = True,
) -> int:
    workflows = discover_workflows(ctx.root, include_format2=include_format2)
    results = []
    for info in workflows:
        wf_dict = load_workflow_safe(info)
        if wf_dict is None:
            results.append((info, None))  # load failure
            continue
        result = process_one(info, wf_dict)
        results.append((info, result))
    report = aggregate(ctx.root, results)
    # ... emit reports, compute exit code
```

This eliminates P3 and P7 — the tree loop is written once, discovery is at the orchestration layer, and each command just provides `process_one` + `aggregate`.

**Changes:**
- Move `discover_workflows`, `load_workflow_safe` imports to this module
- Move tree-specific report emission here
- Commands provide only the per-workflow processing function

**populate_cache in tree mode:** `setup_tool_info` in `_cli_common.py` already calls `populate_cache(tool_info, options.workflow_path)` and `populate_cache` already handles directories via `_populate_cache_for_tree`. This means cache population happens before `run_tree()` starts iterating, which is the right behavior — gather all tool defs upfront, then process. No changes needed; the existing `populate_cache(path)` with its own `is_dir` check is fine because it's a cache-priming concern, not a workflow-processing concern. The one improvement: `TreeOrchestrator` could collect the unique tool set from discovered workflows and pass it to a new `populate_cache_for_tools(tool_set)` function to avoid the double-discovery. But this is an optimization we can defer.

### Phase 1: Split `gxwf-state-validate` / `gxwf-state-validate-tree`

**Why first:** Most complex, has the most pain points (P3, P4, P5), good proving ground.

#### Single-file changes (`validate.py`)
- Remove all `os.path.isdir` checks
- Remove `validate_tree()`, `_run_json_schema_validate_tree()`, `_emit_tree_results()`
- Remove `wrap_single_validation()` usage — single-file always emits `SingleValidationReport` + flat text
- Error if `workflow_path` is a directory

#### Connection validation integration
- **Single-file:** `--connections` runs connection validation on the same loaded workflow dict. No second load, no second `is_dir` check. Connection results become part of the same output (appended section in text, merged into `SingleValidationReport`).
- **Tree:** connection validation is just another step in `process_one`. Each workflow gets state validation + connection validation in one pass. Results are merged per-workflow in `TreeValidationReport`.
- **Delete** `_run_connection_validation()` — the standalone function with its own tree loop goes away entirely.

#### New tree script (`scripts/workflow_validate_tree.py`)
- New `ValidateTreeOptions` extending `ToolCacheOptions` with report destinations
- Uses `TreeOrchestrator.run_tree()` with a `process_one` that calls `validate_workflow_cli` + optionally `validate_connections_report`
- Always produces `TreeValidationReport`

#### Fixes: P1, P2, P3, P4, P5, P6, P7

### Phase 2: Split `gxwf-state-clean` / `gxwf-state-clean-tree`

#### Single-file changes (`clean.py`)
- Remove `_run_tree()`, `clean_tree()`
- `--diff` stays (only makes sense for single files — this is now clean)
- Dry-run (no `-o`) = show what would change on stdout. `-o FILE` = write cleaned file.
- Error if `workflow_path` is a directory

#### New tree script
- `CleanTreeOptions` with `--output-dir DIR` (optional, default: in-place) and `--dry-run` (default: true, `--write` or `--no-dry-run` to actually modify)
- `process_one` = clean single workflow, return `CleanResult`
- File writing happens in the orchestrator after `process_one` succeeds (only when not dry-run)
- No `--diff` (tree mode — too noisy, use reports instead)

#### Fixes: P1 (clean dry-run clarity), P3, P6

### Phase 3: Split `gxwf-roundtrip-validate` / `gxwf-roundtrip-validate-tree`

#### Single-file changes (`roundtrip.py`)
- Remove `_run_tree_validation()`
- `--output-native`, `--output-format2` are single-file only (natural)
- Error if `workflow_path` is a directory

#### New tree script
- `RoundTripTreeOptions` — no artifact output flags (use `--report-json` for details)
- `process_one` = `roundtrip_validate()`, return `RoundTripValidationResult`
- `include_format2=False` passed to discovery (roundtrip needs native `.ga` input)
- Summary text to stderr, report files for detail

### Phase 4: Add `gxwf-to-format2-stateful-tree` (new)

Currently `export_format2.py` has **no tree support** despite the infrastructure. Rather than bolting it on, implement it cleanly as a tree command from the start.

#### Single-file changes (`export_format2.py`)
- Add error if `workflow_path` is a directory (just making explicit what already crashes)

#### New tree script
- `ExportTreeOptions` with `--output-dir DIR` (required — no in-place for export since format changes)
- Output naming: `{relative_path_stem}.gxwf.yml` (or `.json` with `--json`)
- `include_format2=False` passed to discovery (export needs native `.ga` input)
- `process_one` = `export_workflow_to_format2()`, return `ExportResult`
- Per-workflow summary to stderr, `--report-json`/`--report-markdown` for structured output

### Phase 5: Add `gxwf-to-native-stateful-tree` (new)

`to_native_stateful.py` is single-file only today (stdout-by-default, `-o FILE`). Tree conversion is a clear use case: convert an entire format2 project to native.

#### Single-file changes (`to_native_stateful.py`)
- Add error if `workflow_path` is a directory

#### New tree script
- `ToNativeTreeOptions` with `--output-dir DIR` (required — output is a different format)
- Output naming: `{relative_path_stem}.ga`
- `include_format2=True`, but filter to format2-only in `process_one` (skip native `.ga` files, since `convert_to_native_stateful` rejects them)
- `process_one` = `convert_to_native_stateful()`, return `ToNativeResult`
- Per-workflow summary line to stderr

### Phase 6: Add `gxwf-lint-stateful-tree` (new)

`lint_stateful.py` composes structural lint + stateful validation for a single file. It currently inherits all the wrapping hacks (P2, P8) and bolt-on connection validation (P4) from validate.py.

#### Single-file changes (`lint_stateful.py`)
- Remove `wrap_single_validation` usage — format directly from step results
- Inline connection validation into the pipeline (no `_run_connection_validation` import)
- Add error if `workflow_path` is a directory

#### New tree script
- `LintStatefulTreeOptions` with report destinations
- `process_one` = `run_structural_lint()` + `validate_workflow_cli()` + optionally `validate_connections_report()`
- Per-workflow: merge lint context + state results + connection results into unified per-workflow result
- Aggregate into tree report

#### Why this matters
Lint is the highest-value tree operation — it's what CI would run against an IWC-style repo. Having `gxwf-lint-stateful-tree path/to/iwc/workflows/ --report-json results.json` as a single command is the end goal for CI integration.

### Phase 7: Clean up report models

With tree/single split, we can simplify:

- **Remove** `wrap_single_validation()`, `wrap_single_clean()` from `_report_models.py`
- Single-file commands use `Single*Report` directly with their own text formatters
- Tree commands use `Tree*Report` directly with tree text formatters
- No wrapping, no shared formatters that require two shapes to be coerced into one
- `format_text()` (single) and `format_tree_text()` (tree) can be simplified since each only serves one caller

---

## What stays shared

- `_cli_common.py` — `ToolCacheOptions`, `build_base_parser()`, `cli_main()`, `setup_tool_info()`
- `_report_output.py` — `emit_reports()`, `write_output()`
- `_tree_orchestrator.py` — new shared tree loop
- `workflow_tree.py` — `discover_workflows()`, `WorkflowInfo`, `load_workflow_safe()`
- Domain functions — `validate_workflow_cli()`, `clean_stale_state()`, `export_workflow_to_format2()`, `roundtrip_validate()`, `convert_to_native_stateful()`, `run_structural_lint()` — all remain single-workflow functions. Tree orchestration calls them in a loop.

---

## Migration

Since nothing has been released, no backward compat needed. If a single-file command receives a directory, print a clear error:
```
Error: got directory, use gxwf-state-validate-tree for batch validation
```

---

## Testing Strategy

- **Existing single-file tests** remain unchanged (they already test single-file paths)
- **Existing IWC sweep tests** (`test_iwc_sweep.py`) become the integration test for tree behavior — they already do the discover->load->process loop
- **New CLI parser tests** for each `-tree` command
- **New integration tests** for `TreeOrchestrator` with a fixture directory containing 2-3 workflows
- **Error tests** — single-file commands reject directories, tree commands reject files

---

## File inventory (new/modified)

| File | Action |
|---|---|
| `_tree_orchestrator.py` | NEW — shared tree loop |
| `scripts/workflow_validate_tree.py` | NEW — CLI entry point |
| `scripts/workflow_clean_tree.py` | NEW — CLI entry point |
| `scripts/workflow_roundtrip_validate_tree.py` | NEW — CLI entry point |
| `scripts/workflow_export_format2_tree.py` | NEW — CLI entry point |
| `scripts/workflow_to_native_stateful_tree.py` | NEW — CLI entry point |
| `scripts/workflow_lint_stateful_tree.py` | NEW — CLI entry point |
| `validate.py` | MODIFY — remove tree paths, simplify, integrate connections |
| `clean.py` | MODIFY — remove tree paths, simplify |
| `roundtrip.py` | MODIFY — remove tree paths, simplify |
| `export_format2.py` | MODIFY — add directory rejection |
| `to_native_stateful.py` | MODIFY — add directory rejection |
| `lint_stateful.py` | MODIFY — remove wrapping, integrate connections, add dir rejection |
| `_report_models.py` | MODIFY — remove wrapping helpers |
| `setup.cfg` | MODIFY — register 6 new console_scripts |

---

## Implementation Order

| Phase | What | Effort |
|---|---|---|
| **0** | `_tree_orchestrator.py` | Small-Medium |
| **1** | validate split (proving ground) | Medium |
| **2** | clean split | Medium |
| **3** | roundtrip split | Small |
| **4** | export-format2 tree (new) | Small |
| **5** | to-native-stateful tree (new) | Small |
| **6** | lint-stateful tree (new, highest CI value) | Medium |
| **7** | Report model cleanup | Small |

Phases 4, 5, 6 can proceed in any order after Phase 0. Phases 1-3 remove existing tree code and depend on Phase 0.
