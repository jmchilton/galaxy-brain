# 10 — RECON: Galaxy architecture map for in-process tool tests + tool-script CLI

Date: 2026-09-16. Author: recon agent.

Substrate (all `file:line` below are against this, nothing else):
`/Users/jxc755/projects/repositories/galaxy-embedded-research`, detached at `c6c3b6df49` (== `origin/dev`).
Planemo PR #1701 worktree: `.../embedded_galaxy_in_planemo/planemo-installed-galaxy-gravity` (`a9a48ca5`).
Planemo master: `/Users/jxc755/projects/repositories/planemo`.

---

## 0. Headline findings (things that change feasibility)

1. **`LocalJobRunner.queue_job()` is synchronous.** It Popens, `proc.wait()`s, then calls
   `_finish_or_resubmit_job` → `JobWrapper.finish()` — all on the calling thread
   (`lib/galaxy/jobs/runners/local.py:86-156`; `lib/galaxy/jobs/runners/__init__.py:638,700`).
   Galaxy's own unit test calls it directly from the test thread and asserts on stdout
   (`test/unit/app/jobs/test_runner_local.py:38-42`). **"Jobs don't run in the same thread as
   submission" is true of the *default queueing path*, not of the runner.** The async layers
   (handler monitor thread, runner worker-thread pool) are both bypassable.

2. **App-without-web-stack is already solved, but `GalaxyManagerApplication` has no toolbox.**
   `lib/galaxy/celery/__init__.py:129-149` builds a `GalaxyManagerApplication` for Celery workers;
   the comment at :146 says explicitly "GalaxyManagerApplication has no toolbox". `_configure_toolbox()`
   is only called from `UniverseApplication.__init__` (`lib/galaxy/app/__init__.py:1009`). So for ask #1
   the minimum app that can *execute a tool* is `UniverseApplication`, or a `GalaxyManagerApplication`
   subclass that additionally calls `_configure_toolbox()`. This is a concrete decision the plan must make.

3. **`ApplicationStack.register_postfork_function` runs the function immediately**
   (`lib/galaxy/web_stack/__init__.py:46-48`). Therefore constructing a `UniverseApplication`
   in-process *already starts the job handler and its threads* (`lib/galaxy/app/__init__.py:1108`).
   Nothing extra is needed to "get job handlers running in-process".

4. **The interactor hot path is 10 methods, not 60.** `verify_tool` + `stage_data_in_history` +
   `_verify_outputs` touch only: `get_tool_tests`, `new_history`, `run_tool`, `resolve_tool_submission`,
   `delete_history`, `wait_for_job`, `get_job_stdio`, `verify_output`, `verify_output_collection`,
   `remote_to_input`, plus the `uploads` attribute and `_post` (via `InteractorStagingInterface`).
   Extracting a Protocol is a small, honest refactor. See §6.

5. **There is an even cheaper seam than a Protocol**: `GalaxyInteractorApi.__init__` accepts a
   `session_factory` kwarg (`lib/galaxy/tool_util/verify/interactor.py:303`) and *every* HTTP verb
   funnels through `self._session()` (:1301-1312). A transport that dispatches into the ASGI app
   in-process (a2wsgi is already a pinned dependency — `lib/galaxy/dependencies/pinned-requirements.txt:3`)
   removes the socket without touching a single interactor method. This is a genuine alternative to a
   Protocol extraction, with different trade-offs (still goes through FastAPI routing/serialization).

6. **`remote_tool_eval.py` proves DB-free evaluation works, but it appends to `tool_script.sh`,
   it does not create it** (`lib/galaxy/tools/remote_tool_eval.py:121-123`). It writes only
   `version_command_line + command_line`. The surrounding script is still Galaxy's.

7. **Packaging: no split needed.** `ToolEvaluator` is in `galaxy-app`; `packages/app/pyproject.toml:18-33`.
   Planemo PR #1701 already declares `installed_galaxy = ["galaxy-app", "galaxy-web-apps", "gravity"]`
   (`pyproject.toml:72-77` in the PR worktree). Both asks can ship in `galaxy-app` and be consumed under
   that extra. `galaxy-remote-tool-eval` is already a `galaxy-app` console script
   (`packages/app/pyproject.toml:104`) — a `galaxy-tool-script` sibling is the obvious precedent.

---

## 1. Tool submission → job execution → outputs-ready, with every boundary named

### 1.1 Trace

| # | Step | Where | Thread / process |
| --- | --- | --- | --- |
| 1 | HTTP `POST /api/tools` (or in-process caller) | `lib/galaxy/webapps/galaxy/services/tools.py:345` `ToolsService._create` | uvicorn worker thread |
| 2 | `tool.handle_input(trans, incoming, history=…)` → `tool.execute` → `DefaultToolAction.execute` | `lib/galaxy/tools/actions/__init__.py:464` | same thread |
| 3 | Job row + input/output HDAs created, params serialized via `params_to_strings` | `actions/__init__.py:1020,1081,1095` | same thread |
| 4 | `app.job_manager.enqueue(job, tool)` | `lib/galaxy/jobs/manager.py:58` | same thread |
| 5 | `job_config.assign_handler(...)` picks an assignment method | `lib/galaxy/web_stack/handlers.py:486` | same thread |
| 5a | `mem-self` method: calls `queue_callback()` directly → `job_handler.job_queue.put(job.id, tool_id)` | `handlers.py:43,388`; `jobs/manager.py:52-53` | same thread; **in-process `queue.Queue` handoff** |
| 5b | DB assignment methods (`db-preassign`, `db-transaction-isolation`, `db-skip-locked`): only sets `job.handler` + commits; another process's handler picks it up | `handlers.py:510-527` | **process boundary** |
| 6 | `JobHandlerQueue.__monitor` loop wakes, `__monitor_step` → `__handle_waiting_jobs` → dispatch | `lib/galaxy/jobs/handler.py:278` (thread name `JobHandlerQueue.monitor_thread`), `:404`, `:422` | **thread boundary #1** — `JobHandlerQueue.monitor_thread` |
| 7 | `dispatcher.put(job_wrapper)` → `BaseJobRunner.put` → `job_wrapper.enqueue()` → `mark_as_queued` → `work_queue.put((self.queue_job, job_wrapper))` | `lib/galaxy/jobs/runners/__init__.py:203,221` | still monitor thread |
| 8 | Worker picks it off `work_queue` | `runners/__init__.py:126-133` (`threading.Thread(name=f"{runner_name}.work_thread-{i}")`), `:146 run_next` | **thread boundary #2** — runner worker pool |
| 9 | `queue_job` → `prepare_job` → `job_wrapper.prepare()` → **`ToolEvaluator.build()` runs here** | `runners/__init__.py:275-303`; `lib/galaxy/jobs/__init__.py:1290-1321` | runner worker thread |
| 10 | `build_command_line` → `command_factory.build_command` → writes `tool_script.sh` + job script | `runners/__init__.py:336`; `lib/galaxy/jobs/command_factory.py:46,170` | runner worker thread |
| 11 | `subprocess.Popen([job_file])` | `lib/galaxy/jobs/runners/local.py:104` | **process boundary #1** — the job script process |
| 11a | job script sources env, `cd working`, runs `sh tool_script.sh`, redirects to `../outputs/tool_stdout|tool_stderr`, captures `$?` to exit-code file | `lib/galaxy/jobs/runners/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh`; `command_factory.py:122,131,139` | job process |
| 11b | with default `embed_metadata_in_job=True`, `set_metadata` runs **inside that same job process**, appended by `command_factory.__handle_metadata` (`:163-165,259`) | `lib/galaxy/metadata/set_metadata.py:190 set_metadata_portable` | job process |
| 12 | `proc.wait()`; stdout/stderr read back | `local.py:126-146` | back on runner worker thread |
| 12a | if metadata *not* embedded: `_handle_metadata_externally` spawns another subprocess | `local.py:201-203` | **process boundary #2** (avoidable) |
| 12b | if `metadata_strategy` contains `celery`: metadata is a Celery task | `local.py:206-210`; config default is `directory` (`lib/galaxy/config/__init__.py:933`) | **process boundary #2'** (avoidable) |
| 13 | `_finish_or_resubmit_job` reads exit code + tool_stdout/tool_stderr, `check_tool_output` | `runners/__init__.py:638-697` | runner worker thread |
| 14 | `JobWrapper.finish()` — move outputs from false→real paths, dataset discovery, set states, commit | `lib/galaxy/jobs/__init__.py:2112` | runner worker thread |
| 14a | `compute_dataset_hash.delay(...)` only when `enable_celery_tasks` | `jobs/__init__.py:2355-2364` | **process boundary #3** (config-avoidable) |
| 14b | `tool.exec_after_process` task `task_wrapper.delay()` | `jobs/__init__.py:2418` | **process boundary #4** (tool-specific) |
| 15 | Outputs ready: HDA states `ok`, job state `ok` | — | — |

### 1.2 Summary of boundaries, and how each is removed

- **Thread boundary #1 (`JobHandlerQueue.monitor_thread`)** — removed by not going through
  `job_manager.enqueue()` at all: build the `JobWrapper` and hand it straight to a runner.
- **Thread boundary #2 (runner `work_thread-N`)** — removed by calling `runner.queue_job(job_wrapper)`
  directly instead of `runner.put(...)`/`mark_as_queued`. Note `put()` also calls `job_wrapper.enqueue()`
  (state QUEUED) which `prepare_job` requires (`runners/__init__.py:294-297` asserts state == QUEUED),
  so a synchronous driver must replicate `enqueue()` then `queue_job()`.
- **Process boundary #1 (job script subprocess)** — *not* removable and should not be: it is the tool
  actually running. It is fully awaited by `proc.wait()`.
- **Process boundaries #2/#2'** — removed by `embed_metadata_in_job: true` (already the default,
  `DEFAULT_EMBED_METADATA_IN_JOB`) and `metadata_strategy: directory` (default, config:933).
- **Process boundaries #3/#4** — removed by `enable_celery_tasks: false`. NOTE: Planemo currently sets
  `enable_celery_tasks=True` (PR #1701 worktree `planemo/galaxy/config.py:386,525`); an in-process mode
  must flip this or run Celery eagerly.

### 1.3 Celery eager mode

There is **no** Galaxy-wide `task_always_eager` support. The only in-tree use is a single test that pokes
`celery_app.conf.task_always_eager = True` itself (`test/integration/test_hashicorp_vault.py:203,222`).
Galaxy's own answer to "no Celery" is `enable_celery_tasks: false`, which makes the call sites skip the
task entirely rather than run it eagerly (`jobs/__init__.py:2355`). Treat eager mode as a non-path.

---

## 2. The tool-script / job-script boundary (precise)

Written by `command_factory.__externalize_commands` (`lib/galaxy/jobs/command_factory.py:170-213`),
file name hardcoded `script_name="tool_script.sh"` (:175), into `job_wrapper.working_directory`.
It is reached whenever `container and modify_command_for_container` **or**
`job_wrapper.commands_in_new_shell` (:98); `commands_in_new_shell` defaults `True`
(`lib/galaxy/jobs/__init__.py:1045,1216`), so local jobs always get one.

### Inside `tool_script.sh` (`command_factory.py:194`)

```
#!{shell}                          # job_wrapper.shell, default /bin/sh
{integrity_injection}              # if job_io.check_job_script_integrity
{set -e}                           # if job_wrapper.strict_shell
{container.source_environment}     # only when containerized
{tool_commands}
```

where `tool_commands` = `CommandsBuilder.build()` at that point, i.e. in order:

1. **dependency-resolution shell commands** — prepended by `__handle_dependency_resolution` (:239-243)
   from `job_wrapper.dependency_shell_commands`. **These are inside the tool script.**
2. **task-splitting `prepare_input_files_cmds`** — `__handle_task_splitting` (:232-236). Legacy/tasks only.
3. **`job_wrapper.get_command_line()`** = `f"{version_command_line or ''}{command_line}"`
   (`lib/galaxy/jobs/__init__.py:2569-2573`) — i.e. exactly the first two elements of
   `ToolEvaluator.build()`'s return tuple.

### Outside `tool_script.sh` (the job script, `command_factory.build_command` after :104)

- container wrapping: `container.containerize_command(externalized_commands)` (:114)
- stdout/stderr capture → `../outputs/tool_stdout`, `../outputs/tool_stderr` (:121-124)
- `cd working` (:128-131)
- `remote_tool_eval` prepend for remote command lines (:133, :216-229)
- container monitor command (:135-136)
- exit-code capture → `default_exit_code_file(...)` (:139)
- CWL `relocate_dynamic_outputs` (:141-158)
- `from_work_dir` output copies (:160-161, :246-256)
- metadata commands + `SETUP_GALAXY_FOR_METADATA` (:163-165, :259-298)
- everything in `DEFAULT_JOB_FILE_TEMPLATE.sh`: `_galaxy_setup_environment`, `GALAXY_SLOTS`,
  `GALAXY_MEMORY_MB`, TMP/TEMP/TMPDIR juggling, `prepare_dirs_statement`, `cd $working_directory`,
  job-metric instrumentation

### The one thing that is *tool* detail but lands *outside* the tool script

`ToolEvaluator._build_environment_variables()` (`evaluation.py:816-874`) produces
`environment_variables` entries whose `value` is a **backtick expression**
`` `cat "$_GALAXY_JOB_DIR/configs/<basename>"` `` (:859-861). Those are injected into the *job script's*
`env_setup_commands` (`lib/galaxy/jobs/runners/__init__.py:508-527`, `envs.extend(job_wrapper.environment_variables)`
at :516), never into `tool_script.sh`. A standalone, runnable tool script must either inline those values
or emit its own `export` preamble. This is the sharpest design decision in ask #2.

Same category: `$__tool_directory__`, `$__new_file_path__`, `$__root_dir__`, `chromInfo`, config-file
paths — all resolved by the evaluator into absolute paths inside the command line, so they *are* captured,
but they point at the synthesized working directory.

---

## 3. `ToolEvaluator` contract — exactly what it needs

`lib/galaxy/tools/evaluation.py:139-163`.

`ToolEvaluator(app, tool, job, local_working_directory)`:

- **`app`** must satisfy `MinimalToolApp` (`lib/galaxy/structured_app/__init__.py:101-114`):
  `is_webapp`, `name`, `config`, `datatypes_registry`, `object_store`, `file_sources`, `security`,
  `tool_data_tables`. Plus, reached conditionally: `app.model.context` (via
  `WorkRequestContext.sa_session` in `_validate_incoming`, :385-387 and `_materialize_objects`, :304-306),
  `app.genome_builds`, `app.vault`/`app.model.session` only if `tool.credentials` and `isinstance(app, StructuredApp)`
  (:982-1001), `app.security.encode_id` only if `job.history` is truthy (:261-262 — note
  `remote_tool_eval.ToolApp` sets `security = None`, so that path only works when history is absent).
- **`tool`** a real `galaxy.tools.Tool`. Constructible without a toolbox via
  `create_tool_from_source(app, tool_source, config_file=…)` (`lib/galaxy/app_unittest_utils/tools_support.py:120`)
  or `create_tool_from_representation(app, raw_tool_source, tool_dir, tool_source_class)`
  (`lib/galaxy/tools/__init__.py:491-499`).
- **`job`** a `model.Job` that must supply (from `set_compute_environment`, :164-227 and downstream):
  `job.parameters` (list of `JobParameter(name, value)`, JSON-encoded strings),
  `job.io_dicts()` → `(inp_data, out_data, out_collections)` (`lib/galaxy/model/__init__.py:1924`),
  which reads `job.input_datasets`, `job.output_datasets`, `job.output_dataset_collection_instances`,
  `job.input_dataset_collections`, `job.input_dataset_collection_elements`,
  `job.galaxy_session`, `job.history` (→ `_history`, :1003), `job.user` (→ `_user`, :1007),
  `job.tool_id`, `job.tool_state`, `job.credentials_context_associations`,
  `job.interactivetool_entry_points`.
- **`local_working_directory`** a real directory; config files land in `<wd>/configs`
  (`ensure_configs_directory`, `lib/galaxy/job_execution/setup.py:329`) and explicit-filename config files
  are hard-linked into `<wd>/working` (`evaluation.py:806-810` — **that directory must already exist**).

`set_compute_environment(compute_environment, get_special=None)` additionally needs a
**`ComputeEnvironment`** (`lib/galaxy/job_execution/compute_environment.py:20-107`) — 16 abstract methods:
`output_names`, `input_path_rewrite`, `output_path_rewrite`, `input_extra_files_rewrite`,
`output_extra_files_rewrite`, `input_metadata_rewrite`, `unstructured_path_rewrite`, `working_directory`,
`config_directory`, `env_config_directory`, `sep`, `new_file_path`, `tool_directory`, `version_path`,
`home_directory`, `tmp_directory`, `galaxy_url`, `get_file_sources_dict`.
`SimpleComputeEnvironment` (:110) supplies `config_directory` + `sep`.
Two existing implementations: `SharedComputeEnvironment` (:118, JobIO-backed — what real jobs use) and
the hand-rolled stub in `test/unit/app/tools/test_evaluation.py:246-302` (**no `JobIO`, no DB**).

`build()` (:723-749) returns
`(command_line, version_command_line, extra_filenames, environment_variables, interactivetools)`
after running, in order: `_create_interactivetools_entry_points`, `_build_config_files` (:794),
`_build_param_file` (:894), `_build_command_line` (:751), `_build_version_command` (:786),
`_build_environment_variables` (:816).

Variants: `PartialToolEvaluator` (:1015, env vars only — used when `remote_command_line`),
`UserToolEvaluator` (:1034, YAML/CWL-style `base_command`/`shell_command`),
`RemoteToolEvaluator` (:1150, skips `execute_tool_hooks` and `_build_environment_variables`).

---

## 4. The central question for ask #2 — SessionlessContext vs. real model mapping

There are **three** viable substrates, not two.

| Option | What it is | Evidence it works | Cost |
| --- | --- | --- | --- |
| **A. No session at all** | Plain in-memory ORM objects, never added to any session | `test/unit/app/tools/test_evaluation.py:53-57,227-237` builds `Job`, `History`, `HistoryDatasetAssociation`, `Dataset(external_filename=…)` with no session and runs `ToolEvaluator.build()` end to end | Works for a *mock* tool. A real `Tool` runs `_validate_incoming` (`evaluation.py:384-393`) which calls `input.from_json(value, WorkRequestContext(app=…))` → `trans.sa_session` (`basic.py:2410-2483`). With no `app.model`, that raises. Also `DatasetPath`/`JobIO` asserts `dataset.id is not None` (`job_execution/setup.py:271`) |
| **B. `SessionlessContext`** | `lib/galaxy/model/store/__init__.py:223-256` — a dict-of-dicts with `add`/`get`/`query`/`commit`/`flush` no-ops | **This is what Pulsar uses in production.** `remote_tool_eval.py:87-89,102-109` wires it as `app.model = Bunch(context=…, session=…)` and runs the full `RemoteToolEvaluator` path including `_validate_incoming` | Requires every object to have a manually assigned `id` and to be `add`ed. `query().filter_by()` is a stub returning the first object of that class (:249-251) — anything relying on real filtering breaks (`JobIO.compute_outputs` does `sa_session.query(JobExportHistoryArchive).filter_by(job=job).first()` at `setup.py:288` — returns garbage-but-harmless None here) |
| **C. Real in-memory sqlite** | `GalaxyDataTestApp` → `init("/tmp", "sqlite:///:memory:", create_tables=True)` (`lib/galaxy/model/unittest_utils/data_app.py:40,111`), which `MockApp` inherits (`lib/galaxy/app_unittest_utils/galaxy_mock.py:112,135`) | The entire `test/unit/app/tools/` suite; `UsesTools._init_tool` builds real `Tool` objects against it (`tools_support.py:79-123`) | Real IDs, real relationships, real object store (`build_object_store_from_config`, data_app.py:110). Heaviest of the three, but still no server, no postgres, no migrations |

**Third, underused path**: `DictImportModelStore` / `get_import_model_store_for_dict`
(`model/store/__init__.py:1556,1604`) can *construct* a populated `SessionlessContext` from a plain dict
— the same machinery `imported_store_for_metadata` (:3115) uses to rehydrate Pulsar's job. Synthesizing a
model-store dict from a tool test would reuse Galaxy's own serialization contract instead of hand-building
ORM graphs. The downstream agent must evaluate this explicitly.

**Recommendation to carry into the prompt (not a conclusion):** B is the cheapest *if* every object id is
assigned by hand; C is the most likely to "just work" for arbitrary real tools because it makes
`_validate_incoming`, `DataToolParameter.from_json`, and `JobIO` behave exactly as in production. The plan
must answer with evidence — specifically, by getting a real `Tool` (not `MockTool`) through
`set_compute_environment` on each substrate.

---

## 5. What is genuinely unavoidable for ask #2

Tool tests reference test *data files*. Before a command line can be expanded:

1. **The file must exist at a path the wrapper can return.** `DataToolParameter.to_param_dict_string`
   returns `value.get_file_name()` (`lib/galaxy/tools/parameters/basic.py:2567-2570`); the evaluator then
   overrides it with `compute_environment.input_path_rewrite(dataset)`. The cheapest trick, used by
   Galaxy's own test, is `Dataset(id=…, external_filename=path)` (`test_evaluation.py:228-231`) — an
   object store is then never consulted for that dataset. Output datasets still need a writable path.
2. **The extension must be set.** `hda.extension` drives `datatypes_registry.get_datatype_by_extension`,
   `$input.ext`, `$input.is_of_type(...)`, and `DataToolParameter` format filtering. Tool tests usually
   carry `ftype=` explicitly; when they don't, sniffing is needed —
   `galaxy.datatypes.sniff.guess_ext` (`lib/galaxy/datatypes/sniff.py:315`) /
   `guess_ext_from_file_name` (:593) / `handle_uploaded_dataset_file` (:878).
3. **Metadata is NOT strictly required to expand a command line.** `DatasetFilenameWrapper.MetadataWrapper.__getattr__`
   (`lib/galaxy/tools/wrappers.py:313-332`) falls back to `spec[name].no_value` for unset elements. But any
   tool whose command references `$input.metadata.columns`, `.column_types`, `.chromCol`, a `FileParameter`
   metadata file, etc. will expand to the *default* rather than the real value. So: correct-looking output
   without `set_meta` for most tools, silently wrong for metadata-sensitive ones.
   Real `set_meta` entry: `lib/galaxy/metadata/set_metadata.py:126 set_meta_with_tool_provided` /
   `:190 set_metadata_portable`; or call `datatype.set_meta(hda)` directly.
4. **Output datasets need ids and paths.** `JobIO.compute_outputs` asserts `dataset.id is not None`
   (`job_execution/setup.py:271`) and touches `da_false_path` into existence (:294-296). A hand-rolled
   `ComputeEnvironment` (option A/B) can sidestep `JobIO` entirely, as `test_evaluation.py:246` does.
5. **`<wd>/working` and `<wd>/configs` must exist** before `_build_config_files` (evaluation.py:803-810).

---

## 6. Ask #1 — reuse angle: how narrow is the interactor's test-running surface?

Verified by reading every `galaxy_interactor.*` call site in
`lib/galaxy/tool_util/verify/interactor.py`:

| Member | Line of definition | Called from |
| --- | --- | --- |
| `get_tool_tests` | :356 | `verify_tool:1777` |
| `new_history` | :558 | `verify_tool:1814` |
| `run_tool` | :826 | `verify_tool:1844` |
| `resolve_tool_submission` | :954 | `verify_tool:1849` |
| `delete_history` | :1053 | `verify_tool:1907` |
| `wait_for_job` | :493 | `_verify_outputs:1944`, `InteractorStagingInterface:266,275` |
| `get_job_stdio` | :518 | `_verify_outputs:1950` |
| `verify_output` | :388 | `_verify_outputs:1994` |
| `verify_output_collection` | :363 | `_verify_outputs:2030` |
| `remote_to_input` | :665 | `stage_data_in_history:219` |
| `uploads` (attribute, `dict`) | :320 | `stage_data_in_history:232`, `run_tool:854,884,890`, `_create_collection:1025` |
| `_post` | :1314 | `InteractorStagingInterface._post:260` |

**10 methods + 1 attribute + `_post`.** Against ~60 public members on the class. The orientation note's
"no Protocol exists" is correct (`grep -c Protocol` in `verify/` finds only `TestConfig` at :1707), but
the surface to be Protocol-ised is small.

Two further facts that make this cheap:

- `stage_data_in_history` already delegates to `InteractorStagingInterface(StagingInterface)`
  (`interactor.py:251`), and **`StagingInterface` is already an ABC with only three abstract members**:
  `_post` (`lib/galaxy/tool_util/client/staging.py:53`), `_handle_job` (:72), `use_fetch_api` (:296).
  Input staging is therefore already pluggable.
- `verify_tool`'s waiting is `galaxy.util.wait.wait_on` re-exported through
  `lib/galaxy/tool_util/verify/wait.py` — transport-agnostic, reusable for DB polling.

**Consequence.** If a `ToolTestInteractor` Protocol is extracted and `verify_tool`'s annotation widened
(currently the concrete type at `:205` for `stage_data_in_history`, `:252` for `InteractorStagingInterface.__init__`,
`:1755` for `verify_tool`), then:

- Galaxy's `test/functional/test_toolbox_pytest.py:80` (via `GalaxyTestDriver.run_tool_test`) inherits it,
- Planemo inherits it at `planemo/engine/galaxy.py:141` (constructs `GalaxyInteractorApi`) and `:161`
  (calls `verify_tool`) — a one-line swap,

so ask #1 becomes "write an in-process interactor", not "write a parallel test runner". **This is the
single highest-leverage refactor in either ask.**

### Competing approach (must be evaluated, not assumed away)

Rather than a Protocol, inject `session_factory` (`interactor.py:303`) with a transport that dispatches
into the running ASGI app in-process. `a2wsgi` is already pinned (`pinned-requirements.txt:3`) and used to
bridge ASGI/WSGI in `lib/galaxy/webapps/galaxy/fast_app.py:10` and `driver_util.py:23`. Pros: zero interactor
refactor, exercises the real API surface, keeps Planemo's code path identical. Cons: still constructs the
web app, still serializes JSON, does not give "managers and services" directly — arguably misses the point
of the ask. Cost of a socket-less loopback server (`uvicorn_serve` at `driver_util.py:535` already does
this in a thread) is also low, which weakens the motivation for either.

---

## 7. Candidate seams

| Seam | file:line | What it already gives | What is missing |
| --- | --- | --- | --- |
| `MinimalToolApp` Protocol | `lib/galaxy/structured_app/__init__.py:101` | The narrow 7-member app contract `ToolEvaluator` is typed against | Doesn't declare `model`, `genome_builds`, `vault` — which the evaluator reaches for conditionally. Under-specified |
| `ToolApp` (Pulsar's app) | `lib/galaxy/tools/remote_tool_eval.py:48` | A working `MinimalToolApp` impl, DB-free | `security = None` (:72) breaks `__history_id__`; config is a 9-field NamedTuple (:36) |
| `evaluate_tool()` | `remote_tool_eval.py:79` | End-to-end DB-free evaluation | Consumes a *real Galaxy's* artifacts: `job_io.json`, model store export, `tool_data_tables.json`, datatypes config, object store config. Back half only |
| `ToolEvaluator` / `build()` | `evaluation.py:139,723` | The whole "tool script contents" computation | Needs job + ComputeEnvironment (see §3) |
| `SimpleComputeEnvironment` | `job_execution/compute_environment.py:110` | `config_directory`+`sep` for free | 16 remaining abstract methods |
| test-local `ComputeEnvironment` stub | `test/unit/app/tools/test_evaluation.py:246` | Complete no-JobIO, no-DB implementation, 57 lines | Lives in `test/`, not packaged. **Promoting it to `galaxy.job_execution.compute_environment` is an obvious reusable abstraction** |
| `__externalize_commands` | `command_factory.py:170` | Writes `tool_script.sh` today | Takes a full `MinimalJobWrapper` (`job_io`, `strict_shell`, `working_directory`, `dependency_shell_commands`) |
| `MinimalJobWrapper.prepare()` | `lib/galaxy/jobs/__init__.py:1290` | The real call site of `ToolEvaluator.build()` | DB-bound (`_load_job`, `sa_session.commit()` at :1356) |
| `JobIO` / `JobIO.from_dict` | `job_execution/setup.py:68,167` | A serializable bundle of every path a job needs | Requires a session that can `get(Job, id)` |
| `SessionlessContext` | `model/store/__init__.py:223` | DB-free `sa_session` | `filter_by` is a stub (:249) |
| `DictImportModelStore` | `model/store/__init__.py:1556`, factory :1604 | Builds a populated `SessionlessContext` from a dict | Undocumented as a synthesis tool; schema is the model-store format |
| `GalaxyDataTestApp` / `MockApp` | `model/unittest_utils/data_app.py:98`; `app_unittest_utils/galaxy_mock.py:112` | Real in-memory sqlite + real disk object store + datatypes registry; **shipped in packages**, not in `test/` | `job_manager = NoopManager()` (:166), `is_job_handler = False` (:172), `job_config` is a `Bunch` stub (:154-159) — cannot run jobs as-is |
| `UsesTools._init_tool` | `app_unittest_utils/tools_support.py:82-123` | Tool XML → real `Tool` against a mock app, no toolbox | Test-fixture shaped (`self.tool_file` mutation) |
| `parse_tool_test_descriptions` | `lib/galaxy/tool_util/verify/parse.py:61` | Tool XML/YAML → `ToolTestDescription` list. **Pure. No app, no DB, in `galaxy-tool-util`** | Nothing — this is the ready-made front door for ask #2 |
| `ToolTestDescription` | `interactor.py:2206`, `.test_data()` :2272 | Structured inputs (`ExpandedToolInputs`), `required_files`, `outputs`, `request`/`request_schema` | Values are still *test-case* shaped (filenames, `TestCollectionDef`), not HDAs |
| `StagingInterface` ABC | `lib/galaxy/tool_util/client/staging.py:44` | Input staging already abstracted behind `_post`/`_handle_job`/`use_fetch_api` | Its `_post` speaks the Galaxy API payload shape |
| `GalaxyInteractorApi(session_factory=…)` | `interactor.py:303`, used :1311 | Transport injection point for every HTTP verb | No in-process transport implementation exists |
| `wait_on` | `lib/galaxy/tool_util/verify/wait.py` → `galaxy.util.wait` | Transport-agnostic polling with backoff | — |
| `WorkRequestContext` | `lib/galaxy/work/context.py:22` | The non-web `trans`. Already used by managers (`managers/jobs.py:2315`, `managers/workflows.py:660,1098`) and by the evaluator itself (`evaluation.py:305,385`) | `url_builder=None` ⇒ `trans.url_for` raises; `test/integration/test_live_evals.py:148` works around it with `get_mcp_url_builder` |
| `GalaxyManagerApplication` | `lib/galaxy/app/__init__.py:701` | No-web-stack app; what Celery uses (`celery/__init__.py:145`) | **No toolbox** (see §0.2); no `job_manager.start()` |
| `UniverseApplication` | `lib/galaxy/app/__init__.py:936` | Toolbox + job handler started immediately in-process (:1009, :1108) | Pulls visualizations, tours, webhooks, workflow scheduler, proxy manager, watchers |
| `LocalJobRunner.queue_job` | `lib/galaxy/jobs/runners/local.py:86` | **Synchronous** submit→run→finish | Requires a fully-prepared `JobWrapper` in state QUEUED |
| `GalaxyTestDriver` / `driver_util` | `lib/galaxy_test/driver/driver_util.py:581,939,1023` | Existing embedded Galaxy with HTTP; `EmbeddedServerWrapper.app` exposes the real app object | Still binds a socket (`attempt_ports` :517, `uvicorn_serve` :535) |
| `IntegrationTestCase._app` | `test/integration/test_live_evals.py:148` | Precedent for mixing in-process app access with HTTP-driven setup | — |

---

## 8. What to reuse rather than rebuild

- **`parse_tool_test_descriptions`** — never re-parse tool tests.
- **`ToolEvaluator` + `RemoteToolEvaluator`** — never re-implement command-line templating.
- **`command_factory.__externalize_commands`** — reuse or factor, don't re-derive the tool-script shape.
- **`test_evaluation.py:246` `ComputeEnvironment`** — promote to library, don't write a fourth one.
- **`StagingInterface`** — input staging is already pluggable.
- **`galaxy.util.wait.wait_on`** — polling with backoff already exists.
- **`GalaxyDataTestApp`** — an in-memory-sqlite Galaxy-data app already ships in `galaxy-data`.
- **`verify_tool` + `_verify_outputs` + `verify_hid`/`verify_collection`** — all assertion logic
  (`interactor.py:1515,1547,1635,1665`) is interactor-parameterised, not HTTP-coupled.
- **`galaxy-remote-tool-eval` console-script precedent** (`packages/app/pyproject.toml:104`).
- **Planemo's `installed_galaxy` extra** — the packaging question is already answered.

---

## 9. Claims I could not verify

1. **Nothing was executed.** Every finding here is from reading source at `c6c3b6df49`. No Galaxy was
   started, no test was run, no command line was actually expanded. Both downstream plans must treat
   every claim as a hypothesis with a cited source, and must include a step that *runs* something.
2. **Whether a real `Tool` (not `MockTool`) gets through `ToolEvaluator.set_compute_environment` with
   `SessionlessContext` alone.** `remote_tool_eval.py` strongly implies yes, but its objects come from a
   model-store import that assigns real ids and relationships; a hand-built graph may differ. Unverified.
3. **Whether `GalaxyManagerApplication` + `_configure_toolbox()` is sufficient to execute a tool.**
   I found no in-tree caller doing this. The `is_job_handler` property (`app/__init__.py:919-923`) and
   `job_manager.start()` wiring exist on it, but nothing starts them for a manager app.
4. **Whether `LocalJobRunner.queue_job` called directly on a *real* (DB-backed) `JobWrapper` works.**
   `test_runner_local.py` uses `MockJobWrapper` (:147), not a real one. The real path additionally needs
   `job_wrapper.enqueue()` to have set state QUEUED and `job_destination` resolved through the mapper.
5. **Metadata correctness without `set_meta`.** I verified the *fallback mechanism*
   (`wrappers.py:313-332`) but not which real tools break. No survey done.
6. **Exact count of `GalaxyInteractorApi` public methods.** I did not count; the orientation note says ~60
   and the outline at `interactor.py:293-1400` is consistent with that. The number that matters — 10 on
   the hot path — I did verify exhaustively by grep.
7. **Whether Planemo's `installed_galaxy` engine can reach the in-process app object at all.** PR #1701
   drives Galaxy as a Gravity-managed *subprocess* (`planemo/galaxy/config.py:1296 InstalledGalaxyConfig`,
   `:1347 _gravity_executable`). An in-process mode is a *new* engine, not a tweak to that one. Not verified
   whether any Planemo code currently imports `galaxy.app`.
8. **Whether `a2wsgi` + `requests` can actually form an in-process transport.** `a2wsgi` gives ASGI↔WSGI;
   `requests` needs a WSGI transport adapter, which Galaxy does not depend on. Untested, possibly requires
   a new dependency or switching to `httpx.ASGITransport`.
9. **`enable_celery_tasks: false` sufficiency.** I confirmed the two `.delay()` call sites in
   `lib/galaxy/jobs/__init__.py` are guarded (:2355) or tool-specific (:2418). I did **not** audit
   `JobWrapper.finish()`'s full 400-line body, nor `galaxy/celery/tasks.py`, for other async dispatches.
10. **Whether `job.tool_state` (the `JobInternalToolState` path, `evaluation.py:218-227`) matters for
    classic XML tools.** Only exercised when `param_dict_style != "regular"`, i.e. `UserToolEvaluator`.
    Not traced further.

---

## ERRATA — appended 2026-09-16 by the verification agent

The body above is left as written (it is the record of what was thought at recon time). These
corrections are verified against the same commit `c6c3b6df49`; see `41_VERIFICATION_LOG.md`.

1. **§2, line 125 — shebang.** `job_wrapper.shell` does **not** default to `/bin/sh`.
   `DEFAULT_JOB_SHELL = "/bin/bash"` (`lib/galaxy/jobs/__init__.py:143`), reached via
   `MinimalJobWrapper.shell` = `job_destination.shell or config.default_job_shell or DEFAULT_JOB_SHELL`
   (`:1202-1203`). Note it is a *destination/config* value, not a tool value — without a job
   destination you fall back to `/bin/bash`, you do not derive it from the tool.

2. **§2 — `strict_shell` is a *tool* property, not a job one.** `MinimalJobWrapper.strict_shell`
   returns `self.tool.strict_shell` (`lib/galaxy/jobs/__init__.py:1211-1213`), parsed by
   `XmlToolSource.parse_strict_shell` (`lib/galaxy/tool_util/parser/xml.py:683-690`), which
   **defaults True for profile >= 20.09**. So `set -e` is derivable from the tool alone, and getting
   it wrong diverges from Galaxy for every modern tool.

3. **§8.3 — "Metadata is NOT strictly required to expand a command line" is misleading.** The
   `MetadataWrapper.__getattr__` fallback (`tools/wrappers.py:313-332`) is real, but metadata is
   consumed *earlier*, during parameter validation. Executed on two independent substrates: without
   `datatype.set_meta`, `column_param_configfile.xml` fails hard —
   `Parameter 'col': an invalid option ('11') was selected (valid options: 2,3,1)` — as a
   `ParameterValueError` / `RequestParameterInvalidException`, not a quietly wrong string. Any tool
   using `data_column`, `options from_dataset`, or a metadata `<validator>` requires `set_meta`.

4. **§1.2 / §7 — `prepare_job` does not *assert* state QUEUED.** `runners/__init__.py:295-297` is
   `elif job_state != QUEUED: log.info(...); return False` — a silent skip. A driver that forgets
   `enqueue()` gets `False`, not a traceback.

5. **§1.2 — `embed_metadata_in_job` is not a `galaxy.yml` key.** It is a job-destination param,
   default `True` via `DEFAULT_EMBED_METADATA_IN_JOB` (`lib/galaxy/jobs/runners/local.py:40`, used
   `:209`).

6. **§7 — promoting the `test/unit/app/tools/test_evaluation.py:246` stub is not free.** Executed:
   replacing it with a local-directory compute environment (`dataset.get_file_name()`, no
   `unstructured_path_rewrites`) gives **4 failed, 12 passed** — the stub exists to exercise
   `DatasetPath(..., false_path=…)` (`:139-140`) and `unstructured_path_rewrites` (`:187`). The stub
   must stay; the library class is an addition, not a replacement. (It is 16 tests, not ~20.)
