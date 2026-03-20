# Implement `--tool-source galaxy` and Remove Builtin Tool Hack

## Context

Expression tools (`param_value_from_file`, `pick_value`) can't be resolved during connection validation because:
1. ToolShed returns 500 for `pick_value`, 404 for `param_value_from_file`
2. `_try_builtin_tool()` in `toolshed_tool_info.py` only scans `lib/galaxy/tools/`, missing `tools/expression_tools/`
3. `stock_tool_sources()` in `stock.py` also misses expression tools

The `_try_builtin_tool` hack hardcodes Galaxy source paths — won't work for PyPI-published CLI tools. Instead: implement `--tool-source galaxy` to fetch ParsedTool from a running Galaxy instance's API, and fix `stock_tool_sources()` so Galaxy serves those tools.

## Implementation

### Commit 1: stock_tool_sources fix (cherry-pick ready)

**DONE** — committed as `8764db50b8`.

**File:** `lib/galaxy/tools/stock.py` — added `tools/expression_tools/` to `stock_tool_paths()`.

### Commit 2: Galaxy API tool endpoints mirroring ToolShed (cherry-pick ready)

**File:** `lib/galaxy/webapps/galaxy/api/tools.py`

Mirror the ToolShed's `tool_shed/webapp/api2/tools.py` endpoints. All endpoints support two URL patterns — query param style (Galaxy convention) and path-based style (matching ToolShed):

#### 2a. `/api/tools/{tool_id}/parsed` — ParsedTool JSON

```
GET /api/tools/{tool_id}/parsed?tool_version=X
GET /api/tools/{tool_id}/versions/{tool_version}/parsed
```

Returns `ParsedTool` JSON. Mirrors ToolShed's `show_tool` → `parsed_tool_model_cached_for()`.

```python
def parsed(self, trans, id, **kwd):
    tool_version = kwd.get("tool_version")
    tool = self.service._get_tool(trans, id, user=trans.user, tool_version=tool_version)
    parsed = parse_tool(tool.tool_source)
    return parsed.model_dump(mode="json")
```

#### 2b. `/api/tools/{tool_id}/parameter_request_schema` — Request state JSON schema

```
GET /api/tools/{tool_id}/parameter_request_schema?tool_version=X
GET /api/tools/{tool_id}/versions/{tool_version}/parameter_request_schema
```

Returns JSON schema for `RequestToolState`. Mirrors ToolShed's `tool_state_request`.

#### 2c. `/api/tools/{tool_id}/parameter_landing_request_schema`

```
GET /api/tools/{tool_id}/parameter_landing_request_schema?tool_version=X
GET /api/tools/{tool_id}/versions/{tool_version}/parameter_landing_request_schema
```

Returns JSON schema for `LandingRequestToolState`. Mirrors ToolShed's `tool_state_landing_request`.

#### 2d. `/api/tools/{tool_id}/parameter_test_case_xml_schema`

```
GET /api/tools/{tool_id}/parameter_test_case_xml_schema?tool_version=X
GET /api/tools/{tool_id}/versions/{tool_version}/parameter_test_case_xml_schema
```

Returns JSON schema for `TestCaseToolState`. Mirrors ToolShed's `tool_state_test_case_xml`.

All endpoints: anonymous access, matching existing `show` endpoint. This commit touches only `lib/galaxy/webapps/galaxy/api/tools.py` and its tests — no workflow_state changes.

### Commit 3: Implement `--tool-source galaxy` and remove builtin hack

#### 3a. Add `fetch_from_galaxy()` to ToolShedGetToolInfo

**File:** `lib/galaxy/tool_util/workflow_state/toolshed_tool_info.py`

```python
def fetch_from_galaxy(self, galaxy_url: str, tool_id: str, tool_version: str, api_key: Optional[str] = None) -> ParsedTool:
    encoded_id = urllib.parse.quote(tool_id, safe='')
    url = f"{galaxy_url}/api/tools/{encoded_id}/parsed"
    if tool_version:
        url += f"?tool_version={tool_version}"
    headers = {"Accept": "application/json"}
    if api_key:
        headers["x-api-key"] = api_key
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
    return ParsedTool.model_validate(data)
```

Add `galaxy_url` and `galaxy_api_key` as optional constructor params with env var fallback (`GALAXY_URL`, `GALAXY_API_KEY`).

#### 3b. Wire `--tool-source galaxy` in CLI

**File:** `lib/galaxy/tool_util/workflow_state/_cli_common.py` — add `add_galaxy_args(parser)` helper

**File:** `lib/galaxy/tool_util/workflow_state/scripts/tool_cache.py` — call `add_galaxy_args()` on `p_add` and `p_pop`

**File:** `lib/galaxy/tool_util/workflow_state/cache.py` — replace `NotImplementedError` at line 146:

```python
elif src == "galaxy":
    galaxy_url = tool_info.galaxy_url
    if not galaxy_url:
        raise ValueError("--galaxy-url or GALAXY_URL required for --tool-source galaxy")
    parsed_tool = tool_info.fetch_from_galaxy(galaxy_url, tool_id, version, api_key=tool_info.galaxy_api_key)
    source_url = f"{galaxy_url}/api/tools/{tool_id}/parsed"
```

Update `AddOptions`/`PopulateOptions` to include `galaxy_url`/`galaxy_api_key`. Update `build_tool_info()` to pass them through.

#### 3c. Remove `_try_builtin_tool` hack

**File:** `lib/galaxy/tool_util/workflow_state/toolshed_tool_info.py`

Delete:
- `_builtin_tool_dirs()` / `_builtin_tools_dir()`
- `_BUILTIN_CACHE`
- `_try_builtin_tool()`
- The fallback call in `get_tool_info()` (lines 246-249)

After removal, stock tools that aren't on the ToolShed must be pre-cached via `galaxy-tool-cache add <id> --tool-source galaxy`.

## Commit Structure

| Commit | Files | Cherry-pick? |
|--------|-------|--------------|
| 1. `stock_tool_sources` fix | `lib/galaxy/tools/stock.py` | Yes — **DONE** |
| 2. Galaxy API endpoints | `lib/galaxy/webapps/galaxy/api/tools.py` + API tests | Yes |
| 3. `--tool-source galaxy` + remove builtin hack | `toolshed_tool_info.py`, `cache.py`, `_cli_common.py`, `scripts/tool_cache.py`, `test_tool_cache.py` | No — branch-only |

## Testing

**Commit 2 tests:**
1. API test: `GET /api/tools/param_value_from_file/parsed` → valid ParsedTool JSON
2. API test: `GET /api/tools/param_value_from_file/versions/0.1.0/parsed` → same
3. API test: `GET /api/tools/{toolshed_id}/parameter_request_schema?tool_version=X` → valid JSON schema
4. API test: versioned URL pattern for each schema endpoint

**Commit 3 tests:**
5. Unit test: `fetch_from_galaxy()` with mocked HTTP → ParsedTool
6. Unit test: `add_tool(..., source="galaxy")` with mock → cache populated
7. Existing tests: all 228+ workflow_state tests still pass
8. Remove `test_galaxy_source_raises_not_implemented`

## Unresolved Questions

- Should `auto` source order stay `["api", "galaxy"]` or change to `["galaxy", "api"]`? Galaxy-first is better if running locally but requires GALAXY_URL configured. Suggest: keep api-first, galaxy only tried if GALAXY_URL is set.
- Should the Galaxy endpoints require authentication? Suggest: anonymous (matches existing `show` endpoint).
- After `_try_builtin_tool` removal, uncached stock tools raise KeyError — should error message suggest `galaxy-tool-cache add <id> --tool-source galaxy`?
