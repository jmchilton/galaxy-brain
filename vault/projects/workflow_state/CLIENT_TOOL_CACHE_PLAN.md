# Plan: Tool Info Cache & CLI Tooling — IMPLEMENTED

## Status

**Implemented** in commits `cfe3898e87` and `aab87eeca8` on branch `wf_tool_state`.

The ToolShed API bug has since been fixed for most tools, so the API is the primary source. The GitHub source was removed (flakey, unnecessary now). A Galaxy instance API source is stubbed (`NotImplementedError`) for future implementation.

**What was built:**
- `toolshed_tool_info.py` — `ToolShedGetToolInfo` + `CacheIndex` + `CombinedGetToolInfo`
- `workflow_tools.py` — workflow tool extractor (native + format2 + subworkflows)
- `tool_cache.py` — `galaxy-tool-cache` CLI (populate-workflow, add, add-local, list, info, clear)
- `packages/tool_util/setup.cfg` — entry point registered
- 33 unit tests covering all components

**What was deferred:**
- Galaxy instance API source (stubbed, schema mapping non-trivial)
- IWC round-trip integration in `test_roundtrip.py` (Phase 3)

## Context

The ToolShed 2.0 API endpoint `/api/tools/{id}/versions/{version}` (which returns `ParsedTool`) was broken for many tools due to a path computation bug (see `TOOL_SHED_API_BUG.md` — per-version, not per-repo; newer versions may work). We need `ParsedTool` data for toolshed tools to validate IWC workflows in the round-trip pipeline. This plan builds cache infrastructure and CLI tooling that works now (via alternative sources) and seamlessly uses the API when it's fixed.

## Architecture

```
                         ┌───────────────────────┐
                         │  CLI: galaxy-tool-cache │
                         └──────┬────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   ToolShed API         Galaxy Instance API     Local XML File
   (primary)            (stubbed — future)      (manual/cloned)
          │                     │                     │
          ▼                     ▼                     ▼
      JSON resp            (not yet)           get_tool_source()
          │                                    + parse_tool()
          │                                          │
          └─────────────────────┼─────────────────────┘
                                ▼
                   ┌────────────────────────┐
                   │  Local Cache Directory  │
                   │  ~/.galaxy/tool_info_cache/  │
                   │                        │
                   │  index.json            │
                   │  {sha256}.json         │
                   └────────────────────────┘
                                │
                                ▼
                   ToolShedGetToolInfo.get_tool_info()
                   (reads from cache, skips API)
```

## Cache Structure

### Current (from `toolshed_tool_info.py`)
- Files: `{sha256_of(toolshed_url/trs_id/version)}.json`
- Content: `ParsedTool.model_dump_json()`
- No index, no metadata about provenance

### Enhanced
```
~/.galaxy/tool_info_cache/
├── index.json                    # maps cache_key → provenance metadata
├── {sha256}.json                 # ParsedTool JSON (unchanged format)
└── {sha256}.json
```

**index.json schema:**
```json
{
  "entries": {
    "a1b2c3d4...": {
      "tool_id": "toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc",
      "tool_version": "0.74+galaxy0",
      "source": "api",
      "source_url": "https://toolshed.g2.bx.psu.edu/api/tools/...",
      "cached_at": "2026-03-08T..."
    }
  }
}
```

Cache keys are SHA256 of `{toolshed_url}/{trs_tool_id}/{version}` — consistent with existing `_cache_key()` in `toolshed_tool_info.py`. The index adds provenance metadata without changing the cache file format.

The index enables: listing cached tools, knowing provenance, cache invalidation by source.

## Population Sources

### Source 1: ToolShed API (primary, when working)

Existing implementation in `toolshed_tool_info.py`. Fetches pre-built `ParsedTool` JSON from:
```
GET {toolshed_url}/api/tools/{owner~repo~tool_id}/versions/{version}
```

No local parsing needed — the ToolShed does it. Best source when available. Works for repos with recent metadata resets; fails for stale metadata (see `TOOL_SHED_API_BUG.md`). The CLI tries this first and falls back automatically.

### Source 2: GitHub tool wrapper repos — REMOVED

Originally planned to download tool XML + macros from GitHub repos and parse locally. Removed because:
- The ToolShed API was fixed for most tools, making Source 1 reliable
- The GitHub integration was flakey (rate limits, macro resolution edge cases, owner→repo mapping fragility)
- `add-local` covers the cases where a user has a cloned repo

### Source 3: Local tool XML files

For tools already on disk (cloned repos, installed Galaxy, development):
```
galaxy-tool-cache add-local /path/to/tool.xml --tool-id toolshed.../fastqc/0.74+galaxy0
```

Parses XML with `get_tool_source()` + `parse_tool()`, caches result. Useful for development and testing tool wrappers.

### Source 4: Galaxy instance API (stubbed)

Galaxy instances with installed tools expose tool info via `/api/tools/{tool_id}?io_details=true`. The response schema differs significantly from `ParsedTool` (Galaxy's `tool.to_dict()` format vs `ParsedTool` from `model_factory.parse_tool()`), requiring a non-trivial mapping layer.

**Status:** CLI accepts `--source galaxy` but raises `NotImplementedError`. Implement if Sources 1+3 prove insufficient.

## CLI Design

### Entry point

Registered entry point `galaxy-tool-cache` in `packages/tool_util/setup.cfg`, following existing convention (`galaxy-tool-format`, `galaxy-tool-test`, etc.).

Implementation at `lib/galaxy/tool_util/workflow_state/tool_cache.py:main()`.

Uses Galaxy's `get_tool_source()` + `parse_tool()` — no Galaxy server needed, just the library.

Cache dir: `GALAXY_TOOL_CACHE_DIR` env var, default `~/.galaxy/tool_info_cache/`.

### Commands

#### `populate-workflow` — Cache all tools needed by a workflow

```bash
# From a native .ga workflow
galaxy-tool-cache populate-workflow workflow.ga

# From a format2 workflow
galaxy-tool-cache populate-workflow workflow.gxwf.yml

# Specify source preference
galaxy-tool-cache populate-workflow workflow.ga --source api
galaxy-tool-cache populate-workflow workflow.ga --source galaxy  # stubbed

# Custom cache dir
galaxy-tool-cache populate-workflow workflow.ga --cache-dir /path/to/cache
```

Extracts all `tool_id`+`tool_version` pairs from workflow steps, caches each.
For subworkflows, recurses into nested `subworkflow` dicts or `run:` blocks.
Reports: cached, already-cached, failed (with reason).
Tools without explicit version in `tool_id` require `tool_version` from the step; if neither is available, the tool is skipped with a warning.

#### `add` — Cache a single tool

```bash
# By full tool_id (tries API first)
galaxy-tool-cache add toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc/0.74+galaxy0

# By TRS-style ID + version
galaxy-tool-cache add devteam~fastqc~fastqc --version 0.74+galaxy0

# Force specific source
galaxy-tool-cache add devteam~fastqc~fastqc --version 0.74+galaxy0 --source api
```

#### `add-local` — Cache from local XML file

```bash
galaxy-tool-cache add-local /path/to/fastqc.xml \
    --tool-id toolshed.g2.bx.psu.edu/repos/devteam/fastqc/fastqc/0.74+galaxy0
```

#### `list` — Show cached tools

```bash
galaxy-tool-cache list
# Output:
# devteam/fastqc/fastqc  0.74+galaxy0  api     2026-03-08
# iuc/multiqc/multiqc    1.11+galaxy1  api     2026-03-07

galaxy-tool-cache list --json  # machine-readable
```

#### `info` — Show cached tool details

```bash
galaxy-tool-cache info devteam~fastqc~fastqc --version 0.74+galaxy0
# Output: ParsedTool summary (id, name, inputs count, outputs count, source)
```

#### `clear` — Clear cache

```bash
galaxy-tool-cache clear                    # clear all
galaxy-tool-cache clear devteam~fastqc~*   # clear specific tool (all versions)
```

## Implementation Plan

### Step 1: Cache index + enhanced `ToolShedGetToolInfo` — DONE

Extended `toolshed_tool_info.py`:
- `CacheIndex` class: `index.json` read/write alongside existing `{sha256}.json` files
- `populate_from_parsed_tool()`, `list_cached()`, `has_cached()`, `clear_cache()` methods
- `fetch_from_api()`, `load_cached()` public wrappers
- `GALAXY_TOOL_CACHE_DIR` env var support via `get_cache_dir()`
- Backward-compatible: existing cache files backfilled into index on first access

### Step 2: GitHub source — REMOVED

Originally implemented in `toolshed_github.py`, removed after ToolShed API was fixed. The module was flakey (rate limits, macro resolution edge cases, owner→repo mapping).

### Step 3: Workflow tool extraction — DONE

`lib/galaxy/tool_util/workflow_state/workflow_tools.py`:
- `extract_toolshed_tools(workflow_dict)` — returns deduplicated list of `(tool_id, tool_version)`
- `load_workflow(path)` — loads .ga or .gxwf.yml
- Handles native + format2, recurses into subworkflows

### Step 4: CLI entry point — DONE

`galaxy-tool-cache` registered in `packages/tool_util/setup.cfg`.
Implementation at `lib/galaxy/tool_util/workflow_state/tool_cache.py`:
- argparse with subcommands: populate-workflow, add, add-local, list, info, clear
- Sources: ToolShed API (working), Galaxy instance API (stubbed NotImplementedError), local XML
- `--source auto` tries api then galaxy (skips NotImplementedError gracefully)
- No Galaxy server dependency — uses only `galaxy.tool_util` library code

### Step 5: Wire into test harness — PARTIAL

- 2 IWC sample workflows shipped in `test/unit/workflows/iwc/`
- 33 unit tests in `test/unit/tool_util/workflow_state/test_tool_cache.py`
- **Deferred:** IWC round-trip integration in `test_roundtrip.py` (Phase 3)

## Test Plan — DONE (33 tests)

### Unit tests (all passing)
- `TestParseToolshedToolId` — tool_id formats (with/without version, with/without scheme, non-toolshed, too-few-segments)
- `TestCacheIndex` — add, has, remove, clear, persistence across instances, corrupted index recovery
- `TestGetCacheDir` — override, env var, default
- `TestToolShedGetToolInfoCache` — populate + retrieve, list, clear all, backfill index on load
- `TestExtractToolshedTools` — native, format2, subworkflow recursion, dedup, no-toolshed-tools, IWC workflow
- `TestCLIParser` — all subcommand argument parsing
- `TestGalaxySourceStub` — NotImplementedError propagation

### Deferred tests
- IWC round-trip with cached tools (Phase 3)
- Functional tests for `cmd_add_local`, `cmd_info`, `cmd_clear`

## Resolved Questions

- **Cache dir:** `GALAXY_TOOL_CACHE_DIR` env var with `~/.galaxy/tool_info_cache/` default
- **Galaxy API source:** Stubbed with NotImplementedError; implement later if Sources 1+3 insufficient
- **CLI packaging:** Registered entry point (`galaxy-tool-cache`) in `packages/tool_util/setup.cfg`
- **Cache TTL:** None. Tool wrappers at a given version are immutable — manual `clear` sufficient
- **Index key format:** SHA256 of `{toolshed_url}/{trs_tool_id}/{version}` — consistent with existing `_cache_key()`
- **Version-less tools:** Require explicit version (from tool_id or step's `tool_version`); skip with warning if unavailable
