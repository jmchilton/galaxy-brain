# Phase 6: Format2 Export — Detailed Plan

## Motivation

`gxformat2.from_galaxy_native()` converts native `.ga` to format2 structure but produces `tool_state` (JSON strings) because it has no tool definitions. The schema-aware conversion in `convert_state_to_format2()` already exists and produces clean `state` + `in` blocks — but there's no way to apply it to a whole workflow outside of test code.

Two audiences:
- **CLI users** (IWC maintainers, workflow developers, CI) — need offline export using the tool cache
- **Galaxy server** — needs live export using the toolbox (has instantiated tools)

Plan separates these so CLI tooling ships first, entirely in `galaxy-tool-util`.

---

## 6.0: Refactor `test_roundtrip.py` → `roundtrip.py` — DONE

**Commit:** `d1aed972e0`, refined in `96796ce6f2`

Extracted all reusable logic from `test/unit/workflows/test_roundtrip.py` into `lib/galaxy/tool_util/workflow_state/roundtrip.py`:

- **Data types:** `FailureClass`, `StepResult`, `RoundTripResult`, `RoundTripValidationResult`
- **Comparison logic:** `SKIP_KEYS`, `compare_tool_state`, `compare_connections`, `compare_steps`, `compare_workflow_steps`, `_values_equivalent`
- **Pipeline:** `roundtrip_native_step`, `roundtrip_native_workflow`, `roundtrip_validate` (canonical), `full_roundtrip_native` (delegates to `roundtrip_validate`)
- **Shared helpers:** `ensure_export_defaults`, `replace_tool_state_with_format2_state`, `find_matching_native_step`
- **CLI support:** `RoundTripValidateOptions`, `format_validation_text`, `run_roundtrip_validate`

`test_roundtrip.py` is now a thin wrapper: loaders, workflow inventories, sweep runners, pytest classes. Tests use `roundtrip_validate`/`RoundTripValidationResult` directly — `FullRoundTripResult` was removed from the library.

**Review fixes applied:** `_values_equivalent` bool/string precedence fixed; `full_roundtrip_native` delegates to `roundtrip_validate` (single pipeline); unused imports removed.

---

## 6.1: `galaxy-workflow-export-format2` CLI — DONE

**Commit:** `fc1fbcd85c`

**Package:** `galaxy-tool-util` (no Galaxy server dependency)
**Entry point:** `galaxy-workflow-export-format2 = galaxy.tool_util.workflow_state.scripts.workflow_export_format2:main`
**Tool lookup:** `ToolShedGetToolInfo` (tool cache) + stock tool source

### Files

- `lib/galaxy/tool_util/workflow_state/export_format2.py` — core `export_workflow_to_format2()`, `ExportResult`/`StepExportStatus` dataclasses, `ExportOptions`, formatters, `run_export()` entry point
- `lib/galaxy/tool_util/workflow_state/scripts/workflow_export_format2.py` — thin CLI parser
- `packages/tool_util/setup.cfg` — entry point added
- `lib/galaxy/tool_util/workflow_state/__init__.py` — `export_workflow_to_format2` exported

### Interface

```
galaxy-workflow-export-format2 workflow.ga [--output FILE] [--json]
                                           [--populate-cache] [--strict] [--diff]
```

| Flag               | Behavior                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `--output`         | Write format2 to file (default: stdout, summary to stderr)               |
| `--json`           | Output JSON instead of YAML (default: YAML)                              |
| `--populate-cache` | Auto-fetch uncached ToolShed tools before converting                     |
| `--strict`         | Fail on any step that can't be converted (default: best-effort fallback) |
| `--diff`           | Show unified diff vs naive `from_galaxy_native()` output                 |

### Design decisions

- Structural conversion owned by `gxformat2` — we trust `from_galaxy_native()` and only replace `tool_state` → `state`+`in` per tool step
- Uses shared `ensure_export_defaults` and `find_matching_native_step` from `roundtrip.py`
- `find_matching_native_step` does NOT fall back to tool_id-only matching (ambiguous for duplicate tools)

### Tested

- 14 stock test workflows (28 tool steps) — all convert cleanly
- IWC interproscan workflow — both ToolShed tools convert
- Missing tool workflow — graceful fallback (default), clean error (strict)
- 18/18 existing roundtrip tests pass

---

## 6.2: `galaxy-workflow-roundtrip-validate` CLI — DONE

**Commit:** `7ebef1fa27`

**Package:** `galaxy-tool-util`
**Entry point:** `galaxy-workflow-roundtrip-validate = galaxy.tool_util.workflow_state.scripts.workflow_roundtrip_validate:main`

### Files

- `roundtrip.py` — `roundtrip_validate()`, `RoundTripValidationResult`, `RoundTripValidateOptions`, `format_validation_text`, `run_roundtrip_validate()`
- `lib/galaxy/tool_util/workflow_state/scripts/workflow_roundtrip_validate.py` — thin CLI parser
- `packages/tool_util/setup.cfg` — entry point added

### Interface

```
galaxy-workflow-roundtrip-validate workflow.ga [--populate-cache] [--strip-bookkeeping]
                                               [--output-native FILE] [--output-format2 FILE] [-v]
```

| Flag | Behavior |
|------|----------|
| positional | Path to .ga file or directory (auto-detected) |
| `--populate-cache` | Auto-fetch uncached ToolShed tools |
| `--strip-bookkeeping` | Strip bookkeeping keys before comparison |
| `--output-native FILE` | Write reimported native for inspection |
| `--output-format2 FILE` | Write intermediate format2 for inspection |
| `-v` | Per-step failure details and diffs |

Exit code 0 = all OK, 1 = failures.

### Tested

- Stock test workflows: 13/17 OK (4 fail due to missing tools — expected)
- IWC interproscan: OK
- Directory mode works (auto-discovers .ga files)
- Output artifact flags work
- 18/18 existing roundtrip tests pass

---

## 6.3: Galaxy API endpoint (format2 export)

**Package:** `galaxy` (web server)
**Endpoint:** `GET /api/workflows/{id}/download?format=format2`
**Status:** Not started

### Key difference from CLI

The Galaxy server has instantiated `Tool` objects in its toolbox. No need for the ToolShed API cache — the `GetToolInfo` implementation wraps the toolbox directly.

### Implementation

**New GetToolInfo in Galaxy server:**

```python
class ToolboxGetToolInfo:
    """GetToolInfo backed by a live Galaxy toolbox."""

    def __init__(self, app):
        self.app = app

    def get_tool_info(self, tool_id: str, tool_version: Optional[str]) -> ParsedTool:
        tool = self.app.toolbox.get_tool(tool_id, tool_version=tool_version)
        if tool is None:
            raise ToolNotFoundError(tool_id, tool_version)
        return tool.to_parsed_tool()  # or equivalent
```

**Endpoint change:** In `lib/galaxy/webapps/galaxy/api/workflows.py`:

```python
if format == "format2":
    get_tool_info = ToolboxGetToolInfo(trans.app)
    result = export_workflow_to_format2(workflow_dict, get_tool_info)
    # Return format2 YAML or JSON based on Accept header
```

### Fallback behavior

Same best-effort semantics as CLI: steps that fail conversion keep `tool_state`. Response includes metadata listing which steps fell back.

### `Tool.to_parsed_tool()` — Research Complete

**No such method exists.** Research findings:

**`ParsedTool`** is a Pydantic BaseModel in `galaxy.tool_util_models` with fields: `id`, `version`, `name`, `description`, `inputs: List[ToolParameterT]`, `outputs`, `citations`, `license`, `profile`, `edam_operations`, `edam_topics`, `xrefs`, `help`.

**Existing paths to `ParsedTool`:**
1. **From `ToolSource`** — `parse_tool(tool_source)` in `galaxy.tool_util.model_factory` (used by ToolShed API, `gx_validator.py`)
2. **From ToolShed API** — `parsed_tool_model_for()` in `lib/tool_shed/managers/tools.py` → gets ToolSource → calls `parse_tool()`

**What the live `Tool` object already has:**
- `tool.parameters` → `list[ToolParameterT]` — **same type as `ParsedTool.inputs`**, already computed during init via `input_models_for_pages()`
- `tool.id`, `tool.version`, `tool.name`, `tool.description` — direct attributes
- `tool.outputs`, `tool.citations`, `tool.license`, `tool.profile`, `tool.edam_operations`, `tool.edam_topics`, `tool.xrefs`, `tool.raw_help` — all available

**The gap is a ~15-line assembly method:**
```python
def to_parsed_tool(self) -> ParsedTool:
    return ParsedTool(
        id=self.id,
        version=self.version,
        name=self.name,
        description=self.description,
        inputs=self.parameters or [],
        outputs=...,  # convert self.outputs dict to list
        citations=...,
        license=self.license,
        profile=self.profile,
        edam_operations=self.edam_operations,
        edam_topics=self.edam_topics,
        xrefs=self.xrefs,
        help=...,
    )
```

**Key insight:** `tool.parameters` is already `list[ToolParameterT]` — the expensive part (parsing XML inputs into Pydantic models) is already done. The remaining fields are trivial attribute copies. The `outputs` conversion (from `dict[str, ToolOutput]` to `list[ToolOutput]`) is the only non-trivial mapping.

**Alternative approach:** Since `gx_validator.py`'s `GalaxyGetToolInfo` already builds `ParsedTool` from stock tool sources via `parse_tool(tool_source)`, the `ToolboxGetToolInfo` adapter could do the same — get the tool's `ToolSource` from the toolbox and call `parse_tool()`. This avoids adding a method to the Tool class entirely. Trade-off: re-parses from XML each time vs assembling from already-parsed attributes.

---

## 6.4: Round-trip validation gate for API

**Status:** Not started

Optional enhancement: before returning format2 from the API, run `roundtrip_validate()` on the result. If any step fails round-trip, include a warning in the response. If `strict=true` query param, return 422 instead.

Low priority — the CLI `galaxy-workflow-roundtrip-validate` is the primary validation tool. The API gate is a convenience.

---

## Implementation Order

| Step | Delivers | Status |
|------|----------|--------|
| 6.0 | Refactor `test_roundtrip.py` → `roundtrip.py` | **DONE** (`d1aed972e0`, `96796ce6f2`) |
| 6.1 | `galaxy-workflow-export-format2` CLI | **DONE** (`fc1fbcd85c`) |
| 6.2 | `galaxy-workflow-roundtrip-validate` CLI | **DONE** (`7ebef1fa27`) |
| 6.3a | `Tool.to_parsed_tool()` bridge (if missing) | Not started |
| 6.3b | `ToolboxGetToolInfo` adapter | Not started |
| 6.3c | API endpoint `format=format2` | Not started |
| 6.4 | Round-trip validation gate | Not started |

**6.0–6.2 are complete and purely in `galaxy-tool-util`.** No Galaxy server dependency.

6.3 is the Galaxy server integration and can follow later.

---

## Testing

### 6.0 tests — DONE

- Refactored `test_roundtrip.py` stays green (18/18 pass)
- Tests migrated from `full_roundtrip_native`/`FullRoundTripResult` to `roundtrip_validate`/`RoundTripValidationResult`

### 6.1 tests — DONE (manual)

- 14 stock workflows (28 steps) — all convert
- IWC interproscan — both ToolShed tools convert
- Missing tool — graceful fallback / strict error
- `--diff`, `--json`, `--output` modes verified

### 6.2 tests — DONE (manual)

- Single file and directory mode verified
- `--output-format2`/`--output-native` artifact dump verified
- IWC interproscan round-trips cleanly

### 6.3 tests

- API test: `GET /api/workflows/{id}/download?format=format2` returns valid format2 YAML
- API test: re-import the format2 output, compare to original

---

## Unresolved Questions

- **`ToolboxGetToolInfo` strategy**: Add `Tool.to_parsed_tool()` (assembles from already-parsed attributes, fast) vs use `parse_tool(tool.tool_source)` (re-parses XML, no Tool class changes)? Former is cleaner, latter is zero-touch.
- **Caching in `ToolboxGetToolInfo`**: Should parsed tools be cached per-request or per-toolbox-reload? `tool.parameters` is already cached on the Tool object, so assembly is cheap — probably no caching needed.
