# Port Tool Cache debug panel (backend) to Python gxwf-web

Source: TS PR jmchilton/galaxy-tool-util-ts#81 ("Tool Cache debug panel: gxwf-web routes + gxwf-ui tab"). This plan covers **backend only** — `/api/tool-cache` routes, supporting service methods, OpenAPI schema, tests. Vue UI is out of scope.

## Reference points

- TS handlers: `packages/gxwf-web/src/tool-cache.ts` (200 lines)
- TS routes: `packages/gxwf-web/src/router.ts` (+85 lines)
- TS service additions: `packages/core/src/tool-info.ts` (+36), `packages/core/src/cache/tool-cache.ts` (+17/-9)
- TS tests: `packages/gxwf-web/test/tool-cache.test.ts` (304 lines, 18 cases)
- TS OpenAPI: `packages/gxwf-web/openapi.json` (+280)
- Python tool cache library: `lib/galaxy/tool_util/workflow_state/toolshed_tool_info.py` (`ToolShedGetToolInfo`, `CacheIndex`, `parse_toolshed_tool_id`, `_cache_key`, `_tool_id_from_trs`, `_cache_path`)
- Python FastAPI app: `gxwf-web/src/gxwf_web/{app,operations,models}.py`

## Gap summary

Galaxy's `ToolShedGetToolInfo` already has `has_cached`, `list_cached`, `clear_cache`, `load_cached`, `populate_from_parsed_tool`, `get_tool_info`, plus `_resolve_tool_coordinates` and `_cache_path`. Missing pieces vs. the TS surface:

| TS feature | Python today | Action |
|---|---|---|
| `ToolInfoService.refetch(id, ver?, {force?}) → {cacheKey, fetched, alreadyCached}` | absent | add `refetch()` to `ToolShedGetToolInfo` with same semantics |
| `ToolCache.clearCache(prefix?) → number` | returns `None` | make `clear_cache` return removed count |
| `ToolCache.statCached(key) → {sizeBytes, mtime?}` | private `_cache_path` only | add public `stat_cached(cache_key)` returning size+mtime |
| Decorate emits `refetchable` + deep `toolshedUrl` | not exposed | compute in handler using `parse_toolshed_tool_id` + `_tool_id_from_trs` |
| Single-pass list + aggregate stats | `list_cached` returns raw index entries; no aggregation | aggregate in handler |

The Python project depends on the Galaxy package via the `wf_tool_state` worktree venv — Galaxy-side changes ship with the worktree and don't need a release.

## Step 1 — Galaxy library additions (worktree: `wf_tool_state`)

Edit `lib/galaxy/tool_util/workflow_state/toolshed_tool_info.py`:

1. **`ToolShedGetToolInfo.refetch(tool_id, tool_version=None, force=False) -> dict`** — mirror TS:
   - resolve coords → if version known and `has_cached` and not `force`: return `{cache_key, fetched: False, already_cached: True}`
   - if force and cached: compute key, remove file via `_cache_path`, `_index.remove(key)`, drop from `_memory_cache`
   - call `self.get_tool_info(tool_id, tool_version)` — raises if it returns `None` (`KeyError(f"Failed to fetch tool: {tool_id}")`)
   - resolve final version from returned ParsedTool, compute key, return `{cache_key, fetched: True, already_cached: <prior>}`

2. **`clear_cache` → return `int`**: count entries removed across both branches; update callers (`run_clear` in `cache.py` — log/print can ignore the value).

3. **`stat_cached(cache_key) -> Optional[dict]`**: `os.stat` `_cache_path`, return `{"size_bytes": st.st_size, "mtime": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat()}` or `None` if missing.

4. **(Optional) helper `resolve_tool_coordinates`** — public version of `_resolve_tool_coordinates` so handlers can compute keys without reaching into `_`.

Add unit tests under `test/unit/tool_util/workflow_state/test_toolshed_tool_info.py` (or wherever its peers live) for the three new behaviors:
- refetch idempotent on hit, returns `fetched=False, already_cached=True`
- refetch with `force=True` re-fetches and returns `fetched=True, already_cached=True`
- clear_cache return count (all + prefix)
- stat_cached returns size for present key, None for missing

## Step 2 — Python gxwf-web models

New file `src/gxwf_web/tool_cache_models.py` (or extend `models.py` — pick one; new file is cleaner since this is self-contained):

```python
class CachedToolEntry(BaseModel):
    cache_key: str
    tool_id: str
    tool_version: str
    source: str
    source_url: str
    cached_at: str
    decodable: bool = True
    refetchable: bool
    size_bytes: Optional[int] = None
    toolshed_url: Optional[str] = None

class CacheStats(BaseModel):
    count: int
    total_bytes: Optional[int] = None
    by_source: Dict[str, int]
    oldest: Optional[str] = None
    newest: Optional[str] = None

class ToolCacheListResponse(BaseModel):
    entries: List[CachedToolEntry]
    stats: CacheStats

class ToolCacheRawResponse(BaseModel):
    contents: Any
    decodable: bool

class ToolCacheDeleteResponse(BaseModel):
    removed: bool

class ToolCacheClearResponse(BaseModel):
    removed: int

class ToolCacheRefetchRequest(BaseModel):
    tool_id: str
    tool_version: Optional[str] = None

class ToolCacheRefetchResponse(BaseModel):
    cache_key: str
    fetched: bool
    already_cached: bool

class ToolCacheAddRequest(ToolCacheRefetchRequest): ...
class ToolCacheAddResponse(BaseModel):
    cache_key: str
    already_cached: bool
```

Field-naming decision: TS uses camelCase (`cacheKey`, `sizeBytes`); the Python existing models use snake_case (`workflow_path`). The shared `openapi.json` is the contract. **Decision: use camelCase via `Field(alias=...)` + `model_config = ConfigDict(populate_by_name=True)` and `response_model_by_alias=True` on the routes, so the wire format matches TS.** This keeps the generated `api-types.ts` identical between backends. (Same trick already used elsewhere in the repo? Check before assuming — see open question Q1.)

## Step 3 — Handler module

New file `src/gxwf_web/tool_cache.py` — thin functions over `ToolShedGetToolInfo`:

```python
def list_tool_cache(tool_info, *, decode: bool) -> ToolCacheListResponse: ...
def get_tool_cache_stats(tool_info) -> CacheStats: ...
def get_tool_cache_raw(tool_info, cache_key: str) -> ToolCacheRawResponse: ...
def delete_tool_cache_entry(tool_info, cache_key: str) -> ToolCacheDeleteResponse: ...
def clear_tool_cache(tool_info, *, prefix: Optional[str]) -> ToolCacheClearResponse: ...
def refetch_tool_cache_entry(tool_info, body) -> ToolCacheRefetchResponse: ...
def add_tool_cache_entry(tool_info, body) -> ToolCacheAddResponse: ...
```

Decoration logic (single pass over `list_cached()`):
- `refetchable = entry["source"] != "orphan" and entry.get("tool_id") not in ("", "unknown", None)`
- `toolshed_url`: `parse_toolshed_tool_id(entry["tool_id"])` → if not None, build `https://{_tool_id_from_trs(toolshed_url, trs_tool_id)}` (matches TS `toolIdFromTrs`)
- `size_bytes`: `tool_info.stat_cached(cache_key)["size_bytes"]` if present
- `decodable`: default `True`; when `?decode=1`, `load_cached` → reload raw JSON or call `ParsedTool.model_validate` on cached data, catch any exception → `False`. (`load_cached` already validates and returns `None` on parse error — that's enough; no separate raw read needed for the probe.)

Aggregate stats in the same loop: `count`, `by_source`, min/max `cached_at`, sum `size_bytes` (only if every entry had a size).

`get_tool_cache_raw`: read JSON file directly from `_cache_path` (or expose a `load_cached_raw` helper in Galaxy that returns `dict` without validating). Run `ParsedTool.model_validate` to compute `decodable`. 404 if file missing.

`delete_tool_cache_entry`: check existence first; if not in index, `removed=False`; else remove file + `_index.remove(key)` + `_memory_cache.pop`. Return `removed=True`.

`clear_tool_cache(prefix)`: pass-through to `tool_info.clear_cache(prefix)` (now returning int).

`refetch`: call `tool_info.refetch(tool_id, tool_version, force=True)`. Wrap `KeyError`/`Exception` → `HTTPException(502)`. `tool_id` empty → `HTTPException(400)`.

`add`: call `tool_info.refetch(tool_id, tool_version, force=False)`. Same error wrapping. Return `cache_key + already_cached` only.

## Step 4 — FastAPI routes in `app.py`

Add after the existing workflow routes:

```python
@app.get("/api/tool-cache", response_model=ToolCacheListResponse, response_model_by_alias=True)
async def api_list_tool_cache(decode: int = Query(0)):
    return list_tool_cache(_tool_info, decode=bool(decode))

@app.delete("/api/tool-cache", response_model=ToolCacheClearResponse, response_model_by_alias=True)
async def api_clear_tool_cache(prefix: Optional[str] = Query(None)):
    return clear_tool_cache(_tool_info, prefix=prefix)

@app.get("/api/tool-cache/stats", response_model=CacheStats, response_model_by_alias=True)
async def api_tool_cache_stats():
    return get_tool_cache_stats(_tool_info)

@app.post("/api/tool-cache/refetch", response_model=ToolCacheRefetchResponse, response_model_by_alias=True)
async def api_refetch(body: ToolCacheRefetchRequest):
    return refetch_tool_cache_entry(_tool_info, body)

@app.post("/api/tool-cache/add", response_model=ToolCacheAddResponse, response_model_by_alias=True)
async def api_add(body: ToolCacheAddRequest):
    return add_tool_cache_entry(_tool_info, body)

@app.get("/api/tool-cache/{cache_key}", response_model=ToolCacheRawResponse, response_model_by_alias=True)
async def api_read(cache_key: str):
    return get_tool_cache_raw(_tool_info, cache_key)

@app.delete("/api/tool-cache/{cache_key}", response_model=ToolCacheDeleteResponse, response_model_by_alias=True)
async def api_delete(cache_key: str):
    return delete_tool_cache_entry(_tool_info, cache_key)
```

Route ordering: declare `/stats`, `/refetch`, `/add` before `/{cache_key}` so they don't get shadowed (FastAPI matches in declaration order — verify; `/stats` etc. are static so they should win, but explicit ordering is safer).

State: continue using the existing `_tool_info` module global pattern. No DI refactor in this PR — keeps the change scoped.

## Step 5 — Tests

Red-green: write tests first against not-yet-implemented routes, then build until green.

New file `tests/test_tool_cache_api.py`. Fixture pattern parallel to `test_api.py`:

```python
@pytest.fixture
def cache_client(tmp_path, monkeypatch):
    cache_dir = tmp_path / "cache"
    cache_dir.mkdir()
    app_module.configure(str(tmp_path / "wf"))
    (tmp_path / "wf").mkdir()
    tool_info = build_tool_info(cache_dir=str(cache_dir))
    app_module._tool_info = tool_info
    app_module._workflows = []
    with TestClient(app_module.app) as c:
        yield c, tool_info
```

Seed cache in tests via `tool_info.populate_from_parsed_tool(tool_id, version, parsed_tool, source, source_url)` — use a minimal `ParsedTool` fixture (steal one from Galaxy's `test/unit/tool_util/workflow_state/` if available).

For `refetch` / `add`, monkeypatch `tool_info._fetch_from_api` (or `get_tool_info`) so tests don't hit the network. Match the TS strategy of stubbing `getToolInfo`.

Cases to cover (≈ TS's 18, trimmable):
- empty list → entries=[], stats.count=0
- list with seeded entries → decoration: `refetchable`, `toolshed_url` for shed tools, `size_bytes` populated
- orphan tool_id → `refetchable=False`, no `toolshed_url`
- `?decode=1` flips `decodable` for malformed cache file (write a bogus JSON via raw FS)
- stats: `by_source` aggregation, `oldest`/`newest`, `total_bytes`
- raw read present + 404 missing
- delete present (`removed=True`) + missing (`removed=False`)
- clear all → returns count; clear by prefix → only matching removed
- refetch on cached → fetched=True, already_cached=True (force semantics)
- refetch on uncached → fetched=True, already_cached=False
- refetch with empty `tool_id` → 400
- refetch when `get_tool_info` raises → 502
- add on cached → already_cached=True, no fetch (assert mock not called)
- add on uncached → already_cached=False, fetch called once

## Step 6 — OpenAPI sync

Per `GXWF_AGENT.md`:

```bash
# in gxwf-web (this repo):
make docs-openapi
# in galaxy-tool-util TS monorepo:
make sync-openapi
cd packages/gxwf-web && pnpm codegen
```

Diff the regenerated `openapi.json` against the TS PR's `openapi.json`. They should match (modulo operationId formatting — FastAPI auto-generates operationIds like `api_list_tool_cache_api_tool_cache_get`; TS PR has `list_tool_cache_api_tool_cache_get`). If divergent, set explicit `operation_id="..."` on each route to match the TS contract so the generated `api-types.ts` is identical.

Commit `openapi.json` (Python repo) and `openapi.json + api-types.ts` (TS repo) together.

## Step 7 — Validate end-to-end

- `make test` (or `pytest tests/test_tool_cache_api.py -v`) green
- `make docs-openapi` produces a clean diff containing only the new tool-cache paths/schemas
- Manual: `gxwf-web serve <dir>` then `curl http://localhost:<port>/api/tool-cache` returns shape matching `CachedToolEntry[]`
- (Cross-check) point the existing TS gxwf-ui at the Python server — the `/cache` view should populate. Out of scope for this PR but a good smoke test before declaring done.

## Implementation order

1. Galaxy library (Step 1) + Galaxy unit tests — green before touching gxwf-web.
2. Python models + handler module + routes (Steps 2–4) — wired but untested.
3. Python tests (Step 5) — red → green.
4. OpenAPI regen + commit (Step 6).
5. Smoke (Step 7).

Two commits minimum: one in the Galaxy worktree (Step 1), one in gxwf-web (Steps 2–6). They can land independently since gxwf-web depends on the Galaxy worktree's installed package.

## Unresolved questions

- Q1: Does any existing Python gxwf-web model use camelCase aliases? If yes, follow that pattern; if no, confirm camelCase-via-alias is the right call (vs. snake_case + accept the TS/Python wire-format split).
- Q2: Should `_tool_info` accept a `cache_dir` from `configure()` / CLI? Currently `get_tool_info()` uses Galaxy's default. The TS server takes a `cacheDir` option — do we want parity? (Punt: keep current default, file as follow-up.)
- Q3: `operation_id` overrides to match the TS `openapi.json` exactly — worth doing now, or accept divergence and accept that `api-types.ts` regen produces different names per backend?
- Q4: `stat_cached` returning ISO `mtime` — TS PR has it optional and the UI doesn't display it (per the TS handler code). Skip the mtime field entirely to keep the response lighter? (TS keeps it; matching is safest.)
- Q5: Decode probe — TS reads cached raw JSON separately to validate; Python's `load_cached` already validates and returns `None` on failure, so we can skip a second pass. Confirm this matches TS semantics for the "file exists but corrupt" case (TS `decodable=False`, Python shortcut would also yield `False` since `load_cached` returns None → treat None as undecodable). Should be equivalent.
