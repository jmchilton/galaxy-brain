# galaxy#20235 - Migrate JobFilesAPIController to FastAPI (excluding TUS uploads)

Author: domgz (José Manuel Domínguez, `dominguj@informatik.uni-freiburg.de`). Opened 2025-04. Last commit b53fa359b0f (2025-09-22). Stalled.
Worktree: `~/projects/worktrees/galaxy/pr/20235`. dev at b437cb3f0d6.
Downstream: #20598 "Pulsar-based ARC Job Runner" (domgz), which stacks on this PR.

Goal of this note: decide how to rescue it, not a line review. Bottom line: **don't rebase 20235 as-is. Re-port it as two PRs.** Two of its premises are stale (TUS, HEAD), and the rebase silently reverts recent dev fixes.

## 1. Current dev shape and rebase difficulty

dev `lib/galaxy/webapps/galaxy/api/job_files.py` (249 lines) is still a pure WSGI controller:
- `index` (GET/HEAD) at :43-80. It returns `open(path, "rb")`. On `FileNotFoundError` it runs a regex check: if the path looks like a dataset and an input is purged, it raises `ItemDeletionException`; otherwise it re-raises, giving a 500.
- `create` (POST) at :82-154. Three sources for the upload:
  - `__file_path` from nginx (:113-124)
  - TUS `session_id` (:125-136)
  - `file`/`__file` (:138)
- `create` then appends if the target ends in `tool_stdout`/`tool_stderr` (:142-144); otherwise it calls `shutil.move` (:146).
- `tus_patch`/`tus_hooks` no-ops at :156-195.
- `__authorize_job_access` :197-214. `__check_job_can_write_to_path` :216-227. `__in_working_directory` uses `JobWorkingDirectory(...).resolve()` :247-249 (from #23133).
- Routes: `buildapp.py:868-885` (resource + HEAD), and the TUS ones at `buildapp.py:384-396`.

`git merge-tree origin/dev HEAD` conflicts in 3 files:
- `client/packages/api-client/src/schema/schema.ts`. The schema moved since the PR; regenerate it, don't hand-merge.
- `job_files.py`. The PR rewrote the whole file. A naive resolution **reverts dev**:
  - The PR's `__in_working_directory` uses the old `object_store.get_filename(job, base_dir="job_work", ...)` (PR :310-314). That drops #23133's `JobWorkingDirectory` abstraction.
  - It drops the `assert job` and the annotations from #22436 (1422779d4be).
  - It drops the `Union`/`list[...]` typing of output assocs.
- `test/integration/test_job_files.py`. Both sides fixed the same class-attr init bug. dev has nsoranzo's 1a1d7265a58. Take dev's version and drop the PR's `cls = ...` rewrite.

Difficulty: low mechanically, but it's a re-port of the helpers, not a conflict merge. buildapp.py auto-merges.

## 2. Stale premises in the PR

- **TUS is no longer WSGI.** #21201 (mvdbeek, 54e0ff78ef3, "Replace tuswsgi with tuspyserver") mounts `create_tus_router(prefix="api/job_files/resumable_upload")` as a FastAPI router (`fast_app.py:242-267`; `driver_util.py:782-785` rebinds it in tests).
  - FastAPI routes match before the WSGI mount, so WSGI `tus_patch` (`buildapp.py:384-389`) is now **unreachable dead code**.
  - `tus_hooks` (POST `/api/job_files/tus_hooks`, `buildapp.py:394-396`) is a reachable no-op.
  - The PR's whole "excluding TUS / keep `JobFilesAPIController` for TusMiddleware" docstring (PR :317-327) is obsolete. The migration can be **complete**: delete the legacy controller and all `job_files` mapper routes.
- **The HEAD comment is wrong.** FastAPI `APIRoute` sets `route.methods = {upper(m) for m in methods}` with no HEAD auto-add (`fastapi/routing.py:1020-1021`). Only Starlette's plain `Route` adds HEAD.
  - So the explicit `@router.head(..., include_in_schema=False)` is **permanent**. That's the correct pattern, with precedent in `datasets.py:306-318` (stacked `@router.get` + `@router.head`).
  - Drop the "remove `@router.head(...)` when ALL endpoints have been migrated" comment (PR :129) and the paragraph at PR :108-112.

## 3. Behaviour regressions in the port

- **`path = unquote(path)`** (PR :155, :208, also in ARC) double-decodes. FastAPI already decoded the query or form value, and legacy never unquoted. Any path with a literal `%xx` gets corrupted. It isn't a traversal hole, because the check and the I/O use the same string. Drop it.
- **GET of a missing non-dataset path.** The PR falls through to `GalaxyFileResponse(path)`, which fails at send time with a 500. Legacy also 500'd, by re-raising `FileNotFoundError`. ARC's version (#20598) raises `ObjectNotFound` (404) plus `RequestParameterInvalidException` for a directory. Adopt ARC's version in the migration.
- **Missing `path`/`job_key`.** Legacy raised `ObjectAttributeMissingException` (400). In the PR this becomes FastAPI validation via the coerced `str` deps, which Galaxy maps to a 4xx. That's fine, but untested.
- **The GET response changes.** `GalaxyFileResponse` (`webapps/base/api.py:114`) adds Range support and honours `nginx_x_accel_redirect_base`/`apache_xsendfile`.
  - Range support is a perf win: Pulsar curl `get_file` resumes via HEAD + size.
  - x-accel is a deployment risk: the job-files GET can serve *any* path (tool-data `.loc`, working dir). If an admin's internal nginx location only aliases the dataset root, job-file GETs break.
  - Note this in the release notes, or opt this endpoint out of x-accel.
- **Auth moment is unchanged.** Legacy and the PR both parse the whole multipart body before auth, because FastAPI resolves `File`/`Form` deps first. That's fixable; see section 5.

## 4. Reuse home / fate of #8846

- #8846 (jmchilton, 2019) wanted a framework-free `JobFilesView` (dict in/out) for a Flask microservice and a GA4GH DRS. It was **never merged** and was closed 2026-10-01. Both goals are now covered elsewhere:
  - The DRS exists separately for datasets: `lib/galaxy/webapps/galaxy/api/drs.py` (FastAPI) + `services/ga4gh.py`.
  - Pulsar has its own server. Nothing consumes a standalone job-files service; Pulsar, ARC and Galaxy's own `PulsarJobRunner` all talk to Galaxy's endpoint (`jobs/runners/pulsar.py:686-690`).
  - Galaxy's FastAPI layering (thin `@router.cbv` controller -> `depends(...)`-injected service/manager) is the de-facto "framework-free class". So 8846's goal is subsumed.
- **Its fossil:** `lib/galaxy/job_execution/ports/view.py:15-43` `JobPortsView` was built in the 8846 style. It carries `# Copy/paste from JobFilesView - TODO: de-duplicate.`
- **The real reuse gap is job-key auth, copied 3x with drift:**
  - `job_files.py:197-214`: `kind="jobs_files"`, `Job.non_ready_states`, `ItemAccessibilityException`.
  - `job_ports/view.py:26-43`: `kind="jobs_files"`, `job.running` (different!), legacy `query().get`.
  - `job_tokens.py:54-69` (already FastAPI): `kind=job.destination_params["job_secret_base"]`, `AuthenticationFailed`.
- PR 20235 keeps all logic in the controller as private `__` methods. Nothing becomes reusable, and a third FastAPI copy of auth lands.
- Recommendation: extract one helper, e.g. `authorize_job_key(app/security, sa_session, encoded_job_id, job_key, kind="jobs_files") -> Job`, plus a `JobFilesManager` holding:
  - `check_can_write(job, path)` (working dir / output / extra-files)
  - `read_path(job, path)` (purged-input discrimination)
  - `write(job, path, source)` (move-vs-append)

  Home: `lib/galaxy/managers/job_files.py`, or next to `JobWorkingDirectory` in `galaxy.job_execution`. Ports and tokens adopt the helper later. The endpoint also doesn't need `DependsOnTrans` (no user/session); a `depends(JobFilesManager)` is enough and is cheaper on a hot path.

## 5. Double-write (unresolved review point) - options

**Correct the baseline first.** Legacy is *not* zero-copy:
- `web/framework/base.py:394-402` patches webob's `cgi.FieldStorage.make_file` to `NamedTemporaryFile(delete=False)` in `tempfile.tempdir`.
- `config/__init__.py:797-799` sets `tempfile.tempdir = new_file_path` (default `override_tempdir=True`).
- Then `shutil.move` either renames (same fs) or copies.

So the parity target is a *named temp file + rename*. FastAPI/Starlette instead spools into an unnamed `SpooledTemporaryFile` (`starlette/formparsers.py:147,230`) and must copy.

Each option, checked:
- **(a) Precedent.** Galaxy's main user upload `/api/tools/fetch` already accepts the double write: spool, then `copyfileobj` into `new_file_path` (`services/tools.py:303-311`). `wes.py`/`library_contents.py` do the same. No existing endpoint avoids it, and no `request.stream()` usage exists in dev. Not a fix, but a fallback if perf numbers say it's fine.
- **(b) Own multipart parse via python-multipart's public API.** python-multipart is a declared dependency (`pyproject.toml:89`, pinned 0.0.32). Take `request: Request`, don't declare `File`/`Form` params, and call `python_multipart.create_form_parser(headers, on_field, on_file, config={"UPLOAD_DIR": d, "UPLOAD_DELETE_TMP": False, "MAX_MEMORY_FILE_SIZE": 0})`. Its `File` writes a *named* on-disk file (`multipart.py:495-530`, `actual_file_name`), so `os.replace`/`shutil.move` then rename.
  - If `path`+`job_key` are in the query (Pulsar always, `pulsar.py:687` + `action_mapper.__inject_url`), auth and the path check happen **before reading the body**, and `d = dirname(path)` makes the rename guaranteed and atomic.
  - If they're in the form (the dev tests), fall back to `d = tempfile.gettempdir()`. That's exactly legacy behaviour.
  - Avoid subclassing Starlette's private `MultiPartParser.on_headers_finished`; that's fragile across Starlette bumps.
  - Body schema is lost from OpenAPI; document it via `openapi_extra`.
- **(c) Raw-body PUT.** ARC (#20598) needs `PUT /api/jobs/{id}/files?path&job_key` with a raw body anyway. Stream `request.stream()` into a named temp in `dirname(path)`, then `os.replace`.
  - Pulsar could switch to it, but that needs a Pulsar client change and Galaxy-version negotiation, so it doesn't fix existing Pulsar's multipart POST.
  - ARC's implementation is **likely broken**: it awaits `trans.request.stream()` from `asyncio.new_event_loop()` inside a sync endpoint, so the ASGI `receive` is driven from a foreign loop. It must be `async def`, with the sync DB auth offloaded (`starlette.concurrency.run_in_threadpool`) and the file writes offloaded too. `datatypes.py:75` and `agents.py:91` are async endpoint precedents, but check request-scoped session handling with sync DB access off the loop.
  - ARC also lacks `tool_stdout` append semantics and atomic replace.
- **(d) Tune `SpooledTemporaryFile`.** Not viable: `max_size`/dir aren't configurable per route, and rollover yields an unnamed `TemporaryFile`, so no rename is possible.

**Recommend (b) for POST, with a shared "stream into named temp in a target dir, then replace-or-append" helper in `JobFilesManager`.** ARC's PUT (c) later reuses the same helper. This keeps legacy parity, adds auth-before-body for Pulsar, and leaves one reusable write primitive instead of two ad hoc ones.

## 6. Query-or-form params

- No existing Galaxy helper for "query or form". `as_form` (`api/__init__.py:643`) is form-only, and `FetchDataForm` uses route-class overrides for JSON vs form.
- The PR's `path_query_or_form`/`job_key_query_or_form` deps are reasonable, but they force FastAPI to parse the body *before* auth.
- With (b) the question disappears. Read `request.query_params` first, then fill missing `path`/`job_key`/`session_id`/`__file_path` from `on_field`. One small function replaces both deps and the five `File`/`Form` params (including the `alias`+`validation_alias` workaround).
- Keep GET query-only (it is today).

## 7. Tests

dev `test/integration/test_job_files.py` covers:
- read by state + HEAD content-length (:71-90)
- purged input -> 400 (:92-106)
- write by state, form params (:108-134)
- write via real TUS + `session_id` (:136-166)
- write protection 403 (:168-177)

`test_job_files_tus.py` runs embedded Pulsar with `remote_transfer_tus` end to end (no AMQP needed).

The PR adds `test_write_with_nginx_upload_module`, `test_write_with_session_id` (raw store file, no TUS client) and `test_write_with_underscored_file_param`. All three are characterization tests and pass on legacy, so they can land first.

Gaps that matter more:
- **POST with `path`/`job_key` in the query + multipart `file`.** This is Pulsar's real mode. Every dev test uses form params.
- **`tool_stdout`/`tool_stderr` append.** Pulsar's new `live_output.post_bytes` (`pulsar/managers/live_output.py:387`, `client/transport/requests.py:31-40`) posts many small appends. This is a hot, untested path.
- Missing `path`/`job_key` -> 400. GET of a missing non-dataset file (legacy 500 -> target 404; assert this in PR B).
- nginx `__file_path` containing `..` -> rejected (see section 8).
- E2E: a cheap clone of `test_job_files_tus.py` with `default_file_action: remote_transfer` (multipart POST + query params, embedded Pulsar). That gives real Pulsar coverage without AMQP; `test_pulsar_embedded_mq.py`/`_relay.py` skip without AMQP.

## 8. Security

- Write-path check (`in_directory` uses `realpath`/`safe_contains`) and job-key `safe_str_cmp` port unchanged. No new hole.
- The CodeQL path-injection alerts are inherent and pre-existing: the endpoint reads and writes arbitrary paths, gated by job_key.
- **Pre-existing hardening gap.** The `__file_path` check is a bare `file_path.startswith(upload_store)` (dev :121-123; PR :224-226), with no `abspath`.
  - `/store/../etc/x` passes. Then `shutil.move` moves any Galaxy-owned file into a job output.
  - Exploiting it needs a job_key and direct (non-nginx) access.
  - `tools/parameters/basic.py:723-725` does `abspath` first. Better: `in_directory(file_path, upload_store)`. Fix it in the port and add a test.
- With (b), unauthorized POSTs from Pulsar-style clients no longer consume disk before rejection.

## 9. nginx_upload_job_files

- Still wired: `pulsar.py:688-689` rewrites `files_endpoint` to `nginx_upload_job_files_path?job_id=&job_key=`.
- Documented in `galaxy_options.rst:2867-2890` and not deprecated.
- However, `doc/source/admin/nginx.md` has no job-files recipe, although the option docs say "see the Galaxy nginx documentation". Likely little real usage.
- Keep it, since parity is cheap. Cover it with domgz's test and the `..` fix. A deprecation, if wanted, is a separate PR.

## Plan

**PR A - "Characterize and harden job files API" (legacy WSGI, small, fast to land)**
- Tests from 20235: nginx, session_id, `__file`. Cherry-pick by authorship: `git checkout 056a2832be1 -- <test hunks>`, then commit with `--author="José Manuel Domínguez <dominguj@informatik.uni-freiburg.de>"`, or add a `Co-authored-by:` trailer if mixed. Take dev's setUp fix, not the PR's.
- New tests:
  - query-param POST
  - stdout/stderr append
  - missing params 400
  - `..` in `__file_path`
  - `test_job_files_remote_transfer.py` (embedded Pulsar, `remote_transfer`)
- Fix the `__file_path` abspath/`in_directory` check (red -> green with the `..` test).
- Optional, recommended: extract `authorize_job_key` + `JobFilesManager` and have the legacy controller delegate. The A tests then prove the extraction before any framework swap, and B's diff becomes pure transport. Migrating `JobPortsView`/`job_tokens` onto the helper can wait.
- Test plan: run `test_job_files.py` + the new remote_transfer test locally, one at a time. CI for the rest.

**PR B - "Migrate job files API to FastAPI" (complete, no WSGI leftovers)**
- `@router.cbv` controller on `depends(JobFilesManager)`. Explicit permanent `@router.head`. Tag "jobs", marked internal in the description (or `unstable=True`).
- Delete `JobFilesAPIController`, the `buildapp.py:384-396` and `:868-885` routes, and the TUS no-op actions. Decide on a FastAPI no-op for `tus_hooks`.
- POST via option (b): query-first auth, a named temp in the target dir, replace-or-append. No `unquote`. GET 404 for missing files.
- Regenerate `client/packages/api-client/src/schema/schema.ts`.
- Credit: base on domgz's branch. Keep their commits where they survive (route/docs work), or squash with `Co-authored-by: José Manuel Domínguez <dominguj@informatik.uni-freiburg.de>`. Supersede #20235 with a comment crediting them. Ask domgz first whether they want to drive it; #20598 depends on it.
- Perf comparison (mvdbeek's ask), dev vs branch, gunicorn+uvicorn worker on **Linux**:
  - Cases: (1) 1 GB single POST via Pulsar `post_file` (toolbelt streaming); (2) 1000 x 1 KB `post_bytes` appends to `tool_stdout`; (3) 1 GB GET + HEAD.
  - Measure: wall time, worker peak RSS (psutil sampling), and `/proc/<pid>/io` `write_bytes`.
  - Accept: write_bytes ~ 1x payload (not 2x), flat RSS, append latency no worse.
  - Script lives in the PR description, not the repo.
- Test plan: all PR A tests unchanged (characterization) + `test_job_files_tus.py` + new 404 assertion. Then a manual Pulsar staging run if the perf rig exists.
- Then #20598 (ARC) rebases onto B. Its PUT reuses the write helper as an `async def`. Its PROPFIND route probably stays needed: a method mismatch on a FastAPI route is only a partial match, so Starlette falls through to the catch-all WSGI `Mount("/")`, which 404s. That needs verifying.

## Unresolved questions

- Ask domgz to carry B, or do it ourselves with co-author credit?
- Extract `JobFilesManager` in A (legacy) or in B?
- `tus_hooks` no-op: keep a FastAPI stub, or drop it (does anyone point tusd hooks at it)?
- Opt the job-files GET out of x-accel/xsendfile, or document it?
- (b) async endpoint + sync DB auth in threadpool: OK with Galaxy's request-scoped session?
- Deprecate `nginx_upload_job_files_*` separately?
- Dedupe `JobPortsView`/`job_tokens` auth in B or a follow-up?

## Rescue progress (2026-10-01)

- PR A branch `job_files_hardening` (jmchilton fork, pushed): domgz nginx + `__file` tests (session_id test dropped, dup of `test_write_with_tus`), query-param POST, stdout/stderr append, missing-param 400 (dev already 400), embedded Pulsar `remote_transfer` E2E. Fix: `__file_path` abspath + `in_directory` (traversal and relative-path both red→green); `assert upload_store` → 403. Subagent review found relative-path hole in first fix; fixed.
- PR B branch `job_files_fastapi` (pushed, stacked on A): `JobFilesManager` (managers/job_files.py), FastAPI cbv GET/HEAD/POST, legacy controller + mapper routes + dead TUS stubs deleted, schema regen. POST async, query auth first in threadpool, session released, python-multipart streams file part to staging dir (working dir, or dataset file's dir — never inside extra_files_path), rename/append; form-auth falls back to new_file_path spool. State re-checked before write. GET 404 missing / 400 dir.
- Not deduped: job_tokens.py, JobPortsView auth (behavior/layering differ).
- Perf (macOS, 512 MiB, embedded): POST legacy 2.80s / 1097 MiB written vs branch 1.56s / 559 MiB; appends ~12ms both; GET 0.89 vs 0.99s; RSS flat. Script: `galaxy_20235_perf_test_job_files.py` (copy to test/integration/, `-k "TestJobFilesPerf and test_perf"`, `PERF_MB=1024`). Rerun on Linux for mvdbeek.
- Gaps: no test for job stopped mid-upload; early 403 on large body may surface as ECONNRESET.

### Async endpoint + threadpool DB: safe with conditions
- Scoped session keyed on `REQUEST_ID` contextvar (`model/base.py:46-125`); anyio copies context into worker threads → same session. Sync deps already run this way.
- Precedent: `api/chat.py`, `api/agents.py` (`anyio.to_thread.run_sync`), `api/proxy.py` (auth in threadpool then stream).
- Conditions: no ORM access on loop thread (return plain values); no concurrent threadpool DB calls per request; close session before long body stream (teardown runs after response); no `UploadFile`/`Form` params (forces spool); sync `def` can't `await request.stream()`.
