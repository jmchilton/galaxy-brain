# Plan: CLI Tools for Workflow Validation & Stale State Cleanup

## Context

Two bodies of code need CLI entry points in `galaxy-tool-util`:

1. **Workflow validation** — `validation.py` + `validation_native.py` + `validation_format2.py` + `_walker.py` — validates tool_state against tool definitions (type checks, select options, unknown keys)
2. **Stale state stripping** — walker's `check_unknown_keys` infrastructure — identifies/removes keys in tool_state that no longer match the tool's declared inputs

Both use the tool cache (`galaxy-tool-cache`, introduced in aab87eeca8ef) for tool resolution. The ToolShed can serve **both** ToolShed tools (via TRS ID) and stock/builtin tools (simple ID like `Cut1` — via `_stock_tool_source_for()` in `lib/tool_shed/managers/tools.py`). So `ToolShedGetToolInfo` is sufficient for all tools — no need for a separate stock tool resolver.

---

## Shared Infrastructure from `galaxy-tool-cache` (aab87eeca8ef)

The existing `galaxy-tool-cache` CLI establishes patterns the new CLIs must reuse:

### Already exists — reuse directly

| What | Where | Used by new CLIs |
|------|-------|-----------------|
| `load_workflow(path)` | `workflow_tools.py:80` | Both — load .ga/.gxwf.yml |
| `extract_toolshed_tools(workflow_dict)` | `workflow_tools.py:21` | `--populate-cache` flag |
| `ToolShedGetToolInfo(cache_dir=)` | `toolshed_tool_info.py:156` | Both — build GetToolInfo |
| `get_cache_dir(override)` | `toolshed_tool_info.py:36` | Both — resolve `--cache-dir` / `$GALAXY_TOOL_CACHE_DIR` |
| `_add_tool(tool_info, tool_id, version, source)` | `tool_cache.py:33` | `--populate-cache` flag |
| `--cache-dir` flag pattern | `tool_cache.py:232` | Both CLIs |
| `-v`/`--verbose` logging setup | `tool_cache.py:278-285` | Both CLIs |

### Needs extraction to shared module

The `_add_tool()` function and the populate-workflow loop in `tool_cache.py:cmd_populate_workflow` (lines 85-109) contain reusable logic. Rather than importing private functions across modules, extract to a shared helper:

**New file:** `lib/galaxy/tool_util/workflow_state/_cli_common.py`

```python
"""Shared CLI helpers for galaxy-tool-cache, galaxy-workflow-validate,
galaxy-workflow-clean-stale-state."""

from .toolshed_tool_info import ToolShedGetToolInfo, get_cache_dir
from .workflow_tools import extract_toolshed_tools, load_workflow


def add_common_args(parser):
    """Add --cache-dir and -v/--verbose to any argparse parser."""
    parser.add_argument("--cache-dir",
        help="Cache directory (default: $GALAXY_TOOL_CACHE_DIR or ~/.galaxy/tool_info_cache/)")
    parser.add_argument("-v", "--verbose", action="store_true",
        help="Enable verbose logging")


def setup_logging(verbose: bool):
    """Configure logging based on --verbose flag."""
    import logging
    logging.basicConfig(level=logging.DEBUG if verbose else logging.WARNING)


def build_tool_info(cache_dir=None) -> ToolShedGetToolInfo:
    """Build ToolShedGetToolInfo from CLI args."""
    return ToolShedGetToolInfo(cache_dir=cache_dir)


def populate_cache_for_workflow(tool_info, workflow_path, source="auto"):
    """Populate tool cache from a workflow file. Reusable across CLIs."""
    workflow = load_workflow(workflow_path)
    tools = extract_toolshed_tools(workflow)  # will become extract_all_tools after Phase A
    ok, fail = 0, 0
    for tool_id, tool_version in tools:
        if _add_tool(tool_info, tool_id, tool_version, source):
            ok += 1
        else:
            fail += 1
    return ok, fail
```

Then **refactor `tool_cache.py`** to import from `_cli_common.py` instead of defining its own `_add_tool` and arg patterns. This keeps `galaxy-tool-cache` working identically but shares the plumbing.

---

## Stock Tool Cache Scheme

### Problem

`ToolShedGetToolInfo.get_tool_info()` currently requires `/repos/` in tool_id. Stock tools have simple IDs (`Cut1`, `wig_to_bigWig`, `__MERGE_COLLECTION__`). Need to resolve + cache these via ToolShed API.

### Design

**Cache key for stock tools:** Same `_cache_key()` function, just different inputs:
- **toolshed_url**: default ToolShed URL (e.g. `https://toolshed.g2.bx.psu.edu`)
- **trs_tool_id**: the simple tool ID itself (e.g. `Cut1`)
- **version**: tool version from the workflow step, or `_default_` if absent

```
# Toolshed tool cache key:
sha256("https://toolshed.g2.bx.psu.edu/devteam~fastqc~fastqc/0.74+galaxy0")

# Stock tool cache key:
sha256("https://toolshed.g2.bx.psu.edu/Cut1/1.0.2")
```

Same directory, same index.json format. Index entry `tool_id` stores the simple ID. `source` field is `"api"` (same ToolShed API, different endpoint).

### API path

Stock tools served by ToolShed at same TRS endpoint — `_stock_tool_source_for(trs_tool_id, tool_version)` handles resolution server-side. The client just passes the simple ID as the TRS tool ID.

### Code changes to `toolshed_tool_info.py`

1. **`ToolShedGetToolInfo.__init__()`** — new `default_toolshed_url` arg (default: `https://toolshed.g2.bx.psu.edu`), configurable via `GALAXY_TOOLSHED_URL` env var
2. **`get_tool_info()`** — when `parse_toolshed_tool_id()` returns `None`, instead of raising `KeyError`, treat tool_id as a stock tool:
   - Use `self.default_toolshed_url`
   - Use tool_id directly as trs_tool_id
   - Check cache → fetch from API → cache result
3. **`has_cached()`** — same fallback for non-toolshed IDs
4. **`populate_from_parsed_tool()`** — same fallback

### Workflow tool extraction

`workflow_tools.py`'s `extract_toolshed_tools()` currently filters with `if tool_id and "/repos/" in tool_id`. Add `extract_all_tools()` that returns all steps with a non-null `tool_id`. Same return type `List[Tuple[str, Optional[str]]]`. Stock tools without `tool_version` return `(tool_id, None)`.

### Changes to `_cli_common.py` / `tool_cache.py`

`_add_tool()` currently skips non-toolshed tools (`parse_toolshed_tool_id` returns None → SKIP). After Phase A, it needs a stock tool code path: use `default_toolshed_url` + simple ID for cache lookup/fetch. `populate_cache_for_workflow()` switches to `extract_all_tools()`.

---

## Tool 1: `galaxy-workflow-validate`

**Entry point:** `galaxy-workflow-validate = galaxy.tool_util.workflow_state.workflow_validate:main`

**Purpose:** Validate a workflow's tool_state against tool definitions. Supports both native `.ga` and format2 `.gxwf.yml`. Reports per-step validation results.

### CLI Interface

```
galaxy-workflow-validate WORKFLOW [--cache-dir DIR] [--strict] [--json] [--summary] [--populate-cache] [--source api|auto] [-v]
```

### Flags

- Default: validate all steps, report errors
- `--populate-cache`: auto-populate tool cache before validating (calls `_cli_common.populate_cache_for_workflow`)
- `--source`: source preference for `--populate-cache` (default: auto)
- `--strict`: treat warnings as errors (e.g. missing tool defs, tolerated root-level duplicates)
- `--json`: structured JSON output (step index, tool_id, status, errors)
- `--summary`: just counts (pass/fail/skip), no per-step detail

### Implementation

**New file:** `lib/galaxy/tool_util/workflow_state/workflow_validate.py`

```python
from ._cli_common import add_common_args, setup_logging, build_tool_info, populate_cache_for_workflow
from .workflow_tools import load_workflow
from .validation import _format
from .validation_native import validate_step_native
from .validation_format2 import validate_step_format2

def validate_workflow_cli(workflow_path, cache_dir, strict, json_output, populate, source):
    # 1. Load workflow via load_workflow()
    # 2. Detect format via _format()
    # 3. Optionally populate cache via populate_cache_for_workflow()
    # 4. Build GetToolInfo via build_tool_info()
    # 5. Walk steps, call validate_step_native or validate_step_format2 per step
    # 6. Collect results: {step_index, tool_id, tool_version, status, errors[]}
    # 7. Report (text table or JSON)
```

**Key design decisions:**
- Reuse `validate_workflow_native`/`validate_workflow_format2` but wrap per-step to catch exceptions instead of failing on first error
- `ToolShedGetToolInfo` alone is sufficient — stock tools resolvable via ToolShed API with simple IDs
- Exit code: 0 = all pass, 1 = any failures, 2 = missing tool defs (unless `--strict`)

### Non-tool step handling

Steps are skipped (not errors) when:
- `tool_id` is `None`/missing (input/output steps, pause steps)
- `tool_state` is missing or not a JSON string
- `type` is `"subworkflow"` — recurse into embedded subworkflow, same as `validate_workflow_native` (validation_native.py:153)

The CLI wrapper catches both `Exception` (from native validation's `assert`/`raise`) and Pydantic `ValidationError` (from format2 validation's `model_validate`). Both are reported as step-level FAIL with the error message.

### Output Format (text)

```
Step 3: bwa_mem (0.7.17.2) .......... OK
Step 4: fastqc (0.74+galaxy0) ....... FAIL
  Invalid select option found 'obsolete_value'
Step 5: unknown_tool (1.0) .......... SKIP (no tool definition)
---
Summary: 8 OK, 1 FAIL, 1 SKIP
```

### Output Format (JSON)

```json
{
  "workflow": "my_workflow.ga",
  "results": [
    {"step": 3, "tool_id": "bwa_mem", "version": "0.7.17.2", "status": "ok", "errors": []},
    {"step": 4, "tool_id": "fastqc", "version": "0.74+galaxy0", "status": "fail",
     "errors": ["Invalid select option found 'obsolete_value'"]}
  ],
  "summary": {"ok": 8, "fail": 1, "skip": 1}
}
```

---

## Tool 2: `galaxy-workflow-clean-stale-state`

**Entry point:** `galaxy-workflow-clean-stale-state = galaxy.tool_util.workflow_state.workflow_clean_stale_state:main`

**Purpose:** Read a native `.ga` workflow, strip stale tool_state keys (keys not matching current tool input definitions), write cleaned version. Strictly stale key removal only — no `__current_case__` stripping (out of scope), no value coercion fixes (non-issues).

### CLI Interface

```
galaxy-workflow-clean-stale-state WORKFLOW.ga [--output CLEANED.ga] [--in-place] [--dry-run] [--diff] [--cache-dir DIR] [--populate-cache] [--source api|auto] [-v]
```

### Flags

- `--output FILE`: write cleaned workflow to FILE (default: stdout)
- `--in-place`: overwrite input file
- `--dry-run`: report what would be removed, don't write
- `--populate-cache`: auto-populate cache before cleanup (calls `_cli_common.populate_cache_for_workflow`)
- `--source`: source preference for `--populate-cache` (default: auto)
- `--diff`: show diff of changes (implies dry-run unless combined with --output/--in-place)

### Implementation

**New file:** `lib/galaxy/tool_util/workflow_state/workflow_clean_stale_state.py`

```python
from ._cli_common import add_common_args, setup_logging, build_tool_info, populate_cache_for_workflow
from .workflow_tools import load_workflow
```

Core logic — new function using walker infrastructure:

```python
def strip_stale_keys(step, parsed_tool) -> StripResult:
    """Walk tool_state, return cleaned state dict + list of removed keys."""
    tool_state = json.loads(step["tool_state"])
    _decode_double_encoded_values(tool_state)

    removed_keys = []
    cleaned = _strip_recursive(tool_state, parsed_tool.inputs, removed_keys)

    return StripResult(
        original=tool_state,
        cleaned=cleaned,
        removed_keys=removed_keys,
    )
```

Recursive stripping walks the same tree as `walk_native_state` but filters keys:
- Root level: keep keys in tool_inputs + `_NATIVE_BOOKKEEPING_KEYS`
- Conditional level: keep test param + active branch params + `__current_case__`
- Repeat level: recurse into each instance
- Section level: recurse
- Everything else: stale → remove and record

After stripping, re-encode `tool_state` as JSON string and update the step dict.

**Native `.ga` only** — format2 uses structured `state` blocks where stale keys aren't an issue.

### Subworkflow recursion

`clean_stale_state()` must recurse into subworkflows, mirroring `validate_workflow_native()` (validation_native.py:153):

```python
def clean_stale_state(workflow_dict, get_tool_info) -> CleanResult:
    for step_def in workflow_dict["steps"].values():
        if step_def.get("type") == "subworkflow" and "subworkflow" in step_def:
            # Recurse into embedded subworkflows
            sub_result = clean_stale_state(step_def["subworkflow"], get_tool_info)
            result.merge(sub_result)
        else:
            _clean_step(step_def, get_tool_info, result)
```

### Non-tool step handling

Steps must be skipped (no crash) when:
- `tool_id` is `None`/missing (input/output steps, pause steps)
- `tool_state` is missing or not a JSON string
- `type` is `"subworkflow"` (handled by recursion above)

`strip_stale_keys` is only called for steps that have both a `tool_id` and a valid `tool_state` JSON string. Steps without a resolvable tool definition are reported as SKIP, not errors.

### Output (dry-run)

```
Step 3 (bwa_mem 0.7.17.2):
  Removed: algorithm_type, obsolete_param
Step 7 (fastqc 0.74+galaxy0):
  Removed: legacy_flag
---
3 stale keys found across 2 steps
```

### Output (diff)

```diff
--- Step 3 (bwa_mem 0.7.17.2) tool_state
-  "algorithm_type": "backtrack"
-  "obsolete_param": "value"
```

---

## Implementation Steps

### Phase A: Shared CLI infrastructure + stock tool cache

1. **New `_cli_common.py`** — extract `add_common_args()`, `setup_logging()`, `build_tool_info()`, `add_tool()` (promoted from `_add_tool`), `populate_cache_for_workflow()`
2. **Refactor `tool_cache.py`** — import from `_cli_common` instead of defining own `_add_tool`, `_get_tool_info`. Keeps CLI behavior identical.
3. **Extend `ToolShedGetToolInfo`** — `default_toolshed_url` constructor arg; `get_tool_info()` fallback for non-toolshed IDs using simple ID as TRS tool ID
4. **Extend `has_cached()` / `populate_from_parsed_tool()`** — same fallback
5. **Add `extract_all_tools()`** to `workflow_tools.py` — returns all tool steps, not just `/repos/` tools
6. **Update `add_tool()` in `_cli_common`** — handle stock tool IDs (use default_toolshed_url + simple ID)
7. **Tests** — stock tool cache round-trip, cache key uniqueness, refactored tool_cache still passes existing 33 tests

### Phase B: `galaxy-workflow-validate`

1. **`workflow_validate.py`** — CLI with argparse (uses `add_common_args`), per-step error collection wrapping `validate_step_native`/`validate_step_format2`
2. **`setup.cfg`** — add `galaxy-workflow-validate` entry point
3. **Tests** — CLI parser, validation with sample workflows (known-good + known-bad steps)

### Phase C: `galaxy-workflow-clean-stale-state`

1. **`workflow_clean_stale_state.py`** — CLI with argparse (uses `add_common_args`)
2. **Core function** `strip_stale_keys(step, parsed_tool)` — uses `_walker.py` key-set infrastructure
3. **Workflow-level** `clean_stale_state(workflow_dict, get_tool_info)` — iterates steps + subworkflows, strips, returns modified workflow + report
4. **`setup.cfg`** — add `galaxy-workflow-clean-stale-state` entry point
5. **Tests** — workflow with known stale keys, assert removal + valid key preservation

### Phase D: Red-to-green testing with IWC workflows

- Populate cache for IWC workflows (now includes stock tools)
- Validate → expect specific per-step results
- Clean → validate after clean should produce fewer/no stale key errors
- Test all output modes: `--dry-run`, `--diff`, `--json`, `--in-place`

---

## setup.cfg additions

```ini
console_scripts =
        ...existing...
        galaxy-workflow-validate = galaxy.tool_util.workflow_state.workflow_validate:main
        galaxy-workflow-clean-stale-state = galaxy.tool_util.workflow_state.workflow_clean_stale_state:main
```
