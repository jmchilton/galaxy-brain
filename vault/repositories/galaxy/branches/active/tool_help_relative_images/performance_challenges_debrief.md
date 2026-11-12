Run via claude-opus-5-5 at default effort.

# Performance challenges debrief

I fixed one real problem: `help_image` sent no caching headers and could not answer a conditional request. While fixing it I found that the icon endpoint's `If-None-Match` check never matched. The rest of the endpoint is cheap enough. It does one tool lookup per image, which usually hits the LRU cache, plus a few `stat` calls. It runs no DB queries.

## Commits (on top, "Baseline tests" still first)

- `1dbbeda4950` Accept PathLike tool dirs in help image lookup. This is not a performance fix. `make mypy` (`cd lib && mypy .`) flagged an `arg-type` error on `find_help_image((tool.tool_dir, ...))` at `services/tools.py:642`. Commit `64042c90cdd` introduced it. `find_tool_asset`/`find_help_image` now take `StrPath`.
- `a919776e76b` Serve tool help images with caching headers and 304s:
  - The conditional-GET block moved out of `get_icon` into `_cached_file_response(request, path, media_type)` in `api/tools.py`. `get_icon` and `get_help_image` both use it.
  - Fixes the icon `If-None-Match` bug.
  - New API test `test_tool_help_image_caching`. Regenerated `schema.ts` for the new 304 response.
- `9c51e25aa73` Test tool icon revalidation by ETag. The fixture `help_images_markdown.xml` gains `<icon src="beside_tool.png" />`, and `test_tool_icon_revalidated_by_etag` covers the icon's 200-then-304 path.

## Findings

1. **No HTTP caching on `help_image` (data, fixed).** I ran the new test against the branch before the fix:
   - The response headers were `content-type`, `etag`, `last-modified` and `accept-ranges`, and no `Cache-Control`. Starlette's `FileResponse` sets ETag and Last-Modified, but it has no conditional logic; that lives in `StaticFiles`.
   - Repeating the request with `If-None-Match: <etag>` returned **200 with the full body**, not 304.
   - So the browser relied on heuristic freshness, and every revalidation re-ran the tool lookup and re-sent the image.
   - After the fix, both `If-None-Match` and `If-Modified-Since` return 304 with an empty body. `Cache-Control` is `public, max-age=2592000, immutable`, the same as the icon.
   - `max-age`/`immutable` is what removes repeat requests. A 304 still runs the tool lookup and the `stat`, because the service runs before the helper; it only saves the hash and the body.
2. **The icon endpoint's `If-None-Match` never matched (data, fixed in the shared helper).**
   - The old check compared `etag.strip()`, which keeps its quotes (`"abc"`), with `e.strip(' W/"')`, which drops them (`abc`).
   - A scratch check of the old expression returned `False` for `"abc"`, `W/"abc"` and `"x", "abc"`. The new one returns `True` for all three.
   - Only `If-Modified-Since` ever produced a 304 on `/icon`. Icon output is otherwise unchanged: same headers, `image/png`.
3. **Tool lookup and materialization per image (reasoned, not measured).**
   - `get_tool_help_image` checks the media type before the tool lookup, so a request for a non-image path is rejected without touching the toolbox.
   - `CachedToolBox.materialize_tool` goes through a single-flight LRU (`cache_size=500`) keyed by `(id, version, source_hash)`. Opening the tool form already materializes the same key, so its image requests are LRU hits.
   - `CachedTool` doesn't expose `tool_dir`/`_repository_dir` without materializing (`__slots__` only), so materialization can't be skipped cheaply.
   - Two endpoints already set the precedent of materializing per request: `/icon` (reason `detail`) and `shed_tool_static` (reason `packaging`).
   - `ToolsListCard` help only renders after a per-card "show help" click, so the tools list does not load images in bulk.
4. **Filesystem cost (reasoned).** One `realpath` per base dir, then `abspath` + `realpath` (in `safe_contains`) + `isfile` per candidate. That is at most 2 candidates × 2 base dirs. The new helper adds one `stat` and an md5 of the file per 200 or ETag check. This is the same as the icon, and help images are small.
5. **Client re-renders (reasoned, no change).**
   - `toolHelpImageUrl` is deterministic: `URLSearchParams` puts `path` then `tool_version`. Re-renders therefore produce identical `src` strings, and the browser's in-document image cache dedupes them.
   - The URL includes `tool_version`, so changing the version selected in the form fetches a new URL. That is correct.
   - One request per help image per form open, and in practice it is now served from the HTTP cache.
6. **Patterns from the checklist that don't apply:** no SQL, no unbounded lists, and no handler work done synchronously inside an async route (`get_help_image` is a sync `def`, so it runs in the threadpool).

## Tests

- Red, before the fix: `test_tool_help_image_caching` failed with `KeyError: 'cache-control'`. A probe with that assertion removed then got `200 != 304` on the `If-None-Match` revalidation.
- Green:
  - One invocation: `-k "test_tool_help_image or test_tool_icon or test_build_tool_help"`, 6 passed.
  - `help_images_markdown.xml` still validates against `galaxy.xsd`.
  - `test/unit/app/tools/test_help_images.py`: 10 passed.
  - black, isort and ruff clean.
  - `cd lib && mypy` shows no errors in `help_images.py`, `api/tools.py`, `services/tools.py` or `shed_tool_static.py`.
- Icon: `test_tool_icon_revalidated_by_etag` fails on the old icon code (`200 != 304`) and passes after the fix.

## Open for John

- `immutable` for 30 days, matching the icon. If someone edits the image of a locally developed tool without bumping its version, browsers keep showing the stale copy until the cache is cleared. Drop `immutable` and shorten `max-age` for help images, or for both endpoints?
- `public` or `private` for help images? Browser caching works either way. These are files shipped with the tool, and the icon already uses `public`.
- The icon-style ETag hashes the file's contents (md5) on every request. Starlette's default mtime+size ETag is cheaper. I kept the md5 so the icon's behaviour doesn't change.
- The icon `If-None-Match` fix rides along in this branch. Split it into its own PR to a release branch?
