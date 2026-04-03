# CLI Convergence Plan: gxwf-* Namespace Unification

**Date:** 2026-03-28
**Branch (Galaxy):** `wf_tool_state`
**Branch (gxformat2):** `abstraction_applications`
**Status:** IN PROGRESS

## Motivation

The galaxy-tool-util workflow CLIs (`galaxy-workflow-*`) exist in a separate naming namespace from the gxformat2 CLIs (`gxwf-*`). The gxformat2 commands are structural (no tool defs), the galaxy-tool-util commands are schema-aware (need tool defs). They should feel like one cohesive toolkit — the `gxwf-*` namespace already exists and is the right home. The stateful variants extend the structural ones by adding tool-definition awareness.

This plan:
1. Renames the galaxy-tool-util CLIs into the `gxwf-*` namespace
2. Converges `gxwf-to-format2` and `gxwf-to-format2-stateful` in structure/options
3. Implements `gxwf-to-native-stateful` (format2→native with schema-aware encoding)
4. Implements `gxwf-lint-stateful` (structural lint + tool state validation)

Since nothing has been released, we optimize for clean abstractions over backward compat.

---

## Step 0: Rename Galaxy CLI Entry Points — COMPLETE

**Commit:** `8b0f33d91f`

Renamed all `galaxy-workflow-*` commands to `gxwf-*`:

| Old Name | New Name |
|---|---|
| `galaxy-workflow-validate` | `gxwf-state-validate` |
| `galaxy-workflow-clean-stale-state` | `gxwf-state-clean` |
| `galaxy-workflow-roundtrip-validate` | `gxwf-roundtrip-validate` |
| `galaxy-workflow-export-format2` | `gxwf-to-format2-stateful` |
| `galaxy-tool-cache` | `galaxy-tool-cache` (kept — not workflow-specific) |

Files changed: `setup.cfg`, 4 script files (docstrings + `prog=`), `wf_tooling.md` (~40 references).

---

## Step 1: Converge gxwf-to-format2 CLI Options — COMPLETE

**Commits:** `4379a59617` (convergence), `e630b900a7` (remove --diff)

### What Was Done

**gxformat2 side** (`export.py` — uncommitted, on `abstraction_applications` branch):
- Output to **stdout by default** (was: write to INPUT.gxwf.yml)
- Added `-o`/`--output` flag as alternative to positional OUTPUT
- Added `--json` flag for JSON output format

**galaxy-tool-util side:**
- Added `--compact` flag to `gxwf-to-format2-stateful`
- Wired through `ExportOptions` → `export_workflow_to_format2()` → `ConversionOptions(compact=...)`
- Naive format2 in `--diff` also respects `--compact` for apples-to-apples comparison
- **Removed `--diff`** — deemed not useful enough to justify the complexity

### Converged Interface

Both `gxwf-to-format2` and `gxwf-to-format2-stateful` now share:
- `--compact` — strip position information
- `--json` — JSON output instead of YAML
- `-o FILE` — output to file
- stdout by default when no output specified

Remaining differences are all inherently tool-definition-dependent:

| Stateful-only flags | Purpose |
|---|---|
| `--populate-cache` | Auto-fetch tool defs |
| `--tool-source` | Where to fetch tool defs |
| `--strict` | Fail if any step can't be schema-convert |
| `--allow`/`--deny` | Stale key policy |
| Directory input | Batch conversion |

---

## Step 2: Implement gxwf-to-native-stateful — COMPLETE

**Commit:** `7c9b9dc2c0`

### What Was Built

1. **`to_native_stateful.py`** — core module:
   - `convert_to_native_stateful(path, get_tool_info, strict)` → `ToNativeResult`
   - Loads file via `ordered_load_path`, rejects native input (would bypass encoder)
   - Calls `to_native()` with `state_encode_to_native` callback wrapping `make_encode_tool_state()`
   - `StepEncodeStatus` / `ToNativeResult` — per-step tracking (parallel to export's `StepExportStatus` / `ExportResult`)
   - `ToNativeOptions` extends `ToolCacheOptions`, `run_to_native()` entry point
   - `EncodeError` for strict-mode failures

2. **`scripts/workflow_to_native_stateful.py`** — thin CLI entry point via `cli_main()`

3. **`setup.cfg`** — registered `gxwf-to-native-stateful` console script

4. **Tests** — `TestToNativeStatefulCLIParser` in `test_tool_cache.py` (5 tests: basic, -o, --strict, --populate-cache, -v)

### CLI Interface

```
gxwf-to-native-stateful INPUT [-o FILE] [--strict] [--populate-cache] [--tool-source shed|galaxy|auto] [-v]
```

### Design Decisions

- **Rejects native .ga input** — `ensure_native()` short-circuits on native input, bypassing the encoder callback entirely. Instead we use `to_native()` directly and detect+reject native format upfront.
- **`workflow_directory` set** — passed to `ConversionOptions` so relative `@import` subworkflow refs resolve correctly.
- **Step counter** — callback gets minimal step dict (only `tool_id`, `tool_version`), so `step_id` uses a counter rather than step label/index.

### Deferred

- **Post-conversion validation** (`--validate` flag) — plan mentioned optional validation via `validate_workflow_native()`, deferred to Step 5
- **Directory/batch input** — consistent with export (also single-file only), defer to later
- **Shared orchestration extraction** — `export_format2.py` and `to_native_stateful.py` share clear patterns (status dataclass, result model, callback factory, format_summary, run_*), but extraction deferred until both are stable

---

## Step 3: Implement gxwf-lint-stateful — COMPLETE

**Commit:** `0ef61c0b28`

### Design Decision

**Used Option A** — separate `gxwf-lint-stateful` command in galaxy-tool-util. Clean dependency direction: galaxy-tool-util imports and delegates to gxformat2's lint functions, then adds stateful checks.

### What Was Built

1. **`lint_stateful.py`** — core module:
   - `run_structural_lint(workflow_dict, ...)` → `LintContext` — mirrors gxformat2's `main()` but returns context instead of printing/exiting, enabling composition
   - `run_lint_stateful(options)` → exit code — two-phase pipeline: structural lint then stateful validation
   - `format_lint_header()` / `format_combined_text()` — unified output formatting
   - `_lint_context_exit_code()` / `_combined_exit_code()` — merged exit code logic
   - `LintStatefulOptions` — combines gxwf-lint args + gxwf-state-validate args

2. **`scripts/workflow_lint_stateful.py`** — thin CLI entry point

3. **`setup.cfg`** — registered `gxwf-lint-stateful` console script

4. **Tests** — `TestLintStatefulCLIParser` in `test_tool_cache.py` (9 tests)

### CLI Interface

```
gxwf-lint-stateful INPUT [--strict] [--summary] [--connections]
    [--skip-best-practices] [--training-topic TOPIC]
    [--allow CAT] [--deny CAT]
    [--populate-cache] [--tool-source shed|galaxy|auto]
    [--report-json [FILE]] [--report-markdown [FILE]] [-v]
```

### Design Notes

- **No gxformat2 changes needed** — existing public lint APIs (`lint_ga`, `lint_format2`, `lint_pydantic_validation`, `lint_best_practices_ga`, `lint_best_practices_format2`) were sufficient for composition. Did not need the planned `lint_workflow() -> LintResult` unified API.
- **Two private imports** — `_try_build_nf2` and `_try_build_nnw` are still private gxformat2 APIs. No public equivalents exist for building validated models with error accumulation. Could propose making these public in gxformat2.
- **Both phases always run** — structural errors don't block stateful checks (unless precheck fails on legacy encoding)
- **Exit codes** — combined logic: lint errors OR state failures = 1, strict skips = 2, lint warnings only = 1, clean = 0

### Deferred

- **`LintResult` structured model in gxformat2** — not needed since `LintContext` was sufficient
- **Callback protocol (Option B)** — may still be worth doing later for a unified `gxwf-lint --stateful` experience
- **Structural lint findings in JSON/markdown reports** — `--report-json` only includes stateful results currently

---

## Step 4: Converge gxwf-to-native CLI Options (gxformat2 side) — COMPLETE

**Commit:** `212bc6e` (gxformat2 `abstraction_applications` branch)

Combined with the Step 1 export.py changes in a single commit:

1. **`converter.py` (gxwf-to-native):**
   - Stdout by default (was: required output path or auto-generated `INPUT.gxwf.yml`)
   - Added `-o FILE` option
   - Fixed bug: `workflow_directory` was `os.path.abspath(format2_path)` (the file), now `os.path.dirname(...)` (the parent dir)

2. **`export.py` (gxwf-to-format2):**
   - Stdout by default (was: required output path or auto-generated `INPUT.gxwf.yml`)
   - Added `-o FILE` option, `--json`, `--compact`
   - Fixed typo in help: `.gxfw.yml` → `.gxwf.yml`

### Converged Interface (both commands)

| Flag | gxwf-to-native | gxwf-to-format2 |
|---|---|---|
| Positional INPUT | yes | yes |
| Positional OUTPUT | yes (optional) | yes (optional) |
| `-o FILE` | yes | yes |
| stdout default | yes | yes |
| `--compact` | — | yes |
| `--json` | — | yes (native is always JSON) |

### Deferred

- **Directory/batch input** — neither command supports it yet, consistent with stateful variants

---

## Step 5: Update Documentation and Tests

- Update `doc/source/dev/wf_tooling.md` with new commands in the quick reference table
- Add CLI parser tests for new commands
- Add integration tests for `gxwf-to-native-stateful` using IWC workflows
- Add integration tests for `gxwf-lint-stateful` using IWC workflows
- Update the architecture diagram to show the convergence

---

## Final CLI Landscape

```
┌─────────────────────────────────────────────────────────────────────┐
│                          planemo                                    │
│  workflow_lint  run  test  autoupdate  workflow_test_init           │
├─────────────────────────────────────────────────────────────────────┤
│                   galaxy-tool-util (stateful)                       │
│  Schema-aware · uses ParsedTool from ToolShed 2.0                  │
│                                                                     │
│  gxwf-state-validate        gxwf-state-clean                       │
│  gxwf-roundtrip-validate    gxwf-lint-stateful                     │
│  gxwf-to-format2-stateful   gxwf-to-native-stateful               │
│  galaxy-tool-cache                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                    gxformat2 (structural)                            │
│  No tool definitions · format conversion · structural lint          │
│                                                                     │
│  gxwf-lint  gxwf-to-native  gxwf-to-format2                       │
│  gxwf-viz   gxwf-abstract-export                                   │
│                                                                     │
│  Callback slots:                                                    │
│    state_encode_to_format2 · state_encode_to_native                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

| Phase | Steps | Package | Effort |
|---|---|---|---|
| **A** | 0 (rename) | galaxy-tool-util | ~~Small~~ **DONE** |
| **B** | 1 (converge format2 export options) | both | ~~Small~~ **DONE** |
| **C** | 2 (gxwf-to-native-stateful) | galaxy-tool-util | ~~Medium~~ **DONE** |
| **D** | 3 (gxwf-lint-stateful) | both | ~~Medium~~ **DONE** |
| **E** | 4 (converge gxwf-to-native options) | gxformat2 | ~~Small~~ **DONE** |
| **F** | 5 (docs + tests) | both | Medium |

C and D can proceed in parallel. E is independent.

---

## Unresolved Questions

- Should `gxwf-to-format2-stateful` also accept format2 input (validate + re-export)? Or is that just `gxwf-state-validate`?
- Should `gxwf-to-native-stateful` add `setup_connected_values()` + validation, or just encoding? (Roundtrip already validates — should standalone conversion also?)
- Do we want a `gxwf-roundtrip` that isn't just validate but actually outputs both artifacts? (The current `--output-native`/`--output-format2` flags on roundtrip-validate already do this)
- Should `galaxy-tool-cache` also get a `gxwf-*` name? e.g. `gxwf-tool-cache`? It's tool-specific not workflow-specific, but it's only used in the workflow context.
- For `gxwf-lint-stateful` — should structural lint failures prevent stateful lint from running? Or always run both and merge?
- Should `gxwf-to-native` in gxformat2 gain `--validate` that does structural-only validation of the output? (Cheap check, no tool defs)
- The `-stateful` suffix is descriptive but verbose. Alternatives: `-s` flag on the structural command that enables stateful mode? `gxwf-to-format2+` / `gxwf-lint+`? Just accept the verbosity?
