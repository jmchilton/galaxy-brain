# Declarative Cache Golden Tests

## Goal

Add a YAML-driven test suite that exercises the full tool ID resolution + cache key + cache read pipeline against golden fixture data. The same YAML manifest and golden cache files become the cross-language contract when we build the Node proxy package for the VS Code extension.

## Status

**COMPLETE** — Commit `a05b6f8215` on `wf_tool_state_applications`.

### What Was Built

1. **`cache_golden.yaml`** — manifest with 4 real tools (fastqc, multiqc, trimmomatic, cat1), unparseable IDs, and version-from-separate-arg cases
2. **`cache_golden/`** — golden cache directory with real ToolShed API responses (not synthetic)
3. **`test_tool_caching_golden.py`** — 11 tests across 5 classes
4. **`generate_golden_cache.py`** — regeneration script that fetches fresh from the ToolShed API

### Design Decisions

- **Real ToolShed data** over synthetic — golden files contain actual ParsedTool API responses for fastqc, multiqc, trimmomatic, cat1. This tests real input structures (conditional, repeat, select, data, boolean, integer, text params) and catches shape drift in the ParsedTool model.
- **Rich assertions** — manifest declares expected input_names, input_types (parameter_type), output_names, output_count, citation_count, edam_operations, description. Shared `_assert_tool_matches()` helper checks all declared fields. If ParsedTool shape changes, tests pinpoint exactly what broke.
- **Stock tool (cat1)** — exercises the non-toolshed resolution path (tool_id as TRS ID, default_toolshed_url). Confirms edam_operations come through correctly.
- **Trimmomatic** chosen for diverse param types: `gx_conditional`, `gx_repeat`, `gx_select`, `gx_boolean`. 9 outputs including collections.
- **Explicit `default_toolshed_url`** in test fixture — prevents env var `GALAXY_TOOLSHED_URL` from breaking tests.
- **Cache key algorithm documented in manifest header** — `sha256("{toolshed_url}/{trs_tool_id}/{tool_version}")` so Node.js devs don't need to read Python source.

### Test Coverage

| Class | Tests | What it exercises |
|---|---|---|
| `TestToolshedTools` | 2 | parse + cache_key, full cache load with rich assertions |
| `TestStockTools` | 2 | cache_key for stock tools, cache load with assertions |
| `TestUnparseableToolIds` | 1 | 4 tool IDs that should return None |
| `TestVersionFromSeparateArg` | 3 | parse yields None version, same key as embedded, full cache load |
| `TestGoldenIntegrity` | 3 | all JSON valid as ParsedTool, manifest↔golden consistency, index↔golden consistency |

## Files

```
test/unit/tool_util/workflow_state/
  cache_golden/                      # real ToolShed API responses
    index.json                       # CacheIndex with 4 entries
    {sha256_fastqc}.json             # devteam/fastqc 0.74+galaxy0
    {sha256_multiqc}.json            # iuc/multiqc 1.11+galaxy1
    {sha256_trimmomatic}.json        # pjbriggs/trimmomatic 0.39+galaxy2
    {sha256_cat1}.json               # stock cat1 1.0.0
  cache_golden.yaml                  # manifest driving the tests
  generate_golden_cache.py           # fetch from ToolShed API, write golden dir
  test_tool_caching_golden.py        # pytest file consuming the manifest
```

## Resolved Questions

- **generate_golden.py: committed script or pytest fixture?** → Committed script. Simpler, no pytest flag complexity. Run manually when manifest changes.
- **Real or synthetic ParsedTool?** → Real ToolShed API responses. Shape drift concern mitigated by rich per-field assertions that pinpoint exactly what changed.
- **Stock tool: real or synthetic?** → Real. cat1 fetches fine from the ToolShed API via the stock tool resolution path.
- **Node YAML concern?** → Documented cache key algorithm in manifest header. js-yaml is lightweight.
