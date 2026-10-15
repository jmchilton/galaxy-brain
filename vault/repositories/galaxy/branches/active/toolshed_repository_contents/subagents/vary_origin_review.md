Verdict: `6521d02fde2` is correct and in the right place (APICorsRoute, the one spot that reflects Origin). No blocking issues. Only nits below. Rebase is clean: all 26 patches unchanged, no semantic interaction with release_26.2's overlapping changes.

Findings:

- **Nit**, `lib/tool_shed/test/functional/test_shed_cors.py:28,59-60`: the test comments repeat the code comment in `APICorsRoute` ("allowed origin is copied from the request..."). Fix: drop the test comments. `_varies_on_origin` already says what is being checked.
- **Nit/info**, `lib/galaxy/webapps/galaxy/api/__init__.py:617`: on Galaxy with `allowed_origin_hostnames` set, Starlette's `CORSMiddleware` also appends `Origin` to Vary on every response, so landing endpoints send `Vary: Origin, Origin`. Vary is a set, so this does no harm, and Starlette doesn't dedupe either. Fix: none needed. Optionally check the existing tokens before adding.
- **Info**, `lib/tool_shed/test/functional/test_shed_cors.py:63-67`: the preflight assertion doesn't check Vary. The per-route OPTIONS route keeps `route_class_override=APICorsRoute` (only `response_model` is stripped), so it does send `Vary: Origin`. OPTIONS responses can't be stored by shared caches, so no assertion is needed.
- **Info (pre-existing, out of scope)**: `cors_preflight` sets ACAO `*`, which APICorsRoute then overwrites with the reflected origin. `Access-Control-Max-Age` is also sent on non-preflight responses, where it has no effect.

<details>
<summary>Full review</summary>

### Vary: Origin change

**Correctness and placement.** `APICorsRoute.custom_route_handler` is the only place that copies `request.headers["Origin"]` into `Access-Control-Allow-Origin`, so this is the right layer for the Vary header. It covers every `allow_cors=True` route. Putting it in `_cacheable_result` instead would have tied it to caching rather than to the real cause, which is reflecting the origin. It also matches Starlette's `CORSMiddleware.allow_explicit_origin`, which adds `Vary: Origin` whenever it reflects an origin. `MutableHeaders.add_vary_header` (Starlette 1.7.0) appends to any existing Vary value and doesn't overwrite it.

**304s.** `_cacheable_result` returns a bare `Response(304, headers={ETag, Cache-Control})` from the endpoint. That response goes back through `custom_route_handler`, so it also gets ACAO and Vary. RFC 9110 15.4.5 requires a 304 to carry the Vary that the 200 would have sent, and the test asserts this.

**Error responses.** On the exception path, the handler from `request.app.exception_handlers` builds the response before the header lines run, so error responses get Vary too. Errors don't carry `Cache-Control: public`, so caching isn't a concern there anyway. Exceptions with no registered handler are re-raised and get no CORS headers at all. That behaviour is pre-existing and not changed here.

**No Origin header.** ACAO is `*` and `Vary: Origin` is still sent. That is correct, because the response body depends on whether Origin was present. It only splits the cache key between no-origin and origin requests.

**Other middleware.** Neither the shed nor Galaxy adds GZip in-app. An nginx `gzip_vary` adds a separate `Vary: Accept-Encoding` line, and the two combine correctly. On Galaxy, `GalaxyCORSMiddleware` (Starlette `CORSMiddleware`) already appends `Origin` to Vary on every response when `allowed_origin_hostnames` is set, including its else branch. Combined with this change, that gives `Vary: Origin, Origin`, which is harmless.

**Preflight routes.**
- Per-route OPTIONS: `wrap_with_alias` builds `preflight_kwd` from `kwd` minus `response_model`, so `route_class_override=APICorsRoute` carries over and preflights get Vary.
- Catch-all `preflight_handler` (`lib/galaxy/webapps/base/api.py:412`): sets no ACAO, so it needs no Vary.
- OPTIONS isn't cacheable by shared caches, and browsers key their preflight cache by origin. Nothing more is needed here.

**Galaxy impact.** The landing POST routes (`/api/{file,data,tool,workflow}_landings`) now send `Vary: Origin`. POST responses aren't cached and `test_landing.py` doesn't assert exact header sets, so nothing breaks. The shed's `tools.py` CORS routes also get the header, which is harmless.

**Tests.** The red-first assertions were added to existing tests: the index GET, plus the files 200 and 304 inside the repository files test. That reuses existing setup and needs no new fixtures. `_varies_on_origin` parses Vary as a comma-separated token list, so duplicates and other tokens don't break it. Asserting on the 304 is the valuable part. Coverage is proportionate. The only nit is the duplicated comments.

**Security.** None found. Reflecting Origin without `Access-Control-Allow-Credentials` is equivalent to `*`. Before this commit, the missing Vary was a cross-origin cache-mismatch (availability) problem, not a data leak.

### Rebase sanity

`git range-diff a8553cff3ca..backup/toolshed_repository_contents-pre-26.2 origin/release_26.2..6521d02fde2~1` shows all 26 commits as `=`, so no patch changed.

release_26.2 changes that overlap the branch:
- `readme_util.py`: rst README HTML is now sanitized (`render_readme`). The branch doesn't touch README rendering. The new `RepositoryFileViewer` shows text without `v-html`. The only `v-html` on `RepositoryPage.vue` (readme) is pre-existing.
- Shed eslint moved to a flat config (`eslint.config.mjs`) with stricter rules. Ran `eslint` on all 25 branch-changed `.ts`/`.vue` files: clean.
- `repository.store.ts` and `util.ts`: only `catch {}` cleanups. No overlap with the branch's `RepositoryPage.vue` and store usage.
- `base/api.py`: `release_request_sessions` and the FileResponse chunk size. Unrelated.

Frontend checks after the rebase:
- `vue-tsc --noEmit`: clean.
- `vitest run`: 217/217 pass under the pinned node 22.20.0. Under the default node 25.6.1, 18 tests fail with `localStorage.getItem is not a function`. That is the known happy-dom/node-25 environment issue, not a branch problem.

Not run: shed functional tests. The caller reports `test_shed_cors.py` at 5/5.
</details>
