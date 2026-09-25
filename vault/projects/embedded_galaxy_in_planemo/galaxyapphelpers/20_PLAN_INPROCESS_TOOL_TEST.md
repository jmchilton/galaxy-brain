# 20 — PLAN: Run a Galaxy tool test in-process, no web server

Date: 2026-09-16. Author: planning agent 1.
Substrate: `/Users/jxc755/projects/repositories/galaxy-embedded-research` @ `c6c3b6df49` (== `origin/dev`).
Every `file:line` below is against that commit. Worktree was left clean (`git status --porcelain` empty; verified
after every run).

## 0. What I executed, and the headline

The recon executed nothing. **I built a runnable environment and ran the whole thing.**

- Scratch venv: `uv venv --python 3.12`, then `uv pip install -r lib/galaxy/dependencies/pinned-requirements.txt`
  (298 pins, exit 0). Galaxy source used via `PYTHONPATH=<worktree>/lib`. The pinned worktree has **no `.venv`
  and I did not create one in it** — nothing inside the worktree was installed to or modified.
- 15 experiments. Scripts live in the session scratchpad (`.../scratchpad/exp/`), not in any repo.

**Headline: the ask already works. The four-phase spine — tool submission → preparation → execute → job
finalize — runs end to end, on one thread, with no web server, no Celery, and no handler threads, today, with
about 40 lines of glue and six missing app attributes.** Consolidated run:

```
======================================================================
APP: GalaxyManagerApplication + 6 additions, build=2.13s, threads=1 ['MainThread']
     tools loaded: 73 | is_job_handler=True | celery=False | metadata_strategy=directory
======================================================================
1. STAGE  __DATA_FETCH__ (a job)     -> ok  7.97s  threads=1
2. RUN    cat1                        -> ok  4.10s  bytes-match=True  metadata.columns=6
3. RUN    dynamic nested collection   -> ok  4.49s  type=list:list leaf_elements=6 populated=True
4. FAIL   job_properties exit 127     -> error  4.86s  exit_code=127  stderr='The bool is really true'
======================================================================
final threads: ['MainThread']
TOTAL: 29.48s (app+imports 8.03s, jobs 21.44s)
```

That covers input staging (which is itself a job), a classic XML tool with metadata, dynamic output discovery
into a nested `list:list` collection, and the failure path with exit-code checking. `threading.enumerate()`
returned `['MainThread']` at every checkpoint.

The work is therefore **not** "make it possible". It is: (a) close six real gaps, (b) give it a supported API
shape in `lib/galaxy/`, (c) make `verify_tool` accept it.

---

## 1. Answers to the 12 open questions

### Q1 — What is the minimum app class that can execute a tool and run a job in-process?

**`GalaxyManagerApplication` plus six additions. Not `UniverseApplication`.** Executed, not read.

`GalaxyManagerApplication` alone builds in ~3s, spawns **zero threads**, and has `job_manager`,
`job_config`, `datatypes_registry`, `object_store`, `file_sources`, `security`, `tool_data_tables`, `model`,
`genome_builds`, `vault`, `history_manager`, `hda_manager`, `dataset_collection_manager`,
`dynamic_tool_manager`, `interactivetool_manager`, `job_metrics`, `job_search`, `queue_worker`,
`workflow_manager` — but raises on `toolbox` (`AssertionError`) and has no `toolbox_search`, `tool_cache`,
`container_finder`, `citations_manager`, `watchers`, `error_reports`.

The complete, empirically-derived gap list — every one of these is something `UniverseApplication.__init__`
does and `GalaxyManagerApplication.__init__` does not:

| # | Missing | Where `UniverseApplication` does it | How I found it |
| --- | --- | --- | --- |
| 1 | `_register_singleton(StructuredApp, self)` | `lib/galaxy/app/__init__.py:958` | `ConfigWatchers` DI resolved a bare `StructuredApp` → `AttributeError: 'StructuredApp' object has no attribute 'tool_cache'` |
| 2 | `error_reports` | `:1000-1002` | **Only surfaces on the failure path**: `JobWrapper.finish()` → `_report_error()` (`lib/galaxy/jobs/__init__.py:2414`) → `self.app.error_reports.default_error_plugin` (`:2893`). Success path never touches it. |
| 3 | `tool_cache` | `:1005` | prerequisite of `ConfigWatchers` (`lib/galaxy/config_watchers/__init__.py:44`) |
| 4 | `tool_shed_repository_cache` | `:1006` | mirrors Universe ordering |
| 5 | `watchers` | `:1008` | **hard requirement of the toolbox**: `lib/galaxy/tool_util/toolbox/base.py:358-359` reads `self.app.watchers.tool_watcher` / `.tool_config_watcher` unconditionally |
| 6 | `_configure_toolbox()` + the three toolbox-dependent loads | `:1009`, `:1022`, `:1024`, `:1026` | `load_lib_tools` (`:1026`) is what registers `__DATA_FETCH__` / `__SET_METADATA__`; without it staging fails with `ToolMissingException: Tool not found.` from `lib/galaxy/managers/tools.py:72` |

With those six, the app builds in **1.79–2.51s with exactly one thread** and 73 tools.

**Cost of `UniverseApplication` instead** — measured, and the surprise is that it is *not* about time:

| | build | threads after build | tools |
| --- | --- | --- | --- |
| `GalaxyManagerApplication` + 6 additions | **1.79–2.51s** | **1** (`MainThread`) | 73 |
| `UniverseApplication` | 2.03s | **12** | 71 |
| `build_galaxy_web_app` (PR #23360, `lib/galaxy/webapps/galaxy/fast_factory.py:76`) | **8.49s** | 14 | 71 |

`UniverseApplication` costs essentially nothing in wall time. What it costs is **11 background threads**:
`HistoryAuditTablePruneTask`, `JobHandlerQueue.monitor_thread`, `JobHandlerStopQueue.monitor_thread`,
`LocalRunner.work_thread-0..3`, `Thread-1`, `WorkflowCompletionMonitor.monitor_thread`,
`WorkflowRequestMonitor.monitor_thread`, `database_heartbeart_main.thread`. Plus config surface
(`visualizations_registry`, `tour_registry`, `webhooks_registry`, `auth_manager`, `proxy_manager`,
`data_managers`, `installed_repository_manager`, `update_repository_manager`, `genomes`,
`data_provider_registry`, `workflow_scheduling_manager`, `api_keys_manager`, `authnz_manager`,
`prune_history_audit_task`). Its `shutdown()` is clean and fast (0.01s), so teardown is not the objection —
**non-determinism is**. The argument for the smaller app is isolation and reproducibility, not speed.
State that honestly upstream; do not claim a startup win that is not there.

Side effect worth knowing: `_configure_toolbox()` → `_init_dependency_manager()` performed a **network
download of `involucro`** on first run. An embedded runtime API must be able to suppress that
(`no_dependency_resolution` / `involucro_auto_init: false`).

### Q2 — Is `WorkRequestContext` sufficient as `trans` for `ToolsService._create`?

**Yes for datasets; no for collection outputs unless you supply a `url_builder`.** Executed.

I wrapped `WorkRequestContext.__getattribute__` and ran a real `cat1` submission. The **complete** set of
`trans` members touched on the submission path:

```
_app, _short_term_cache, _tag_handler, _url_builder, anonymous, app, check_user_activation,
dataset_matcher_factory, db_dataset_for, galaxy_session, get_cache_value, get_current_user_roles,
get_galaxy_session, get_history, get_or_set_cache_value, history, log_event, sa_session, security,
set_cache_value, tag_handler, url_builder, user, user_is_active, user_is_admin,
user_is_bootstrap_admin, workflow_building_mode
```

Every one is provided by `WorkRequestContext` (`lib/galaxy/work/context.py:22`) or inherited from
`ProvidesHistoryContext`/`ProvidesUserContext`/`ProvidesAppContext` (`lib/galaxy/managers/context.py:78,205,314`).
Specifically the three the prompt flagged:

- `user_is_bootstrap_admin` (`services/tools.py:109`) — resolves fine; `managers/context.py:278` is
  `not self.anonymous and self.user.bootstrap_admin_user`, i.e. `False` for a real user. No gap.
- `security` — `managers/context.py:102`, delegates to `app.security`. No gap.
- `sa_session` — `managers/context.py:161`. No gap.

**The one real gap is `url_builder`.** `WorkRequestContext.__init__` defaults it to `None`
(`work/context.py:40,64`). It is *accessed* on every submission but only *called* for collection outputs:
`services/tools.py:451,462` pass `url_builder=trans.url_builder` into
`dictify_dataset_collection_instance`, which calls it at `lib/galaxy/managers/collections_util.py:131,138,142`.
Demonstrated:

```
trans.url_builder is: None
=== submit collection_creates_dynamic_nested (url_builder=None) ===
SUBMISSION FAILED: TypeError 'NoneType' object is not callable
=== now WITH a url_builder ===
submission with url_builder OK; output_collections: 1
```

Any callable fixes it (`lambda *a, **k: "http://in-process/"`). This is the same wart
`test/integration/test_live_evals.py:148` works around with `get_mcp_url_builder`.

**But see Q3/§2 — the chosen architecture avoids this entirely by not building an API response.**

### Q3 — Can `ToolsService` be driven without FastAPI?

**Yes, and the app container hands it to you.** Executed:

```
Q3: app[ToolsService] -> ToolsService
PHASE 1 (submission) OK in 0.03s
job id=1 state=new handler=_default_ tool=cat1
outputs: [('out_file1', 'd9abeb98649a6a7e')]
threads after submission: ['MainThread']
```

`app[ToolsService]` resolves through lagom by reflection from the singletons the manager app already
registers (`GalaxyAppConfiguration`, `ToolBoxSearch`, `IdEncodingHelper`, `HistoryManager` —
`services/tools.py:210-221`). No `ToolsService(...)` hand-construction needed, no FastAPI, no request.
The `starlette.datastructures.UploadFile` import at `services/tools.py:16` is only a type used by
`create_fetch(files=...)`; it never executes on the `_create` path. Starlette is a transitive dependency
of the `galaxy-web-apps` package anyway.

**Caveat that drove the architecture choice:** `ToolsService` ships in **`galaxy-web-apps`**
(`packages/web_apps/pyproject.toml:7`), which depends on `fastapi`, `gunicorn`, `uvicorn`, `fastmcp`
(`:18-40`). Importing it to "avoid the web server" imports the web package. See Q7/§2.

### Q4 — Does a synchronous job driver work end to end?

**Yes. Ran it.** One thread, real DB-backed `JobWrapper`, real outputs, byte-verified.

The glue is ~10 lines. `JobWrapper.__init__` (`lib/galaxy/jobs/__init__.py:2908`) needs a `queue` object with
only `.app` and `.dispatcher`:

```python
dispatcher = DefaultJobDispatcher(app)        # loads runner plugins; does NOT start threads
class SyncQueue:                              # stands in for JobHandlerQueue
    def __init__(self, app, dispatcher):
        self.app, self.dispatcher, self.sa_session = app, dispatcher, app.model.context
jw = JobWrapper(job, SyncQueue(app, dispatcher))
runner = dispatcher.get_job_runner(jw, get_task_runner=True)
assert jw.enqueue()                           # -> state QUEUED, which prepare_job requires
runner.queue_job(jw)                          # submit -> Popen -> wait -> finish, all here
```

Why this is safe: `DefaultJobDispatcher.__init__` (`lib/galaxy/jobs/handler.py:1281-1289`) only loads plugins;
threads start in `DefaultJobDispatcher.start()` (`:1291-1293`), which `JobHandler.start()` calls
(`:107-108`) and we never do. `BaseJobRunner.put` (`runners/__init__.py:203`) is exactly
`enqueue()` + `mark_as_queued()` (`:221`), and `mark_as_queued` is the single line that hands off to the
worker pool — so replicating `enqueue()` then calling `queue_job` directly is behaviourally identical minus
the thread. `prepare_job` asserts state `QUEUED` (`runners/__init__.py:294-297`), which `enqueue()` sets.

Result, for `cat1` on `test-data/1.bed` + `2.bed`:

```
enqueue() -> True in 0.02s; job.state=queued
queue_job() returned in 4.91s
RESULT job.state = ok        job exit_code = 0
threads at end: ['MainThread']
OUTPUT out_file1 hid=1 state=ok ext=bed size=8474
  metadata columns: 6 data_lines: 133   blurb: 133 regions 6 columns  peek set: True
OUTPUT == cat(1.bed,2.bed): TRUE
```

`LocalJobRunner.queue_job` (`lib/galaxy/jobs/runners/local.py:86`) Popens (`:104`), `proc.wait()`s, then
`_finish_or_resubmit_job` (`:156`) → `JobWrapper.finish()`. All on the calling thread, as the recon predicted.

**Against the alternative (let handler threads run it, poll the DB):** also works, but costs 6 threads
(`JobHandlerQueue.monitor_thread`, `JobHandlerStopQueue.monitor_thread`, `LocalRunner.work_thread-0..3`) and
carries the Q5 footgun. Wall time was a wash: 5.09s polled vs 4.1–4.9s synchronous. The synchronous driver
wins on determinism, not speed.

### Q5 — Is polling the DB for job terminal state safe from the submitting thread?

**Not without `expire_all()`. It silently never converges.** This is the sharpest trap I found, and I
reproduced it:

```
-- poll A: NO expire_all --
   t=0.0s state=new
   states seen without expire_all: ['new'] elapsed 25.11s     <-- job actually finished; poller never saw it

-- poll B: WITH expire_all --
   t=0.0s state=new
   t=0.3s state=queued
   t=0.5s state=running
   t=5.1s state=ok
   states seen WITH expire_all: ['new', 'queued', 'running', 'ok'] elapsed 5.09s
```

`app.model.context` is a `scoped_session`; the submitting thread's identity map pins the `Job` it created, and
`session.get()` returns the cached instance forever. Galaxy's own handler does exactly this before each scan:
`self.sa_session.expunge_all()` at `lib/galaxy/jobs/handler.py:454` ("Clear the session so we get fresh states
for job and all datasets"). Runner threads instead use a fresh scope: `with self.app.model.session():` at
`runners/__init__.py:148`.

So the pattern to cite is `handler.py:454`. **The chosen architecture removes the need for it** — a
synchronous driver has no cross-thread visibility problem — but any polling helper Galaxy ships must call
`expire_all()`/`expunge_all()` per tick or it is a latent hang.

### Q6 — Where does "almost works" actually die — output collection or metadata?

**Neither. It dies in `_report_error` on the failure path, and only there.** Executed both branches.

`JobWrapper.finish()` (`lib/galaxy/jobs/__init__.py:2112`) completed cleanly in **31–52 ms** on every success
run, including dataset discovery and metadata load. Point by point:

- **`outputs_to_working_directory`** (`jobs/__init__.py:1156-1157`) — a *destination* param, default `False`
  (`:1515`, `:2192` are both guarded by it). Not exercised; nothing in it needs a server.
- **Dataset discovery** — exercised for real. `discover_outputs` (`:2247`, `:2424`) →
  `tool.discover_outputs` (`:2448`) ran `<discover_datasets>` into a nested `list:list`:
  `type=list:list leaf_elements=6 populated=True`, contents `'A\n'..'F\n'` correct. `collect_extra_files`
  (`:2048`) is a plain filesystem walk.
- **`set_meta`** — does **not** run in the Galaxy process at all by default. It is appended to the *job script*
  by `command_factory.__handle_metadata` and runs inside the job subprocess. Observed command tail:
  `... _galaxy_setup_environment True; python metadata/set.py; sh -c "exit $return_code"`. Galaxy then just
  reads it back: `DEBUG:galaxy.model.metadata:loading metadata from file for: HistoryDatasetAssociation 3`.
  Verified correct: `metadata.columns=6 data_lines=133`. `embed_metadata_in_job` is a **job-destination
  param, not a `galaxy.yml` option** — default `True` via `DEFAULT_EMBED_METADATA_IN_JOB`
  (`lib/galaxy/jobs/runners/local.py:40`, used `:209`). The recon listed it as a config key; it is not.
- **`_fix_output_permissions`** (`:1452`, called `:1568`, `:2394`) — local `chmod`; ran without incident.
- **Celery escapes, both config-gated and both confirmed inert:**
  - `compute_dataset_hash.delay` (`:2364`) — guarded by `enable_celery_tasks` (`:2355`) *and* by
    `calculate_dataset_hash` being `always`/`upload` (`:2350-2353`; default `upload`,
    `config/sample/galaxy.yml.sample:2778`).
  - `task_wrapper.delay()` (`:2418`) — `task_wrapper` is only non-`None` from
    `ExpressionTool.exec_after_process` (`lib/galaxy/tools/__init__.py:3296`, returning `set_metadata.si(...)`
    at `:3326`), and only when `enable_celery_tasks` (`:3325`); the `else` branch at `:3332-3341` does an
    inline `output.set_meta()`. Base `Tool.exec_after_process` (`:2673`) returns `None`.
  - `__DATA_FETCH__` has a third escape: `lib/galaxy/tools/execute.py:387` routes fetch through a Celery chain
    when `config.is_fetch_with_celery_enabled()` (`lib/galaxy/config/__init__.py:1488`). Verified
    `is_fetch_with_celery_enabled: False` under `enable_celery_tasks: false`, and the fetch then ran as an
    ordinary job.
- **The one genuine break** — `self._report_error()` (`:2414`, and `fail()` at `:1569`) dereferences
  `self.app.error_reports` (`:2893`), a `UniverseApplication`-only attribute. On a tool that exits 127:

  ```
  ERROR:galaxy.jobs.runners:(2/24846) Job wrapper finish method failed
    File ".../lib/galaxy/jobs/__init__.py", line 2414, in finish
      self._report_error()
    File ".../lib/galaxy/jobs/__init__.py", line 2893, in _report_error
      self.app.error_reports.default_error_plugin.submit_report(...)
  AttributeError: 'GalaxyManagerApplication' object has no attribute 'error_reports'
  ```

  After adding `error_reports` (gap #2 in Q1), the failure path is fully correct:
  `state=error exit_code=127 stderr='The bool is really true'`, all three output datasets in `error`.

  **This is exactly the kind of bug a tool-test runner cannot tolerate** — it turns every failing tool test
  into an infrastructure crash instead of a reported failure. It is also the strongest argument that this
  belongs in Galaxy core with tests, not in Planemo.

### Q7 — Protocol extraction vs. transport injection?

**Protocol extraction. Transport injection is a dead end at the sync/async boundary, and buys the wrong thing.**

Transport injection, examined properly:

- `httpx==0.28.1` is already pinned (`lib/galaxy/dependencies/pinned-requirements.txt:107`) and does have
  `ASGITransport`. **But `httpx.ASGITransport` is async-only** — verified:
  `ASGITransport sync handle_request: False / async handle_async_request: True`;
  `WSGITransport sync handle_request: True`.
- `GalaxyInteractorApi._session()` is annotated `-> requests.Session` (`interactor.py:1301`) and every verb
  is a sync call on it (`:1314-1329`). `requests` ships only `BaseAdapter`/`HTTPAdapter` — no WSGI adapter.
- So the only sync in-process path is: Galaxy ASGI app → `a2wsgi.ASGIMiddleware`
  (`a2wsgi==1.10.10`, `pinned-requirements.txt:3`) → WSGI → `httpx.WSGITransport` → `httpx.Client`. That
  works on pinned deps, but it swaps `requests.Session` for `httpx.Client` across the whole interactor
  (including the `RequestsCookieJar` annotation at `interactor.py:295`), **and `a2wsgi.ASGIMiddleware` runs
  the ASGI app on its own event-loop thread** — so it is not even single-threaded.
- It also still builds the web app: `build_galaxy_web_app` measured at **8.49s / 14 threads** vs **2.13s /
  1 thread**. And it delivers HTTP-shaped JSON, not "managers and services", so it misses the stated ask.
- The prompt's own caution is correct: a loopback uvicorn in a thread already costs almost nothing
  (`lib/galaxy_test/driver/driver_util.py:535`). **If the goal were only "no socket", this whole project is
  not worth doing.** The goal is a core driving loop.

Protocol extraction costs: one `Protocol` definition, three annotation widenings
(`interactor.py:205`, `:252`, `:1755`), and an implementation. Nothing else changes.

### Q8 — If Protocol: what exactly goes in it?

Re-grepped `galaxy_interactor\.` across `interactor.py` — the recon's 12 members are exact, no more, no less:

```
3 galaxy_interactor.wait_for_job          1 galaxy_interactor.run_tool
1 galaxy_interactor.verify_output_collection  1 galaxy_interactor.resolve_tool_submission
1 galaxy_interactor.verify_output         1 galaxy_interactor.remote_to_input
1 galaxy_interactor.uploads               1 galaxy_interactor.new_history
1 galaxy_interactor.get_tool_tests        1 galaxy_interactor.get_job_stdio
1 galaxy_interactor.delete_history        1 galaxy_interactor._post
```

**Who would be forced to conform — checked, and the answer is nobody unexpected:**

- `lib/galaxy_test/base/populators.py` uses a *completely different* surface —
  `get`(×10), `post`(×8), `put`(×2), `api_url`(×2), `api_key`, `delete`, `test_history`,
  `jobs_for_tool_request`, `_summarize_history`, `_find_in_test_data_directories`. It never calls
  `verify_tool`. It therefore does **not** conform and must **not** be dragged into the Protocol.
- Planemo's entire coupling is two lines: `planemo/engine/galaxy.py:141` (constructs `GalaxyInteractorApi`)
  and `:161-163` (calls `verify_tool`).
- Galaxy's own consumer is `test/functional/test_toolbox_pytest.py:76-81` via `GalaxyTestDriver.run_tool_test`.

Proposed Protocol (new `lib/galaxy/tool_util/verify/protocols.py`, in `galaxy-tool-util` where `verify_tool`
lives; `_post` renamed to a public `stage_post` so the Protocol has no private members):

```python
class ToolTestInteractor(Protocol):
    uploads: dict[str, Any]

    def get_tool_tests(self, tool_id: str, tool_version: str | None = None) -> list[dict[str, Any]]: ...
    def new_history(self, history_name: str = ..., publish_history: bool = False) -> str: ...
    def run_tool(self, testcase, history_id, resource_parameters=None) -> RunToolResponse: ...
    def resolve_tool_submission(self, submit_response) -> Any: ...
    def delete_history(self, history: str) -> None: ...
    def wait_for_job(self, job_id: str, history_id: str | None = None, maxseconds: float = ...) -> None: ...
    def get_job_stdio(self, job_id: str) -> dict[str, Any]: ...
    def verify_output(self, history_id, jobs, output_data, output_testdef, tool_id, maxseconds) -> None: ...
    def verify_output_collection(self, output_collection_def, output_collection_id, history, tool_id) -> None: ...
    def remote_to_input(self, upload_response) -> dict[str, Any]: ...
    def stage_post(self, path, data=None, files=None, **kwd) -> Any: ...
```

Also required, and already nearly free: `StagingInterface` is an ABC with three abstract members —
`_post` (`lib/galaxy/tool_util/client/staging.py:53`), `_handle_job` (`:72`), `use_fetch_api` (`:296`).
Input staging is already pluggable; `InteractorStagingInterface` (`interactor.py:251`) is just one impl.

### Q9 — How do inputs get staged in-process?

**Through `__DATA_FETCH__`, driven by the same synchronous driver. Ran it.** The recursion is not a problem —
it is the *proof*, because it shows the driver composes.

```
is_fetch_with_celery_enabled: False
fetch job created id=1 state=new (0.05s); threads=['MainThread']
fetch job driven synchronously -> state=ok in 7.27s; threads=['MainThread']
  staged HDA hid=1 name=1.bed ext=bed state=ok size=4202
  staged HDA hid=2 name=2.bed ext=bed state=ok size=4272
=== RUN cat1 on staged inputs ===
cat1 job -> state=ok in 4.10s
OUTPUT byte-identical to cat(1.bed,2.bed): True
```

Three options and what breaks with each:

1. **`ToolsService.create_fetch` / `__DATA_FETCH__`** (what I ran) — highest fidelity, identical to the HTTP
   path, gives real sniffing/`ext`/metadata. Requires `load_lib_tools` (Q1 gap #6) and
   `enable_celery_tasks: false` (else `tools/execute.py:387` hands it to a Celery chain). Costs ~7s per
   staging job because it is a job. **Recommended.**
2. **The legacy `upload1` tool** — same job cost, older code path, no reason to prefer it.
3. **Creating HDAs directly** (`HistoryDatasetAssociation(create_dataset=True, ...)` +
   `object_store.create()` + `set_meta()`) — I used this in several experiments; it is ~0.05s instead of
   ~7s. What breaks: no sniffing, no `check_content`, no `to_posix_lines`/`space_to_tab`, no
   composite/deferred/remote sources, and it bypasses exactly the upload behaviour some tool tests are
   testing. **Acceptable only as an opt-in fast path for `ftype=`-explicit test data, never as the default.**

**Landmine I hit and must flag:** a fetch with `src: "path"` **moves the source file**. My first staging run
consumed `test-data/1.bed` and `test-data/2.bed` out of the pinned worktree (`git status` showed
`D test-data/1.bed`). I restored them with `git checkout --` immediately and the worktree is clean. Any
in-process staging implementation must copy test data into a scratch directory first, or use
`src: "files"` with a temp `local_filename` the way `create_fetch` does (`services/tools.py:303-310`).

### Q10 — What does Planemo actually get?

**A new engine, and Planemo imports nothing new from Galaxy internals.** Verified:

```
$ grep -rn "galaxy\.app|galaxy\.webapps|galaxy\.jobs|galaxy\.model" planemo/
(no matches)
```

Planemo today imports only `galaxy.tool_util`, `galaxy.util`, `galaxy.containers`, `galaxy.job_config`.
That is the ownership split working, and the plan must not break it.

- **New engine, not a flag.** `planemo/engine/factory.py:30-48` is an `if/elif` chain; add
  `elif engine_type_str == "inprocess_galaxy": engine_type = InProcessGalaxyEngine`. It is *not* a flag on
  `InstalledGalaxyEngine` (`planemo/engine/galaxy.py:217`), because that class's whole mechanism is
  Gravity-managed subprocesses (`planemo/galaxy/config.py:1296 InstalledGalaxyConfig`, `:1347
  _gravity_executable`). Per `01_UPSTREAM_CONSTRAINTS.md`, #1701 is not to be unwound; the two coexist.
- **What changes in `planemo/galaxy/config.py`:** a new config context that produces a *properties dict* and
  hands it to Galaxy's runtime API — no Gravity, no ports, no readiness polling, no
  `_shared_galaxy_properties` web bits. Planemo keeps: tool conf generation, test-data dir, temp dir /
  `no_cleanup`, `--galaxy_root` resolution, diagnostics. That is squarely "adapter and policy".
- **Packaging: no change, no new package.** `installed_galaxy = ["galaxy-app>=26.1,<26.2",
  "galaxy-web-apps>=26.1,<26.2", "gravity>=1.2.3"]` (PR #1701 `pyproject.toml:72-77`) already covers it, and
  the chosen architecture lands entirely in **`galaxy-app`** (see §2), so `galaxy-web-apps` is not even
  required for this path. Honors the standing bias against new release boundaries — I am explicitly
  declining to propose one.
- **Config Planemo must flip:** `enable_celery_tasks=True` at `planemo/galaxy/config.py:386` and `:525`.

### Q11 — What config must change?

Minimal kwargs set, each verified against the running app:

```yaml
enable_celery_tasks: false        # default already false (galaxy.yml.sample:3080).
                                  # PLANEMO SETS IT THE OTHER WAY (config.py:386, :525) -- must flip.
metadata_strategy: directory      # default (lib/galaxy/config/__init__.py:933). Keep.
watch_tools: false                # avoid filesystem watcher threads
watch_tool_data_dir: false
use_heartbeat: false              # default; avoid the heartbeat thread
conda_auto_init: false            # and involucro_auto_init -- see Q1 network side effect
conda_auto_install: false
check_migrate_databases: true     # sqlite file is created fresh
database_connection: sqlite:///<tmp>/universe.sqlite?isolation_level=IMMEDIATE
cleanup_job: never                # default is 'always' (galaxy.yml.sample:2863); 'never' for debuggability
```

Explicitly **not** needed, and this is a selling point:

- `track_jobs_in_database` — irrelevant to the synchronous driver. Default `true`
  (`galaxy.yml.sample:2729`) worked fine: `tool.handle_input` → `job_manager.enqueue` →
  `assign_handler` with `DB_TRANSACTION_ISOLATION` just stamps `job.handler = '_default_'` and commits
  (`lib/galaxy/web_stack/handlers.py:510-527`); no queue, no thread. With `false` it would take the
  `mem-self` branch and `queue_callback` into `job_manager.job_handler`, which is a `NoopHandler`
  (`jobs/manager.py:39`) unless `start()` was called. Harmless either way. Leave it alone.
- `job_handler_monitor_sleep` (default 1.0, `galaxy.yml.sample:2747`) and `monitor_thread_join_timeout`
  (default 30, `:1990`) — **both become dead config**, because there is no monitor thread and nothing to
  join. Today a Planemo tool test pays up to 1.0s of monitor-sleep latency per job for nothing.
- `embed_metadata_in_job` — not a `galaxy.yml` key. Job-destination param, default `True`
  (`lib/galaxy/jobs/runners/local.py:40`).

### Q12 — Does this actually run faster / simpler than the socket version?

**Simpler and more deterministic, yes. Meaningfully faster only at startup. Per-job, it is a wash — and I can
show exactly why.** Instrumented decomposition of one `cat1` job:

```
PHASE DECOMPOSITION for one cat1 job (seconds)
  1 submission  (ToolsService._create, in-process): 0.036
  2 enqueue()   (state gate, in-process)          : 0.020
  3 prepare+build_command_line (in-process)       : 0.405
  4 JOB SCRIPT SUBPROCESS (tool + metadata/set.py): 3.800   <-- process boundary, unavoidable
  5 finish()    (in-process)                      : 0.033
  GALAXY IN-PROCESS WORK TOTAL (1+2+3+5)          : 0.494
  4a tool_script.sh alone (the actual tool)       : 0.013
  4b => metadata/set.py + env setup overhead      : 3.787
```

**All of Galaxy's driving work is 0.494s. The tool itself is 0.013s. 3.787s — 89% of the job — is Python
interpreter startup inside the embedded-metadata subprocess**, and that is identical in every architecture.

So the honest ledger:

| | in-process | embedded web server |
| --- | --- | --- |
| startup | 2.13s, 1 thread | 8.49s, 14 threads |
| per job | ~4.3s | ~4.3s |
| per-job Galaxy work | 0.494s | 0.494s + HTTP + up to 1.0s monitor sleep |

The win is **~6.4s of startup, a single process, a single thread, no polling, and a stack trace that goes
from `pytest` to `LocalJobRunner.queue_job` without a thread boundary.** It is debuggability and
determinism. Say that plainly; do not oversell throughput.

**This is also the answer to mvdbeek's GIL objection** (`#1690`, 2026-09-02: *"gravity has the subprocess
setup, isn't that the right abstraction? threads are going to be gil bound"*):

1. The GIL is not the binding constraint, and the numbers say so. There is **0.494s of Python work per job**
   against **3.800s spent blocked in `proc.wait()`** on a real subprocess. A tool test is latency-bound on
   startup and correctness-bound on sequencing. There is essentially no parallel CPU work to contend for.
2. **The proposal does not add threads — it removes them.** This is not "threads instead of subprocesses".
   The synchronous driver runs on **one** thread; today's path runs on **6** (handler monitor, stop-queue
   monitor, 4 runner workers) or **14** with the web app. The real job still Popens
   (`runners/local.py:104`) and is still fully awaited. **Process isolation for the tool is preserved
   exactly.** What is removed is Galaxy's *internal* thread hand-off, which is where the Q5 silent-hang and
   the Q6 error-path crash live.
3. If throughput across many tool tests is ever wanted, the right axis is N Galaxy processes each running one
   tool test synchronously — which is what Planemo/pytest-xdist already do, and which this design supports
   better than the threaded one, because a synchronous driver has no shared mutable queue state.

Concede honestly: for a *production* Galaxy serving many concurrent users, Gravity's subprocess model remains
correct. This is a **test/development driving loop**, not a replacement for the handler.

---

## 2. Chosen architecture

**A four-phase synchronous tool-runtime library in `lib/galaxy/` (`galaxy-app`), driving `tool.handle_input`
and `LocalJobRunner.queue_job` directly on the caller's thread, on a `GalaxyManagerApplication` subclass that
adds a toolbox and error reporting and starts no threads; `verify_tool` reaches it through a narrow
`ToolTestInteractor` Protocol.** The decisive experiment: with `ToolsService` removed from the picture and
`tool.handle_input(trans, incoming, history=history)` called directly, the spine still runs end to end —
`tool.handle_input OK in 0.032s` → `driven -> state=ok in 4.90s` → `bytes match: True` — with
`galaxy.webapps imported at end? []`. That means the core loop lives in **`galaxy-app` with zero
`galaxy-web-apps` dependency**, no `url_builder` is needed (Q2's only gap exists solely to build an *API
response*, which a library caller does not want), and Planemo's existing `installed_galaxy` extra already
covers it — so no new package and no new release boundary, per John's standing position. `ToolsService`
remains usable and verified (Q3) for anyone who wants API-shaped dicts; the library simply does not require it.

**Rejected: transport injection** (`session_factory` + `a2wsgi.ASGIMiddleware` + `httpx.WSGITransport`).
It is genuinely cheaper to write — zero interactor refactor — and I verified the dependencies are already
pinned. I reject it because (a) `httpx.ASGITransport` is async-only so the "obvious" version does not exist,
and the workaround runs the ASGI app on its own event-loop thread, i.e. it is not single-threaded; (b) it
still builds the web app — 8.49s and 14 threads against 2.13s and 1; (c) it swaps `requests` for `httpx`
across the whole interactor; and (d) it delivers HTTP JSON, not "a core driving loop that just handles
actions", so it answers a different question than the one asked. **Rejected: `UniverseApplication`** —
affordable in time (2.03s) but it starts 11 background threads, which is precisely the non-determinism the
ask exists to remove.

---

## 3. Phased plan

Five steps, each independently mergeable into `galaxyproject/galaxy` `dev`. Steps 1–2 are useful on their own
even if the rest is never merged.

### Phase 1 — `ToolRuntimeApplication`: a toolbox-capable app that starts no threads

**Changes.** `lib/galaxy/app/__init__.py`. Extract the block `UniverseApplication.__init__` already runs —
`:958` (`StructuredApp` singleton), `:1000-1002` (`error_reports`), `:1005-1008` (`tool_cache`,
`tool_shed_repository_cache`, `watchers`), `:1009` (`_configure_toolbox()`), `:1022`/`:1024`/`:1026`
(`load_datatype_converters`, `load_external_metadata_tool`, `load_lib_tools`) — into a new
`MinimalGalaxyApplication._configure_tool_runtime()`. `UniverseApplication.__init__` calls it in place of
those lines; a new `class ToolRuntimeApplication(GalaxyManagerApplication)` calls it and nothing else.
**Net effect is de-duplication, not addition** — that framing matters for review.

**Red-to-green.** New `test/unit/app/test_tool_runtime_app.py` (precedent: `test/unit/app/tools/test_toolbox.py:16`
already imports `UniverseApplication`; `test/unit/app/test_celery.py` builds a real `GalaxyAppConfiguration`).

- Red 1: `test_manager_app_has_no_toolbox` — assert `GalaxyManagerApplication(**cfg).toolbox` raises. Passes
  immediately; it is the regression guard for the premise.
- Red 2: `test_tool_runtime_app_loads_toolbox` — `ToolRuntimeApplication(**cfg)`; assert
  `app.toolbox.get_tool("cat1")` is not None **and** `app.toolbox.get_tool("__DATA_FETCH__")` is not None.
  Fails with `AttributeError: ... 'watchers'` before the change.
- Red 3: `test_tool_runtime_app_starts_no_threads` — `assert threading.enumerate() == [threading.main_thread()]`
  after construction. This is the test that keeps the property true forever, and the one I most want in-tree.
- Red 4: `test_tool_runtime_app_has_error_reports` — `assert app.error_reports is not None`. Cheap guard for
  the Q6 crash.

**Reused.** `GalaxyManagerApplication` (`app/__init__.py:701`), `ConfigWatchers`, `ToolCache`,
`ToolShedRepositoryCache`, `ErrorReports`, `_configure_toolbox`, `load_lib_tools`
(`lib/galaxy/tools/special_tools.py:40`), the lagom container (`_register_singleton`).

**New reusable abstraction.** `ToolRuntimeApplication` itself. Other in-tree users: `lib/galaxy/celery/__init__.py:129-149`
builds a `GalaxyManagerApplication` for Celery workers and its comment at `:146` says explicitly that it has
no toolbox — Celery tasks that need one (`set_metadata`, `fetch_data`) would be the second consumer.
`test/unit/app/tools/` fixtures are a third.

**Blast radius.** `UniverseApplication.__init__` line moves (careful: ordering between `error_reports`,
`tool_cache`, `watchers` and `_configure_toolbox` is load-bearing — `ConfigWatchers` needs `tool_cache`,
`ToolBox` needs `watchers`). Nothing else. No behaviour change for existing callers.

### Phase 2 — `SynchronousJobHandler`: run a job to terminal state on the calling thread

**Changes.** `lib/galaxy/jobs/handler.py`. Add `class SynchronousJobHandler(JobHandlerI)` that owns a
`DefaultJobDispatcher` it never `start()`s, satisfies the `.app`/`.dispatcher`/`.sa_session` contract
`JobWrapper.__init__` (`jobs/__init__.py:2908`) needs, and exposes:

```python
def run(self, job: model.Job) -> model.Job:
    jw = JobWrapper(job, self)
    runner = self.dispatcher.get_job_runner(jw, get_task_runner=True)
    if not jw.enqueue():
        return job                      # enqueue() already failed the job
    runner.queue_job(jw)
    self.sa_session.expire_all()
    return self.sa_session.get(model.Job, job.id)
```

Putting it beside `JobHandler` (`:94`) and `NoopHandler` makes it a peer implementation of an existing
interface rather than a new concept.

**Red-to-green.** Extend `test/unit/app/jobs/test_runner_local.py`, which today only exercises
`MockJobWrapper` (`:147`). Add `test_queue_job_real_wrapper_reaches_terminal_state`: build a
`ToolRuntimeApplication` on `tmp_path`, create user/history/HDAs, `tool.handle_input`, then
`SynchronousJobHandler(app).run(job)`; assert `job.state == "ok"`, `job.exit_code == 0`, output file bytes
equal `cat(1.bed, 2.bed)`, and `threading.enumerate() == [main_thread()]`. Add
`test_failing_tool_reports_error_not_attributeerror` driving `job_properties` with `failbool=true` and
asserting `job.state == "error"` and `job.exit_code == 127` — **this is the test that would have caught the
`error_reports` crash**, and it must be written red (it fails with `AttributeError` if Phase 1 regresses).

**Reused.** `DefaultJobDispatcher` (`handler.py:1281`), `JobWrapper` (`jobs/__init__.py:2907`),
`MinimalJobWrapper.enqueue` (`:1821`), `BaseJobRunner.prepare_job` (`runners/__init__.py:275`),
`LocalJobRunner.queue_job` (`local.py:86`), `JobHandlerI`.

**New reusable abstraction.** `SynchronousJobHandler`. Second consumer in-tree: `test/unit/app/jobs/` and
`test/unit/app/tools/test_collect_primary_datasets.py`-style tests that currently cannot run a real job.

**Blast radius.** Additive only. Does not touch `JobHandler`, `JobHandlerQueue`, or the runner thread pool.
Risk to call out in review: `queue_job` is now reachable on a thread that also owns the submitting session —
mitigated because it is the *same* session throughout, which is strictly simpler than today's cross-thread
case.

### Phase 3 — `galaxy.tool_runtime`: the four-phase library API

**Changes.** New `lib/galaxy/tool_runtime/__init__.py` (`galaxy-app`). A context manager owning the app
lifecycle and exposing John's spine explicitly:

```python
@contextmanager
def tool_runtime(**config_kwargs) -> Iterator[ToolRuntime]: ...

class ToolRuntime:
    def submit(self, tool_id, inputs, history=None, user=None) -> ToolSubmission   # phase 1
    def prepare(self, submission) -> PreparedJob                                   # phase 2 (stops before Popen)
    def execute(self, prepared) -> model.Job                                       # phase 3
    def finalize(self, job) -> ToolRunResult                                       # phase 4 (already done by execute)
    def run(self, tool_id, inputs, ...) -> ToolRunResult                           # all four
    def stage(self, targets) -> list[HistoryDatasetAssociation]                    # __DATA_FETCH__
```

`submit` wraps `tool.handle_input` with a `WorkRequestContext` — **not** `ToolsService`, so no
`galaxy.webapps` import and no `url_builder` requirement. Teardown mines the `embed_galaxy` branch's hazard
catalogue (`planemo/galaxy/embedded.py`: `_stop_fork_pool` :360, `_join_fork_pool` :366, `_embedded_logging`
:198, `_patched_environment` :182) — but most of those hazards are Celery/uvicorn-specific and **do not apply
here**, which is itself a result worth stating: with `enable_celery_tasks: false` and no web app there is no
fork pool and no event loop to unwind. `app.shutdown()` measured 0.01s leaving one thread.

**Red-to-green.** New `test/unit/app/tools/test_tool_runtime.py`:
`test_run_tool_end_to_end` (cat1, assert bytes + `metadata.columns == 6`);
`test_stage_then_run` (fetch two files, then cat1 — the Q9 recursion);
`test_dynamic_discovery_collection` (assert `list:list`, 6 leaf elements, `populated is True`);
`test_prepare_without_execute_writes_tool_script` (assert `tool_script.sh` exists and contains the expanded
`cat` command line, and that **no subprocess ran**). All four are exactly what I already executed.

**Reused.** `WorkRequestContext` (`work/context.py:22`), `Tool.handle_input`, `galaxy.tools.execute`,
`ToolRuntimeApplication` (Phase 1), `SynchronousJobHandler` (Phase 2), `galaxy.util.wait.wait_on` (via
`lib/galaxy/tool_util/verify/wait.py`) if any polling is ever needed, `app.object_store`, `HistoryManager`.

**New reusable abstraction.** The `tool_runtime` context manager — this is the "some library code" John asked
for, and it is the thing Planemo depends on instead of Galaxy internals. In-tree second consumers:
`lib/galaxy_test/driver/driver_util.py` could use it for tests that need a tool run but not a server;
`test/unit/app/tools/` broadly.

**Blast radius.** New package directory; add to `packages/app/pyproject.toml` package list. No existing code
changes.

### Phase 4 — `ToolTestInteractor` Protocol + `InProcessToolTestInteractor`

**Changes.**
- New `lib/galaxy/tool_util/verify/protocols.py` with the Protocol from Q8 (`galaxy-tool-util` — where
  `verify_tool` lives, so no new dependency direction).
- Widen three annotations: `interactor.py:205` (`stage_data_in_history`), `:252`
  (`InteractorStagingInterface.__init__`), `:1755` (`verify_tool`) from `GalaxyInteractorApi` to
  `ToolTestInteractor`.
- Rename `GalaxyInteractorApi._post` → `stage_post` with `_post` kept as an alias (private members in a
  Protocol are a smell; `staging.py:53` already names the abstract member `_post`, so align both).
- New `lib/galaxy/tool_runtime/interactor.py` (`galaxy-app`) — `InProcessToolTestInteractor` implementing the
  12 members on top of Phase 3, plus an `InProcessStagingInterface(StagingInterface)`
  (`lib/galaxy/tool_util/client/staging.py:44`) whose `_handle_job` is `SynchronousJobHandler.run`.
  `get_tool_tests` delegates to `parse_tool_test_descriptions` (`lib/galaxy/tool_util/verify/parse.py:61`),
  which is pure and already the right front door.

**Red-to-green.**
- `test/unit/tool_util/test_interactor_protocol.py`: `test_galaxy_interactor_api_satisfies_protocol` —
  `assert isinstance(GalaxyInteractorApi(...), ToolTestInteractor)` with `@runtime_checkable`. Red until the
  Protocol matches reality; guards against drift.
- `test/unit/app/tools/test_inprocess_interactor.py`: `test_verify_tool_passes_in_process` — call
  `interactor.verify_tool("cat1", InProcessToolTestInteractor(runtime), test_index=0)` and assert it does not
  raise; then `test_verify_tool_detects_wrong_output` against a deliberately-broken expectation, asserting it
  *does* raise. The second one matters: a test runner that never fails is worthless.

**Reused.** `verify_tool` (`interactor.py:1753`), `_verify_outputs` (`:1922`), `verify_hid` (`:1515`),
`verify_collection` (`:1547`), `ToolTestDescription` (`:2206`), `parse_tool_test_descriptions`,
`StagingInterface`, `galaxy.util.wait.wait_on`. **All assertion logic is already interactor-parameterised and
not HTTP-coupled** — that is what makes this cheap.

**New reusable abstraction.** `ToolTestInteractor`. Second consumer: `test/functional/test_toolbox_pytest.py`
via `GalaxyTestDriver.run_tool_test` could gain an in-process mode for framework tools, cutting server
startup out of CI for the tools that do not need it.

**Blast radius.** Three annotations widened (typing only). One rename with an alias. `populators.py` is
untouched and deliberately does **not** conform (Q8). Planemo still compiles unchanged because
`GalaxyInteractorApi` still satisfies the Protocol.

### Phase 5 — Planemo `InProcessGalaxyEngine`

**Changes (Planemo repo, separate PR, after Galaxy release).**
`planemo/engine/factory.py:30-48` gains one `elif`. New `planemo/engine/inprocess.py` with
`InProcessGalaxyEngine(BaseEngine)` whose `_run_galaxy_tool_test_case` swaps the two lines at
`planemo/engine/galaxy.py:141,161` for `InProcessToolTestInteractor(runtime)`. New config context in
`planemo/galaxy/config.py` producing a properties dict (Q11) — **no Gravity, no ports, no readiness polling**,
per `01_UPSTREAM_CONSTRAINTS.md`. Planemo gains no knowledge of `galaxy.app`, `galaxy.jobs` or `galaxy.model`;
it imports only `galaxy.tool_runtime`.

**Red-to-green.** `tests/test_cmd_test.py` style: `planemo test --engine inprocess_galaxy` against
`project_templates/demo/cat.xml`, asserting the JSON report shows a pass, and against a deliberately-broken
tool asserting a fail.

**Blast radius.** Additive. #1701's Gravity engine untouched, per John's "I don't think that goal should
prevent this from using gravity in this modality though."

---

## 4. Ordering relative to ask #2 (the tool-script CLI)

**They share a substrate, and ask #1 *is* the substrate. Ask #2 is a strict prefix of ask #1 plus a
serializer. Do ask #1 first.** I did not assume this — I tested it.

I stopped the spine after `runner.prepare_job(jw)` — no `Popen`, no `finish()` — and inspected the working
directory:

```
prepare_job() -> True in 0.227s (NO subprocess run)
tool_script.sh exists: True
---- tool_script.sh ----
#!/bin/bash
# ... integrity-check block ...
set -e
cat '.../dataset_fed5f7b7-....dat' '.../dataset_67cc90f0-....dat' > '.../dataset_79a6d64f-....dat'
---- runner_command_line (the job-level wrapper) ----
cd working; /bin/bash .../tool_script.sh > '../outputs/tool_stdout' 2> '../outputs/tool_stderr'; ...
---- environment_variables computed by the evaluator ----
[{'name': 'HOME', 'value': '"$_GALAXY_JOB_HOME_DIR"', 'raw': True}]
threads: ['MainThread']
```

**That is ask #2's deliverable, obtained in 0.227s as phases 1–2 of ask #1**, with a real `Tool`, a real
`Job`, and a real `ComputeEnvironment` — no `SessionlessContext`, no hand-built ORM graph, no fourth
hand-rolled `ComputeEnvironment`, and no risk that a hand-built object graph diverges from what production
does. It also cleanly separates the two halves the recon identified (`10_RECON.md` §2): `tool_script.sh` is
the tool detail, `runner_command_line` + `environment_variables` are the job detail that ask #2 says is out
of scope.

Concrete ordering consequence: **Phase 1 + Phase 2 + `ToolRuntime.prepare()` (Phase 3, partial) deliver ask
#2 as a by-product.** Building ask #2 first on `SessionlessContext` (`lib/galaxy/model/store/__init__.py:223`)
would create a parallel, lower-fidelity path that ask #1 then makes redundant — and `SessionlessContext`'s
`query().filter_by()` is a stub returning the first object of a class (`:249-251`), which is a latent
correctness problem ask #1's real sqlite does not have.

**The honest counter-argument, which the reconciling agent must weigh:** ask #2's stated aim is *rapid tool
development*, and my path costs ~2s of app build plus real staging before you see a command line, whereas a
`SessionlessContext` path could plausibly be sub-second. If the sibling agent's plan demonstrates a
materially faster loop with acceptable fidelity, the right answer may be "both, sharing Phase 1". My evidence
supports Phase 1 (`ToolRuntimeApplication`) being shared **regardless** — every route to a real `Tool` object
needs a toolbox-capable app, and today the only one is `UniverseApplication` with its 11 threads.

---

## 5. Claims I could not verify

1. **Everything above was executed except where this section says otherwise** — but on **macOS 15 (arm64),
   Python 3.12, sqlite**, with `LocalJobRunner` only. Not verified on Linux, not on PostgreSQL, not with any
   other runner. Handler-assignment behaviour in particular differs on PostgreSQL:
   `DB-SKIP-LOCKED` was unavailable here (log: "Database does not support WITH FOR UPDATE statement") and it
   fell back to `DB_TRANSACTION_ISOLATION`.
2. **Conda/dependency resolution was effectively a no-op.** `cat1` declares
   `<requirement type="package" version="8.31">coreutils</requirement>` but the dependency dir did not exist
   ("Path '.../dependencies' does not exist, ignoring"), so the tool ran against system `cat`. **I have not
   verified that conda resolution works in-process**, and `_init_dependency_manager()` did perform a network
   download of `involucro`. This is a real gap for Planemo, whose tool tests routinely resolve conda.
3. **No container (Docker/Singularity) job was run.** `modify_command_for_container` and
   `container.containerize_command` (`command_factory.py:114`) are untested on this path.
4. **`outputs_to_working_directory: True` was never exercised.** I wrote the experiment but only ran the
   `False` (default) branch. `jobs/__init__.py:1515` and `:2192` are read-only claims.
5. **I never ran `verify_tool` itself.** Phase 4 is designed from the call-site grep (which I did verify
   exhaustively) but no in-process interactor was written or executed. The claim "verify_tool's assertion
   logic is not HTTP-coupled" is **read, not run**.
6. **I did not run Galaxy's existing test suites** (`test/unit/app/jobs/`, `test/functional/test_toolbox_pytest.py`)
   to confirm Phase 1's `UniverseApplication` refactor is non-breaking. The refactor is line-movement, but
   the ordering constraint between `error_reports`/`tool_cache`/`watchers`/`_configure_toolbox` is real and
   an actual PR must run the suites.
7. **`enable_celery_tasks: True` was never run** to observe the failure. The three escape hatches
   (`jobs/__init__.py:2364`, `:2418`, `tools/execute.py:387`) and their guards were read, not executed.
8. **The `a2wsgi.ASGIMiddleware` → `httpx.WSGITransport` chain was never actually constructed.** I verified
   the sync/async split of `httpx` transports empirically and read `a2wsgi`'s signature; I did not build a
   working in-process transport and prove it fails or succeeds.
9. **Timings are single-sample, on a warm filesystem, on a laptop.** The 8.49s vs 2.13s startup gap is large
   enough to survive noise; the 4.10s vs 4.49s per-job differences are not.
10. **Planemo Phase 5 is entirely unexecuted.** No Planemo code was run. `grep` proved Planemo imports no
    `galaxy.app`/`galaxy.jobs`/`galaxy.model` today; everything else in Phase 5 is design.
11. **`GalaxyManagerApplication` + the six additions may still be missing something** that only a wider tool
    corpus would reveal. I exercised 4 tools (`cat1`, `__DATA_FETCH__`, `collection_creates_dynamic_nested`,
    `job_properties`). `error_reports` was invisible until I ran a *failing* tool — there may be more such
    attributes behind data managers, interactive tools, expression tools, or `<configfiles>`.
12. **Package layering is inferred, not built.** I showed `galaxy.webapps` is never imported on the
    `tool.handle_input` path in a source checkout with everything on `PYTHONPATH`. I did not install
    `galaxy-app` alone from `packages/app/` and confirm the path works without `galaxy-web-apps`.

---

## 6. Unresolved questions

- Conda resolution in-process — works? Cost? Blocks Planemo parity. Biggest unknown.
- `involucro`/`conda` auto-init does network I/O at `_configure_toolbox()`. Which config kills it cleanly?
- Phase 1 refactor: does moving those 9 lines out of `UniverseApplication.__init__` break the full suite?
- Should `ToolRuntimeApplication` live in `galaxy.app` or a new `galaxy.tool_runtime`? Former = less surface, latter = clearer ownership.
- `metadata/set.py` is 89% of per-job wall time. Separate optimization, or in scope? It dwarfs everything else here.
- Protocol name + home: `tool_util/verify/protocols.py` vs adding to `interactor.py`.
- Rename `_post` → `stage_post`? Breaks nobody in-tree, but `StagingInterface._post` (`staging.py:53`) would want the same treatment.
- Does `verify_tool` need `uploads` as a mutable dict attr, or can it be a method? Protocol with a mutable attr is awkward.
- Containers on this path — untested. Does `modify_command_for_container` care about the thread?
- Fetch `src: "path"` moves the source file. Should the in-process staging impl always copy, or expose it?
- Planemo engine name: `inprocess_galaxy`? (matches `installed_galaxy`/`external_galaxy` convention)
- Who owns the `WorkRequestContext` user/history? Runtime creates a throwaway user per session, or caller supplies?
- Ask #2 sibling may propose `SessionlessContext`. If it's materially faster, do we ship both on shared Phase 1?
