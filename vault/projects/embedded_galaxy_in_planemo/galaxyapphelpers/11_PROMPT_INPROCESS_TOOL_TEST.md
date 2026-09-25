# 11 — PROMPT: Run a Galaxy tool test in-process, no web server

You are planning agent 1. Research + planning only. **Do not modify any file in any Galaxy or Planemo
worktree.** Your only write is `20_PLAN_INPROCESS_TOOL_TEST.md` in this directory.

## The ask (from John Chilton, Galaxy core dev)

> Run a Galaxy tool test without a web server. Galaxy is broken into managers and services; figure out how
> to leverage those to run a tool test in-process. The hard part: jobs don't even run in the same thread
> as tool submission.

Context: Planemo PR #1701 ("Run package-installed Galaxy through Gravity", OPEN) established that Planemo
can run the Galaxy packages installed in its own virtualenv, managed by Gravity. This ask pushes that much
further into Galaxy. **This is a Galaxy change**, filed under a Planemo project directory for convenience.

## Pinned substrate

- Galaxy, read-only: `/Users/jxc755/projects/repositories/galaxy-embedded-research`, detached at
  `c6c3b6df49` (== `origin/dev` as of 2026-09-16). **Use only this worktree.** Do NOT use
  `~/projects/repositories/galaxy` — it is 854 commits stale.
- Planemo PR #1701: `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/embedded_galaxy_in_planemo/planemo-installed-galaxy-gravity`
  (branch `package-installed-galaxy-gravity`, `a9a48ca5`).
- Planemo master: `/Users/jxc755/projects/repositories/planemo`.

## Read `10_RECON.md` in this directory first

It has the full submission→outputs trace, a seam table, and a "claims I could not verify" list. Start from
its findings; verify, then go deeper. Do not re-do the recon.

## Recon findings you inherit (verify, then build on)

1. **`LocalJobRunner.queue_job()` is synchronous.** Popen → `proc.wait()` → `_finish_or_resubmit_job` →
   `JobWrapper.finish()`, all on the calling thread.
   `lib/galaxy/jobs/runners/local.py:86-156`; `lib/galaxy/jobs/runners/__init__.py:638,700`.
   Galaxy's own unit test calls it directly and asserts stdout: `test/unit/app/jobs/test_runner_local.py:38-42`
   (but with `MockJobWrapper`, `:147` — not a real one).
2. **Only two thread boundaries exist, both bypassable**: `JobHandlerQueue.monitor_thread`
   (`lib/galaxy/jobs/handler.py:278,404`) and the runner worker pool
   (`lib/galaxy/jobs/runners/__init__.py:126-133,146`). The Popen of the job script
   (`local.py:104`) is a real process boundary and must stay.
3. **App-without-web-stack is solved; `GalaxyManagerApplication` has no toolbox.**
   `lib/galaxy/celery/__init__.py:129-149` (see the comment at :146). `_configure_toolbox()` is only
   called from `UniverseApplication.__init__` (`lib/galaxy/app/__init__.py:1009`).
4. **`register_postfork_function` executes immediately** (`lib/galaxy/web_stack/__init__.py:46-48`), so
   `UniverseApplication.__init__` already starts the job handler (`app/__init__.py:1108`). Nothing extra
   is needed to "get job handlers running in-process".
5. **Async escapes out of `finish()` are config-gated**: `compute_dataset_hash.delay` only under
   `enable_celery_tasks` (`lib/galaxy/jobs/__init__.py:2355-2364`); `task_wrapper.delay()` for
   `exec_after_process` (:2418). Metadata is embedded in the job process by default
   (`metadata_strategy: directory` at `lib/galaxy/config/__init__.py:933`;
   `local.py:201-210`). **Planemo currently sets `enable_celery_tasks=True`**
   (PR #1701 worktree `planemo/galaxy/config.py:386,525`).
6. **No Celery eager mode in Galaxy.** Only a single test pokes `task_always_eager`
   (`test/integration/test_hashicorp_vault.py:203,222`). `enable_celery_tasks: false` skips tasks rather
   than running them eagerly.
7. **The interactor hot path is 10 methods + 1 attribute + `_post`**, not ~60. Exhaustively verified:

   | Member | defined | called from |
   | --- | --- | --- |
   | `get_tool_tests` | `lib/galaxy/tool_util/verify/interactor.py:356` | `verify_tool:1777` |
   | `new_history` | :558 | `verify_tool:1814` |
   | `run_tool` | :826 | `verify_tool:1844` |
   | `resolve_tool_submission` | :954 | `verify_tool:1849` |
   | `delete_history` | :1053 | `verify_tool:1907` |
   | `wait_for_job` | :493 | `_verify_outputs:1944`, `InteractorStagingInterface:266,275` |
   | `get_job_stdio` | :518 | `_verify_outputs:1950` |
   | `verify_output` | :388 | `_verify_outputs:1994` |
   | `verify_output_collection` | :363 | `_verify_outputs:2030` |
   | `remote_to_input` | :665 | `stage_data_in_history:219` |
   | `uploads` (dict attr) | :320 | `:232,854,884,890,1025` |
   | `_post` | :1314 | `InteractorStagingInterface._post:260` |

   Concrete-type annotations to widen: `interactor.py:205` (`stage_data_in_history`), `:252`
   (`InteractorStagingInterface.__init__`), `:1755` (`verify_tool`). The only existing `Protocol` in
   `verify/` is `TestConfig` (:1707).
8. **Input staging is already pluggable.** `StagingInterface` is an ABC with three abstract members:
   `_post` (`lib/galaxy/tool_util/client/staging.py:53`), `_handle_job` (:72), `use_fetch_api` (:296).
   `InteractorStagingInterface` (`interactor.py:251`) is just one impl.
9. **Waiting is transport-agnostic already**: `lib/galaxy/tool_util/verify/wait.py` re-exports
   `galaxy.util.wait.wait_on`.
10. **Competing approach — transport injection.** `GalaxyInteractorApi.__init__` takes a
    `session_factory` kwarg (`interactor.py:303`) and every verb funnels through `self._session()`
    (:1301-1312). `a2wsgi` is already pinned (`lib/galaxy/dependencies/pinned-requirements.txt:3`, used at
    `lib/galaxy/webapps/galaxy/fast_app.py:10` and `lib/galaxy_test/driver/driver_util.py:23`).
11. **`WorkRequestContext` is the non-web `trans`** (`lib/galaxy/work/context.py:22`), already used by
    managers (`lib/galaxy/managers/jobs.py:2315`, `lib/galaxy/managers/workflows.py:660,1098`) and by the
    tool evaluator itself (`lib/galaxy/tools/evaluation.py:305,385`). Gotcha: `url_builder=None` makes
    `trans.url_for` raise; `test/integration/test_live_evals.py:148` works around it with
    `get_mcp_url_builder`.
12. **Planemo's consumption points are two lines**: `planemo/engine/galaxy.py:141` constructs
    `GalaxyInteractorApi`, `:161` calls `interactor.verify_tool(...)`. Galaxy's own consumer is
    `test/functional/test_toolbox_pytest.py:80` via `GalaxyTestDriver.run_tool_test`.

## What to study (with file:line — start here, then go wider)

**Services / trans**
- `lib/galaxy/webapps/galaxy/services/tools.py` — `ToolsService` :209, `_create` :345,
  `_handle_inputs_output_to_api_response` :412, `validate_tool_for_running` :107, `get_tool` :88.
  Determine empirically: which `trans` members does the tool-execution path actually touch, and is the
  service genuinely FastAPI-free? (It imports `starlette.datastructures.UploadFile` at :16 — assess.)
- `lib/galaxy/webapps/galaxy/services/` — also `histories.py`, `datasets.py`, `jobs.py` for the staging
  and result-fetching sides.
- `lib/galaxy/work/context.py:22` `WorkRequestContext`, `:159` `SessionRequestContext`,
  `:190` `proxy_work_context_for_history`. `lib/galaxy/managers/context.py` for `ProvidesHistoryContext`.
- How Celery tasks obtain a context: `lib/galaxy/celery/__init__.py:110 set_thread_app`, `:114 get_galaxy_app`,
  `:129 build_app`, `:197 galaxy_task` (`app.magic_partial(func)` DI at :234). Look at
  `lib/galaxy/celery/tasks.py` for actual task signatures — do they take a `trans` at all?

**App**
- `lib/galaxy/app/__init__.py:301 MinimalGalaxyApplication`, `:701 GalaxyManagerApplication`,
  `:936 UniverseApplication`. Diff what :936 adds over :701 and decide the minimum.
  Key lines: `_configure_toolbox` defined :382, called :1009; `job_manager.start` registered :1108;
  `is_job_handler` :919.
- `lib/galaxy/web_stack/__init__.py:28 ApplicationStack`, `:46 register_postfork_function`,
  `:227 WeblessApplicationStack`.
- `lib/galaxy/app_unittest_utils/galaxy_mock.py:112 MockApp` — note `job_manager = NoopManager()` (:166),
  `is_job_handler = False` (:172), `job_config` is a `Bunch` stub (:154-159).
  `lib/galaxy/model/unittest_utils/data_app.py:98 GalaxyDataTestApp` — in-memory sqlite (:40,:111) and a
  real disk object store (:110). **This ships in `galaxy-data`, not in `test/`.**

**Job synchrony (the flagged hard part)**
- `lib/galaxy/jobs/manager.py:30 JobManager`, `:46 start`, `:58 enqueue`, `:111 NoopManager`.
- `lib/galaxy/web_stack/handlers.py:43 MEM_SELF`, `:486 assign_handler`, `:359-388` (the `queue_callback`
  path). What does `track_jobs_in_database: false` change?
- `lib/galaxy/jobs/handler.py:94 JobHandler`, `:107 start`, `:258 JobHandlerQueue`, `:278` monitor thread
  name, `:293 start`, `:404 __monitor`, `:422 __monitor_step`, `:1139 JobHandlerStopQueue`.
- `lib/galaxy/jobs/runners/__init__.py:120 start`, `:124 _init_worker_threads`, `:146 run_next`,
  `:203 put`, `:221 mark_as_queued`, `:275 prepare_job`, `:336 build_command_line`,
  `:508 get_job_file`, `:638 _finish_or_resubmit_job`, `:700 job_wrapper.finish`.
- `lib/galaxy/jobs/runners/local.py:86 queue_job`, `:104 Popen`, `:156`, `:201 _handle_metadata_if_needed`,
  `:205 _embed_metadata`.
- `lib/galaxy/jobs/__init__.py:999 MinimalJobWrapper`, `:1290 prepare`, `:1359 _setup_working_directory`,
  `:1821 enqueue`, `:2112 finish`, `:2569 get_command_line`, `:2635 setup_external_metadata`,
  `:2884 requires_setting_metadata`, `:2907 JobWrapper`.
- `lib/galaxy/metadata/set_metadata.py:164 set_metadata`, `:190 set_metadata_portable`.
- `lib/galaxy_test/driver/driver_util.py:581 build_galaxy_web_app`, `:608 build_galaxy_app`,
  `:535 uvicorn_serve`, `:939 launch_server`, `:1023 GalaxyTestDriver`, `run_tool_test`.

**Interactor / reuse**
- `lib/galaxy/tool_util/verify/interactor.py` — the 12 hot-path members above, plus
  `:204 stage_data_in_history`, `:251 InteractorStagingInterface`, `:1753 verify_tool`,
  `:1922 _verify_outputs`, `:1515 verify_hid`, `:1547 verify_collection`, `:2206 ToolTestDescription`.
- `lib/galaxy/tool_util/client/staging.py:44 StagingInterface`.
- `test/functional/test_toolbox_pytest.py`, `lib/galaxy_test/base/populators.py`.
- Planemo: `planemo/engine/galaxy.py:131-173`, `planemo/engine/factory.py:30-48`,
  `planemo/galaxy/config.py` (esp. `installed_galaxy_config` :709, `InstalledGalaxyConfig` :1296).

## Open questions you must answer WITH EVIDENCE (not preference)

Each answer needs a `file:line` citation, or — better — an actual command you ran and its output.

1. **What is the minimum app class that can execute a tool and run a job in-process?**
   `UniverseApplication`, or `GalaxyManagerApplication` + `_configure_toolbox()` + `job_manager.start()`?
   If the latter, name every attribute the tool-execution + job-running path needs that
   `GalaxyManagerApplication.__init__` does not set. If it must be `UniverseApplication`, say so plainly
   and say what that costs (startup time, config surface, watchers/threads spawned).
2. **Is `WorkRequestContext` sufficient as `trans` for `ToolsService._create`?** Enumerate every
   `trans.*` access on that path and which ones `WorkRequestContext` does not provide
   (`url_for`? `galaxy_session`? `user_is_bootstrap_admin` at `services/tools.py:109`?
   `security`? `sa_session`?). Give the gap list with line numbers.
3. **Can `ToolsService` be driven without FastAPI?** It takes `config, toolbox_search, security, history_manager`
   (`services/tools.py:210-221`) via DI. Show whether those are obtainable from the app container
   (`app[ToolsService]`? `app.magic_partial`?) without the web app.
4. **Does a synchronous job driver work end to end?** Concretely: given a `Job` produced by
   `tool.handle_input(...)`, can you construct a `JobWrapper`, call `enqueue()`, then
   `LocalJobRunner.queue_job(wrapper)` directly, and reach terminal state with outputs on disk — on one
   thread? Answer by running it, not by reading. If it fails, name the failure and the fix.
   Compare against the alternative "let the handler threads do it and just poll the DB".
5. **Is polling the DB for job terminal state safe from the submitting thread?** Sessions are
   thread-scoped (`app.model.context` is a `scoped_session`; runner threads do
   `with self.app.model.session():` at `runners/__init__.py:148`). What does the poller need to do —
   `session.expire_all()`? `sa_session.remove()`? Cite the pattern Galaxy already uses.
6. **Where does "almost works" actually die — output collection or metadata?** Trace `JobWrapper.finish()`
   (`jobs/__init__.py:2112`ff) and name every step that assumes a running server, a Celery worker, or a
   separate process. Be specific about `outputs_to_working_directory`, dataset discovery
   (`collect_primary_datasets`/`collect_dynamic_outputs`), `set_meta`, and `_fix_output_permissions`.
7. **Protocol extraction vs. transport injection — which, and why?** Both are viable (see recon §6).
   Decide, and justify with the cost of each: (a) extract `ToolTestInteractor` Protocol + widen the three
   annotations, write an in-process implementation; (b) inject `session_factory` with an ASGI/WSGI
   in-process transport. Note (b) may need a new dependency (`requests` has no ASGI adapter; `httpx` has
   `ASGITransport`) — verify. Note also that a loopback uvicorn in a thread already costs almost nothing
   (`driver_util.py:535`) — so state honestly what the in-process version actually buys.
8. **If Protocol: what exactly goes in it?** Write the Protocol. Confirm the 12-member surface by
   re-grepping `galaxy_interactor\.` and `self\.galaxy_interactor\.` across `interactor.py`, and also check
   `lib/galaxy_test/base/populators.py` and `planemo/` for callers who would be forced to conform.
9. **How do inputs get staged in-process?** `stage_data_in_history` (`interactor.py:204`) goes through
   `StagingInterface` (already an ABC). Does an in-process staging impl call `ToolsService.create_fetch`
   (`services/tools.py:291`), the upload tool, or create HDAs directly? What breaks with each?
   Remember: uploads run as *jobs* too — so this is recursively the same synchrony problem.
10. **What does Planemo actually get?** Does the in-process path become a new Planemo engine
    (`planemo/engine/factory.py:30`), or a flag on `InstalledGalaxyEngine`? What must change in
    `planemo/galaxy/config.py` (which today shells out to Gravity, `:1347`)? Does Planemo currently import
    `galaxy.app` anywhere? (Check.)
11. **What config must change?** At minimum: `enable_celery_tasks`, `track_jobs_in_database`,
    `metadata_strategy`, `embed_metadata_in_job`, `job_handler_monitor_sleep`, `monitor_thread_join_timeout`.
    Produce the concrete minimal `galaxy.yml`/kwargs set, and note which of these Planemo currently sets
    the *other* way.
12. **Does this actually run faster / simpler than the socket version?** Be honest. If the answer is "the
    win is debuggability and a single process, not speed", say that.

## Deliverable — `20_PLAN_INPROCESS_TOOL_TEST.md`

Required structure:

1. **Answers to the 12 open questions**, each with evidence (`file:line` or command + output).
2. **Chosen architecture**, one paragraph, plus the rejected alternative and why.
3. **Phased plan.** Realistic refactoring steps, ordered, each independently mergeable into
   `galaxyproject/galaxy` `dev`. Per step:
   - what changes, in which files
   - **red-to-green test plan**: the failing test you write first (name the file and the assertion), then
     the change that makes it pass. Prefer extending existing suites — `test/unit/app/jobs/`,
     `test/unit/app/tools/`, `test/functional/` — over new scaffolding.
   - **existing abstractions reused** (name them from the recon seam table)
   - **new reusable abstraction created**, if any — and who else in-tree could use it
   - blast radius: what else in Galaxy this touches
4. **Ordering relative to ask #2** (the tool-script CLI, see `12_PROMPT_TOOL_SCRIPT_CLI.md`). Do the two
   asks share a substrate, or are they independent tracks? Answer with evidence; do not assume.
5. **Claims I could not verify** — mandatory section.
6. **Unresolved questions** — terse list at the end. Sacrifice grammar for concision.

## Rules

- Research and planning only. No edits to Galaxy or Planemo worktrees.
- Every non-obvious assertion cited `path/file.py:line` against `c6c3b6df49`.
- You may *run* things (start a Galaxy, run a pytest) as long as you don't modify tracked files — prefer a
  scratch directory. Running beats reading; say clearly which claims you executed vs. read.
- Concise. No padding. The reader has dyslexia and dislikes filler.
- No references to these planning docs in any code you propose.
- Do not @-mention anyone.

## ALSO REQUIRED READING — `01_UPSTREAM_CONSTRAINTS.md` in this directory

Written after the recon prompt was drafted, so it is NOT reflected above. It records positions
already staked out in public on planemo PR #1690 by John and by mvdbeek. **These are binding.**

Key points you must honor:

- **The ownership split is binding.** Galaxy core owns the runtime API (startup/shutdown,
  process-global state restoration, Celery/fork-pool cleanup, logging isolation). Planemo owns
  only adapter/policy (CLI options -> ephemeral config, ports, readiness, diagnostics, tool
  install, temp-dir/`no_cleanup`). A plan that puts Galaxy internals knowledge into Planemo is
  wrong **by John's own stated standard**. New capability goes in `lib/galaxy/` with a supported
  API; Planemo only adapts.
- **Standing bias against new release boundaries.** John explicitly declined a
  `galaxy-launcher-library` repo: it would "mostly relocate private Galaxy/Celery coupling while
  adding another synchronized release boundary. Split into a library only after the boundary is
  stable and there is a second real consumer." Generalize this to packages: justify any new
  package/split concretely or explicitly decline it.
- **Do not propose unwinding or blocking PR #1701.** John: "I don't think that goal should
  prevent this from using gravity in this modality though." The Gravity engine and this work
  coexist.
- **Do not route an in-process runtime through Gravity.** Gravity's `stop`/`terminate`/`shutdown`
  are currently stubs; its abstraction is process/service orchestration.
- **Prior art: the `embed_galaxy` branch** (`~/projects/worktrees/planemo/branch/embed_galaxy`,
  `planemo/galaxy/embedded.py`, 538 lines). Mine it — do not restart. Note carefully: it starts
  uvicorn AND a Celery worker, so it is *embedded web server*, NOT *no web server*. It does not
  satisfy ask #1. Its value is (a) the catalogue of teardown hazards any in-process approach
  inherits (fork pools, process-global state, logging), and (b) evidence for the ownership split
  — half its commits are teardown-hardening churn.
- **Galaxy PR #23360 (`build_galaxy_web_app`) is MERGED** (2026-08-26) and is cited as the
  foundation the embedded runtime API should build on. In-tree at
  `lib/galaxy/webapps/galaxy/fast_factory.py:76` and `lib/galaxy_test/driver/driver_util.py:581`.

### Specific to ask #1 — the GIL objection is your known review challenge

mvdbeek, on #1690: *"gravity has the subprocess setup, isn't that the right abstraction? threads
are going to be gil bound"*. **Answer this head on in the plan; do not route around it.** Note
John's own read: the agent analysis found **process isolation**, not the GIL, to be the real
benefit of subprocesses — so the thing to answer is isolation/teardown, not throughput. Likely
line (make it with evidence, or concede and adopt subprocess handlers): a single tool test is
latency-bound on startup and correctness-bound on sequencing, not throughput-bound on parallel
job execution.

### The canonical frame for ask #1 — John's own words, #1690, 2026-09-04

> "I would love **a core driving loop that just handles like actions and doesn't need any sort of
> web layer. Driving a tool submission -> preparation -> execute -> job finalize** - could probably
> be easily done with some library code."

Treat `tool submission -> preparation -> execute -> job finalize` as the four-phase spine your plan
must deliver. "Some library code" sets the expected shape: a library API in Galaxy core, not a
test-harness special case. Structure the phased plan around that spine where it is natural to.
