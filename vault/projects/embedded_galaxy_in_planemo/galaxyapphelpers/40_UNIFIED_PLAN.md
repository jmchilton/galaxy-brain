# 40 — UNIFIED PLAN: in-process tool tests + tool-test → tool-script CLI

Date: 2026-09-16. Author: verification agent. Evidence: `41_VERIFICATION_LOG.md`.
Substrate for every `file:line`: `galaxy-embedded-research` @ `c6c3b6df49`.

## Executive summary

**What is being built.** One synchronous, no-web-server tool runtime in `lib/galaxy/`
(`galaxy-app`), with two drivers over it: a *prepare-only* driver that emits a standalone tool-script
directory (ask #2), and a *run-to-terminal-state* driver that a tool-test interactor sits on (ask #1).
Planemo gets a new command and a new engine, and learns nothing new about Galaxy internals.

**The ordering decision.** *Both plans are wrong about ordering, in opposite directions.* Ask #2 is
**not** a strict prefix of ask #1's pipeline (agent 1), and the two are **not** independent tracks
(agent 2). Build the shared substrate first, then ship ask #2, then ask #1's back half. Ask #2 lands
in ~5 merges and is genuinely useful on its own; ask #1 is 3 more on top of it.

**The single most important thing to know.** The two asks differ by **one call**:

```python
runner.prepare_job(jw)                                  # ask #1 — job-script semantics
jw.prepare(LocalDirectoryComputeEnvironment(outdir, tool.tool_dir))   # ask #2 — standalone semantics
```

`MinimalJobWrapper.prepare(compute_environment=None)` (`jobs/__init__.py:1290,1315`) is an
**already-existing injection seam**. I executed the second form end to end: real toolbox app, real
`Job` from `DefaultToolAction`, emitted `tool_script.sh` + `env.sh` + `run.sh` + `configs/` +
`working/`, `sh run.sh` → exit 0, correct output, no `$_GALAXY_JOB_DIR`, no `export` inside
`tool_script.sh`. Agent 2's designed artifact, produced from agent 1's substrate, with no
`synthesize_job`, no `SessionlessContext`, and no second app class.

---

## The ordering decision, with the evidence that settled it

### Why agent 1's "ask #2 is a strict prefix" is refuted

Stopping ask #1's spine after `prepare_job` yields a `tool_script.sh` that **is not standalone**.
On the default `SharedComputeEnvironment`, `<environment_variables>` expand to
`` `cat "$_GALAXY_JOB_DIR/tool_env_XXXX"` `` (`evaluation.py:859-861` +
`compute_environment.py:163-165`), and `_GALAXY_JOB_DIR` is defined only by the **job script**
(`runners/__init__.py:516,518` + `DEFAULT_JOB_FILE_TEMPLATE.sh`). Output paths also point into the
object store, not into an emittable directory. Measured, verbatim:

```
"value": "`cat \"$_GALAXY_JOB_DIR/tool_env_t13n0h0i\"`",  "raw": true
```

Emitting ask #2 from the unmodified prefix therefore requires emitting the **job script** — which
ask #2 explicitly excludes. (`41` §A5.)

### Why agent 2's "independent tracks" is refuted

Run head-to-head on agent 2's own 225-test corpus, agent 1's path produces a `tool_script.sh` for
**167** tools; agent 2's for **176**. Set-differenced:

- the 15 tools (b) wins are **all harness artifacts** — 14 absent from `sample_tool_conf.xml`, 1 my
  staging bug. Zero real capability gaps.
- the 7 tools (a) wins are **real (b) failures**: `collection_creates_pair{,_format,_from_type}`,
  `explicit_conversion`, `job_properties`, `metadata_column_names` (`ToolTemplatingException`),
  `collection_nested_default` (`AssertionError` in `from_json`). All are cases where the real
  `DefaultToolAction` builds outputs/conversions that a hand-written `synthesize_job` does not.

So the real app is a **strict fidelity superset**. A purpose-built lean substrate is a second,
lower-fidelity implementation of job construction with no compensating capability. (`41` §A3.)

### What the choice actually costs — measured, not argued

| | path (a) real app | path (b) lean app |
| --- | --- | --- |
| one tool, cold process → artifact | **9.7–10.9 s** | **4.4 s** |
| 225-test corpus, wall clock | **~90 s** | **40.4 s** |

The gap is **module import, not architecture**: `import galaxy.app` = **6.44 s**, of which
`galaxy.agents.factory` = 2.51 s (`app/__init__.py:27-28`) and `pulsar.client` = 1.20 s, pulled in by
`from pulsar.client.staging import COMMAND_VERSION_FILENAME` (`jobs/__init__.py:37`) **for one
constant**. `import galaxy.tools` — what (b) pays — is 3.41 s. Fixing those two imports removes most
of the 5 s, which is why Phase 0 exists and comes first. (`41` §A2.)

### The shared abstractions, and who owns what

| Abstraction | Home | Ask #1 | Ask #2 |
| --- | --- | --- | --- |
| `ToolRuntimeApplication` (toolbox-capable, zero threads) | `lib/galaxy/app/__init__.py` | owns it | uses it |
| `Job` construction | `tool.handle_input` → `DefaultToolAction` (existing) | uses it | uses it |
| `render_tool_script()` | `lib/galaxy/jobs/command_factory.py` | reached via `__externalize_commands` | calls it directly |
| `LocalDirectoryComputeEnvironment` | `lib/galaxy/job_execution/compute_environment.py` | not used (job semantics) | **owns it** |
| `MinimalJobWrapper.prepare(compute_environment=…)` | existing seam, `jobs/__init__.py:1290` | default CE | injected CE |
| `SynchronousJobHandler` | `lib/galaxy/jobs/handler.py` | **owns it** | not used |
| `ToolTestInteractor` Protocol | `lib/galaxy/tool_util/verify/` | **owns it** | not used |

**Ask #2 is not a prefix of ask #1's *pipeline*; it is a prefix of ask #1's *substrate* with a
different `ComputeEnvironment`.** That distinction is the whole ordering answer.

---

## Roadmap

Ten phases. Each independently mergeable into `galaxyproject/galaxy` `dev` (Phases 6 and 10 are
Planemo PRs). Ask #2 ships at Phase 5; ask #1 at Phase 9.

### Phase 0 — cut `import galaxy.app` from 6.4 s to ~2.5 s (split 0a / 0b)

Not cosmetic: it is the difference between ask #2's loop being 10 s and being ~5 s, and it is the
only lever on that number that is not a daemon.

- **Changes.** `lib/galaxy/jobs/__init__.py:37` — drop
  `from pulsar.client.staging import COMMAND_VERSION_FILENAME` in favour of a module-local constant
  (it is the literal `"COMMAND_VERSION"`) or a function-scope import; that alone removes
  `pulsar.client` → `pydantic_ai` (1.20 s). `lib/galaxy/app/__init__.py:27-28` — make
  `galaxy.agents.factory` / `galaxy.agents.registry` lazy (import inside the method that builds the
  agent registry); 2.51 s.
- **Red-to-green.** New `test/unit/app/test_import_cost.py::test_galaxy_app_import_graph` — run
  `[sys.executable, "-c", "import galaxy.app, json, sys; json.dump(sorted(sys.modules), sys.stdout)"]`
  in a subprocess and assert `"pydantic_ai" not in mods` and `"galaxy.agents.base" not in mods`.
  Fails today (both present).
- **Reuses.** Nothing new.
- **New reusable abstraction.** None — this is deletion. In-tree beneficiaries: every Galaxy console
  script, Celery worker boot, and `test/unit/app/` collection.
- **Split it.** **0a (safe, ship first)**: the `pulsar.client` import is a single constant and has
  near-zero argument surface — ~1.2 s for one line. **0b (contested)**: making
  `galaxy.agents.factory` lazy changes *when* the agent registry is constructed; something may rely
  on that import as a side effect of `import galaxy.app`. ~2.5 s, needs discussion.
- **Blast radius.** Two import statements; the full unit suite must run for 0b.

### Phase 1 — `GalaxyManagerApplication` gains `error_reports` (bug fix, standalone)

`MinimalManagerApp` **declares** `error_reports` (`structured_app/__init__.py:152`) but only
`UniverseApplication.__init__` sets it (`app/__init__.py:1000`). `celery/tasks.py:467` calls
`MinimalJobWrapper.finish("", "")` on a manager app; an errored job there reaches
`_report_error()` (`jobs/__init__.py:2413-2414` and `:1569`) and dereferences
`self.app.error_reports` (`:2893`). Reproduced:
`AttributeError: 'GalaxyManagerApplication' object has no attribute 'error_reports'`.

- **Changes.** Move the `error_reports` registration from `UniverseApplication.__init__:1000-1002`
  into `GalaxyManagerApplication.__init__`. While there, `reindex_tool_search`
  (`app/__init__.py:925-933`) references unset `self.tool_cache` / `self.toolbox_search` on the same
  class — note it in the PR, fix in Phase 2.
- **Red-to-green.** `test/unit/app/jobs/test_job_wrapper_error_reporting.py::test_finish_errored_job_on_manager_app`
  — build a `GalaxyManagerApplication`, a failed `Job`, a `MinimalJobWrapper`, call `finish("", "")`,
  assert no `AttributeError` and `job.state == "error"`. Red today with exactly that traceback.
- **Reuses.** `ErrorReports` (`galaxy/tools/error_reports`), `_register_singleton`.
- **New reusable abstraction.** None. This is aligning an implementation with its declared Protocol.
- **Blast radius.** One registration moves up the MRO. `UniverseApplication` inherits it unchanged.
- **Ship separately and file it as a bug** — it is a real defect in the Celery `finish_job` path, not
  a feature of this project.

### Phase 2 — `ToolRuntimeApplication`: a toolbox-capable app that starts no threads

- **Changes.** `lib/galaxy/app/__init__.py`. Extract the block `UniverseApplication.__init__`
  already runs — `:958` (`StructuredApp` singleton), `:1005-1006` (`tool_cache`,
  `tool_shed_repository_cache`), `:1008` (`watchers`), `:1009` (`_configure_toolbox()`),
  `:1022`/`:1024`/`:1026` (`load_datatype_converters`, `load_external_metadata_tool`,
  `load_lib_tools`) — into `MinimalGalaxyApplication._configure_tool_runtime()`.
  `UniverseApplication.__init__` calls it in place of those lines; new
  `class ToolRuntimeApplication(GalaxyManagerApplication)` calls it and nothing else.
  **Net effect is de-duplication, not addition.** Ordering between `tool_cache` → `watchers` →
  `_configure_toolbox` is load-bearing (`ConfigWatchers` needs `tool_cache`; `ToolBox` reads
  `app.watchers.tool_watcher`, `tool_util/toolbox/base.py:358-359`).
- **Red-to-green.** New `test/unit/app/test_tool_runtime_app.py` (precedent:
  `test/unit/app/tools/test_toolbox.py:16` already builds a real app):
  - `test_tool_runtime_app_loads_toolbox` — `assert app.toolbox.get_tool("cat1")` and
    `assert app.toolbox.get_tool("__DATA_FETCH__")`. Red with `AttributeError: … 'watchers'`.
  - `test_tool_runtime_app_starts_no_threads` — `assert threading.enumerate() == [threading.main_thread()]`.
    **This is the test that keeps the property true forever.** Measured today: manager app + these
    additions = 1 thread / 1.97–2.39 s; `UniverseApplication` = 12 threads / 2.57 s.
  - `test_tool_runtime_app_does_no_network_io` — construct with `involucro_auto_init=False` and
    assert nothing was fetched. Without it, `_init_container_finder` (`app/__init__.py:483-501`)
    downloads 7.4 MB of involucro from GitHub at startup. Confirmed both ways.
- **Reuses.** `GalaxyManagerApplication` (`:701`), `ConfigWatchers`, `ToolCache`,
  `ToolShedRepositoryCache`, `_configure_toolbox`, `load_lib_tools` (`tools/special_tools.py:40`).
- **New reusable abstraction.** `ToolRuntimeApplication`. Second in-tree consumer: `celery/__init__.py:129-149`
  builds a `GalaxyManagerApplication` whose comment at `:146` says it has no toolbox — the Celery
  tasks that need one (`set_metadata`, `fetch_data`) are the obvious next user. Third:
  `test/unit/app/tools/` fixtures.
- **Blast radius.** Line movement inside `UniverseApplication.__init__`. **Must run the full unit
  suite and `test/functional/test_toolbox_pytest.py`** — nobody has.

### Phase 3 — `render_tool_script()` (pure extraction)

- **Changes.** `lib/galaxy/jobs/command_factory.py` — module-level
  `render_tool_script(shell, tool_commands, *, strict_shell=False, integrity_injection="", source_command="")`
  returning `f"#!{shell}\n{integrity_injection}{set_e}{source_command}{tool_commands}"`;
  `__externalize_commands` (`:194`) calls it. Byte-identity holds **by construction** — `:194` is
  that exact f-string.
- **Red-to-green.** `test/unit/app/jobs/test_command_factory.py` — new `TestRenderToolScript`:
  `assert render_tool_script("/bin/sh", "echo hi", strict_shell=True) == "#!/bin/sh\nset -e\necho hi"`.
  Red: `ImportError`. The existing `TestCommandFactory` suite is the regression net (passes today).
- **Reuses.** `INTEGRITY_INJECTION`, `write_script` (`runners/util/job_script/__init__.py:145`).
- **New reusable abstraction.** `render_tool_script`. Second consumer arrives in Phase 5.
- **Blast radius.** One function body.

### Phase 4 — `LocalDirectoryComputeEnvironment`

- **Changes.** `lib/galaxy/job_execution/compute_environment.py` — new class beside
  `SharedComputeEnvironment` (`:118`), ctor `(working_directory, tool_directory, galaxy_url=…)`.
  `input_path_rewrite` → `dataset.get_file_name()`; `output_path_rewrite` →
  `<wd>/outputs/dataset_<name>.dat`; **`env_config_directory()` returns the real working directory**
  (contrast `:163-165`) — document that this one override is what makes the emitted env statements
  self-contained.
- **Correction to agent 2's plan.** Do **not** delete the stub at `test/unit/app/tools/test_evaluation.py:246-302`
  and do not claim the existing tests pass unchanged. Executed: swapping the stub for this shape
  gives **4 failed, 12 passed** — `test_evaluation_with_path_rewrites_{wrapped,unwrapped}` and
  `test_arbitrary_path_rewriting_{wrapped,unwrapped}`, which exist to exercise
  `DatasetPath(..., false_path=…)` (`:139-140`) and `unstructured_path_rewrites` (`:187`), both of
  which a local-directory CE deliberately drops. The stub stays as a path-rewriting test double.
- **Red-to-green.** New `test/unit/app/tools/test_local_directory_compute_environment.py`:
  - `test_env_config_directory_is_real_path` — `assert not ce.env_config_directory().startswith("$")`,
    paired with `assert SharedComputeEnvironment.env_config_directory(None) == "$_GALAXY_JOB_DIR"` as
    the contrast assertion. Red: `ImportError`.
  - `test_evaluator_emits_self_resolving_env_vars` — drive `ToolEvaluator` over
    `environment_variables.xml` with this CE and assert no emitted `environment_variables` value
    contains `"$_GALAXY_JOB_DIR"`. Red today by construction.
- **Reuses.** `SimpleComputeEnvironment` (`:110`) for `config_directory` + `sep`.
- **New reusable abstraction.** The class. **Honest consumer count: one** (Phase 5) until someone
  writes a second local-compute caller. That is acceptable because this is a *module* inside an
  existing package, not a release boundary — the standing bias in `01_UPSTREAM_CONSTRAINTS.md` is
  against new packages, not new classes. Say this plainly upstream rather than inflating it.
- **Blast radius.** One new class. `output_names()` has exactly one in-tree caller and it is Pulsar
  (`jobs/runners/pulsar.py:439`), so returning `[]` is safe here.

### Phase 5 — `galaxy.tool_runtime`: `submit()` + `prepare()` + `emit()` — **ask #2 ships**

- **Changes.** New `lib/galaxy/tool_runtime/` (`galaxy-app`):
  - a context manager owning the app lifecycle (`ToolRuntimeApplication` + `app.shutdown()`, measured
    0.01 s, leaves 1 thread);
  - `submit(tool_id, inputs, history=…, user=…)` wrapping `tool.handle_input` with a
    `WorkRequestContext` (`work/context.py:22`) — **not** `ToolsService`, so no `galaxy.webapps`
    import and no `url_builder` requirement;
  - `prepare(submission, compute_environment=…) -> PreparedJob` calling
    `JobWrapper.prepare(compute_environment)` (`jobs/__init__.py:1290`);
  - `emit(prepared, outdir)` writing `tool_script.sh` (via `render_tool_script`), `env.sh` (via
    `env_to_statement`, `runners/util/env.py:4` — the same call `get_job_file` makes at
    `runners/__init__.py:518`), `run.sh` (`. ./env.sh; cd working; exec $shell ../tool_script.sh`),
    `manifest.json`, and the `configs/ working/ outputs/ home/ tmp/` tree.
  - **One small seam is needed**: `MinimalJobWrapper.working_directory` is lazily derived from
    `JobWorkingDirectory(job, object_store).resolve()` (`jobs/__init__.py:1388-1392`). A prepare-only
    driver must be able to name the directory. Add an explicit constructor/keyword rather than
    poking the name-mangled attribute.
  - **Staging**: `datatype.set_meta(hda)` on every input is **mandatory** (see below).
- **Red-to-green.** New `test/unit/app/tools/test_tool_runtime_emit.py`:
  - `test_emits_runnable_environment_variables` — emit for `environment_variables.xml`,
    `subprocess.run(["sh", "run.sh"])`, assert exit 0 and output contains `2`, `moo`, `NOTTHREE`.
    **Executed; passes.**
  - `test_tool_script_contains_no_exports` — the negative control: `assert "export" not in tool_script`.
    **Executed; passes.**
  - `test_emitted_script_has_no_job_script_variables` — `assert "$_GALAXY_JOB_DIR" not in (script + env)`.
    Red against the default compute environment.
  - `test_data_column_requires_set_meta` — lead with this one; it guards the finding a reviewer will
    not predict. Without `set_meta`, `column_param_configfile.xml` raises
    `RequestParameterInvalidException: Parameter 'col': an invalid option ('11') was selected`; with
    it, `working/inputs.json == {"col": [11], "col_mult": [1, 2, 3]}`. **Both executed.**
- **Reuses.** `parse_tool_test_descriptions` (`tool_util/verify/parse.py:61`), `TestDataResolver`,
  `Tool.handle_input`, `DefaultToolAction`, `ToolEvaluator` (and `UserToolEvaluator` — selected for
  free by the existing `_get_tool_evaluator`, `jobs/__init__.py:1437-1444`, so agent 2's separate
  YAML phase is unnecessary), `datatypes.sniff.guess_ext`, `env_to_statement`, Phases 3 and 4.
- **New reusable abstraction.** The `tool_runtime` context manager — "some library code", John's
  words. In-tree second consumer: `lib/galaxy_test/driver/driver_util.py` for tests that need a tool
  run but not a server.
- **Blast radius.** New package directory + one line in `packages/app/pyproject.toml`.

### Phase 6 — console script + Planemo `tool_script` command

- **Changes.** `main()` in `galaxy.tool_runtime.script`; a console script in
  `packages/app/pyproject.toml` beside `galaxy-remote-tool-eval` (`:104`). Planemo:
  `planemo/commands/cmd_tool_script.py` + `planemo/tool_script.py`, shape precedent `cmd_lint.py`.
  Planemo supplies tool path(s), `--test_index`, test-data dirs, `--output_dir`, `--no_cleanup`, and
  the conda prefix (`planemo/conda.py:53`, `options.conda_prefix_option()`).
- **Red-to-green.** `test/integration/test_tool_script_fidelity.py` — run a tool test through the
  existing driver with `cleanup_job: never` (`driver_util.py:181-183,224`), read
  `<job_dir>/tool_script.sh`, emit the same tool+index, normalize and assert equality. Normalization
  is exactly three token classes plus a path map: the working-directory prefix; `configs/tmp########`
  (`evaluation.py:804`); `tool_env_########` (`evaluation.py:849`); and a dataset-path map from the
  manifest. Tier it: `version_command_plain.xml` exact after workdir normalization;
  `environment_variables.xml` and `column_param_configfile.xml` after the full set.
  Planemo side: `tests/test_cmd_tool_script.py`, skipped without the `installed_galaxy` extra.
- **Blast radius.** One packaging line; one new Planemo command. No Planemo engine change.

### Phase 7 — `SynchronousJobHandler`: run a job to terminal state on the calling thread

- **Changes.** `lib/galaxy/jobs/handler.py` — `class SynchronousJobHandler(JobHandlerI)` beside
  `JobHandler` (`:94`) and `NoopHandler`, owning a `DefaultJobDispatcher` it never `start()`s
  (`:1281-1289` loads plugins; `:1291-1293` starts threads) and satisfying the `.app` / `.dispatcher`
  / `.sa_session` contract `JobWrapper.__init__` needs (`jobs/__init__.py:2908`):

  ```python
  def run(self, job):
      jw = JobWrapper(job, self)
      runner = self.dispatcher.get_job_runner(jw, get_task_runner=True)
      if not jw.enqueue():
          return job
      runner.queue_job(jw)
      self.sa_session.expire_all()
      return self.sa_session.get(model.Job, job.id)
  ```

  `enqueue()` is required: `prepare_job` silently returns `False` if state is not `QUEUED`
  (`runners/__init__.py:295-297` — a check-and-return, **not** an assert; agent 1's wording is wrong
  and the failure mode is quiet).
- **Red-to-green.** Extend `test/unit/app/jobs/test_runner_local.py` (today only `MockJobWrapper`, `:147`):
  - `test_queue_job_real_wrapper_reaches_terminal_state` — `cat1` on scratch copies of `1.bed`/`2.bed`;
    assert `job.state == "ok"`, `exit_code == 0`, output bytes equal `cat(1.bed, 2.bed)`,
    `metadata.columns == 6`, and `threading.enumerate() == [main_thread()]`.
  - `test_failing_tool_reports_error_not_attributeerror` — `job_properties` with `failbool=true`;
    assert `job.state == "error"` and `exit_code == 127`. **Red today** with the Phase 1 traceback;
    this is the regression guard for that fix.
- **Reuses.** `DefaultJobDispatcher`, `JobWrapper`, `MinimalJobWrapper.enqueue`,
  `BaseJobRunner.prepare_job`, `LocalJobRunner.queue_job` (`runners/local.py:86`), `JobHandlerI`.
- **New reusable abstraction.** `SynchronousJobHandler`. Second in-tree consumer:
  `test/unit/app/tools/test_collect_primary_datasets.py`-style tests that cannot run a real job today.
- **Blast radius.** Additive. Does not touch `JobHandler`, `JobHandlerQueue`, or the worker pool.
- **Config this phase pins down** (all verified against a running app):
  `enable_celery_tasks: false`, `metadata_strategy: directory`, `watch_tools: false`,
  `watch_tool_data_dir: false`, `use_heartbeat: false`, `involucro_auto_init: false`,
  `conda_auto_init: false`, `cleanup_job: never`. Note `embed_metadata_in_job` is a **job-destination
  param**, not a `galaxy.yml` key (`runners/local.py:40`) — the recon lists it wrongly.
  Planemo sets `enable_celery_tasks=True` (#1701 worktree `planemo/galaxy/config.py:386,525`) and
  must flip it for this mode.
- **Polling caveat to ship in the docstring, not the code.** If anyone ever polls the DB from the
  submitting thread they must `expire_all()`/`expunge_all()` per tick or it never converges —
  Galaxy's own handler does `self.sa_session.expunge_all()` at `jobs/handler.py:454`. The
  synchronous driver removes the need; say why.

### Phase 8 — `ToolTestInteractor` Protocol

- **Changes.** New `lib/galaxy/tool_util/verify/protocols.py` (`galaxy-tool-util`, where
  `verify_tool` lives). The surface is exactly **12 members** — verified by grep, no more, no less:
  `get_tool_tests`, `new_history`, `run_tool`, `resolve_tool_submission`, `delete_history`,
  `wait_for_job`, `get_job_stdio`, `verify_output`, `verify_output_collection`, `remote_to_input`,
  the `uploads` dict, and `_post`. Widen three annotations: `interactor.py:205`, `:252`, `:1755`.
- **Red-to-green.** `test/unit/tool_util/test_interactor_protocol.py::test_galaxy_interactor_api_satisfies_protocol`
  — `@runtime_checkable`, `assert isinstance(GalaxyInteractorApi(...), ToolTestInteractor)`. Red
  until the Protocol matches reality; guards drift thereafter.
- **Reuses.** `verify_tool` (`:1753`), `_verify_outputs` (`:1922`), `verify_hid` (`:1515`),
  `verify_collection` (`:1547`), `StagingInterface` (already an ABC with 3 abstract members,
  `tool_util/client/staging.py:53,72,296`).
- **New reusable abstraction.** `ToolTestInteractor`. `lib/galaxy_test/base/populators.py` uses a
  completely different surface and must **not** be dragged in.
- **Blast radius.** Three annotations (typing only). `GalaxyInteractorApi` still satisfies it, so
  Planemo compiles unchanged.
- **Do not rename `_post` → `stage_post` in this PR.** It is a second, arguable change riding on a
  mechanical one; `StagingInterface._post` would want the same treatment. Separate issue.

### Phase 9 — `InProcessToolTestInteractor` — **ask #1 ships**

- **Changes.** `lib/galaxy/tool_runtime/interactor.py` implementing the 12 members over Phases 5+7,
  plus `InProcessStagingInterface(StagingInterface)` whose `_handle_job` is `SynchronousJobHandler.run`.
  `get_tool_tests` delegates to `parse_tool_test_descriptions`. Staging goes through
  `__DATA_FETCH__` driven by the same synchronous driver (executed by agent 1: staged HDAs with real
  sniffing/ext/metadata; ~7 s per staging job because it is a job) with a documented opt-in fast path
  for `ftype=`-explicit data.
  **Landmine to encode:** a fetch with `src: "path"` **moves** the source file. The implementation
  must copy into scratch or use `src: "files"` with a temp `local_filename` the way `create_fetch`
  does (`services/tools.py:303-310`).
- **Red-to-green.** `test/unit/app/tools/test_inprocess_interactor.py`:
  - `test_verify_tool_passes_in_process` — `verify_tool("cat1", InProcessToolTestInteractor(runtime), test_index=0)`
    does not raise.
  - `test_verify_tool_detects_wrong_output` — against a deliberately broken expectation, asserts it
    **does** raise. A test runner that never fails is worthless, and **nobody has executed
    `verify_tool` on any path yet** — this phase is the least-evidenced in the plan.
- **Blast radius.** New module only.

### Phase 10 — Planemo `InProcessGalaxyEngine`

- **Changes (Planemo PR, after a Galaxy release).** `planemo/engine/factory.py` gains one `elif`;
  new `planemo/engine/inprocess.py` swapping the two lines at `planemo/engine/galaxy.py:141,161`
  (PR #1701 worktree; `:102,:120` on master) for `InProcessToolTestInteractor`. New config context
  producing a properties dict — no Gravity, no ports, no readiness polling. **#1701's Gravity engine
  is untouched**, per John's "I don't think that goal should prevent this from using gravity in this
  modality though."
- **Red-to-green.** `tests/test_cmd_test.py` style — `planemo test --engine inprocess_galaxy` against
  `project_templates/demo/cat.xml`, assert the JSON report shows a pass; and against a deliberately
  broken tool, a fail.
- **Blast radius.** Additive.

### Phase 11 (optional) — collection inputs

25 of 225 functional tool tests refuse on **both** paths today. Build `DatasetCollection` /
`DatasetCollectionElement` / `HistoryDatasetCollectionAssociation` from `TestCollectionDef`,
mirroring `interactor._element_identifiers` (`:1016-1036`), into `job.input_dataset_collections`
(`evaluation.py:1091-1093`). Until then, raise a named, actionable error — not a traceback.

---

## Galaxy core vs Planemo

Consistent with the binding split in `01_UPSTREAM_CONSTRAINTS.md`:

- **Galaxy core** owns everything in Phases 0–5, 7–9: the app class, the synchronous handler, the
  compute environment, the renderer, the runtime API, the interactor Protocol and its in-process
  implementation, and the supported startup/shutdown contract.
- **Planemo** owns adapter and policy only: CLI options, test-data dir resolution, conda prefix,
  temp dir / `no_cleanup`, diagnostics, engine registration. Verified today Planemo imports **only**
  `galaxy.tool_util` (55) and `galaxy.util` (29) — nothing from `galaxy.app`, `galaxy.jobs`,
  `galaxy.model`, `galaxy.webapps`. That must stay true of *internals*.
- **No new package, no new release boundary.** Everything lands in `galaxy-app` and
  `galaxy-tool-util`; `planemo[installed_galaxy]` (#1701 `pyproject.toml:72-77`) already pays for
  the edge. The `tool.handle_input` path imports zero `galaxy.webapps` modules (verified), so
  `galaxy-web-apps` is not required for it.

**The two plans disagree here and it needs a decision** (see Open decisions): agent 1 has Planemo
*import* `galaxy.tool_runtime`; agent 2 has Planemo *shell out* to the console script. My reading:
the one-shot CLI shells out (clean "install `planemo[installed_galaxy]`" failure instead of an
`ImportError` from inside Galaxy's import graph); the engine must import, because it cannot
fork per tool test. Importing a *supported, documented* API is adapting; the split forbids importing
internals, which neither does.

---

## Risks, ranked

1. **Startup cost for the "rapid tool development" loop.** ~10 s per invocation today; Phase 0
   targets ~5–6 s. If that is not enough, the answer is a warm process (`--watch` mode re-emitting on
   file change, one app build amortized — the corpus sweep already amortizes to ~0.35 s/tool).
   **Mitigated by Phase 0 + `--watch`.** If Phase 0b is rejected upstream, 0a still buys ~1.2 s and
   ask #2 ships anyway at ~9 s cold / ~0.35 s warm — the ordering argument does not depend on
   Phase 0 landing in full. A daemon is a spike if neither suffices.
2. **Phase 2's refactor of `UniverseApplication.__init__`.** Ordering between `tool_cache`,
   `watchers` and `_configure_toolbox` is load-bearing and **nobody has run the full suite**.
   *Mitigation: run `test/unit/`, `test/functional/test_toolbox_pytest.py`, and a framework-test pass
   before opening the PR.* Note 2 pre-existing failures in `test/unit/app/jobs/test_runner_local.py`
   in a clean venv (`test_galaxy_lib_on_path`, `test_timelimit_kills_job`) — establish that baseline first.
3. **`metadata/set.py` is 89 % of ask #1's per-job wall time, and it is Galaxy imports.** Measured:
   `python -c pass` = 0.02 s; `python -c "import galaxy.metadata.set_metadata"` = **3.65 s**; the job
   subprocess residual is 3.68 s. Agent 1 called this "Python interpreter startup" — it is not, it is
   Galaxy library import, which means it is **fixable**. *Needs a spike*: lazy imports in
   `galaxy_ext.metadata.set_metadata`, or reusing Phase 0's work, or a persistent metadata worker.
   Out of scope for the roadmap but it dwarfs everything else in ask #1.
4. **Collections.** 25/225 tool tests unsupported on both paths. *Mitigation: Phase 11, plus a named
   error until then.*
5. **Containers untested on either path.** `modify_command_for_container` /
   `container.containerize_command` (`command_factory.py:114`) never exercised in-process.
   `render_tool_script`'s `source_command` parameter is the hook. *Needs a spike.*
6. **`verify_tool` has never been executed in-process by anyone.** Phase 9 is designed from a
   call-site grep. *Mitigation: write Phase 9's two tests first and treat a red result as a redesign
   signal, not a bug.*
7. **macOS + sqlite + `LocalJobRunner` only.** `DB-SKIP-LOCKED` unavailable; handler assignment
   differs on PostgreSQL; `_build_config_files` uses `os.link` (`evaluation.py:807`) which behaves
   differently across filesystems on Linux. *Mitigation: CI matrix from Phase 2 onward.*
8. **`error_reports` may be one of a class of missing manager-app attributes.** It was invisible until
   a *failing* tool ran. Data managers, interactive tools and expression tools may surface more.
   *Mitigation: Phase 2's tests exercise the failure path, not just the success path.*
9. **Fetch `src: "path"` moves the source file.** Consumed `test-data/1.bed`/`2.bed` from the pinned
   worktree during agent 1's run. *Mitigation: Phase 9 copies into scratch, and says so in the docstring.*
10. **Network at startup.** `involucro_auto_init: false` fully suppresses the 7.4 MB GitHub download.
    *Mitigated, with a test (Phase 2).*

**Conda is explicitly not a risk.** Verified: with no toolbox, no job config and no network,
`build_dependency_manager` takes 3 ms and resolves a real conda env to
`MergedCondaDependency(exact=True)` with the correct `. activate` block. Dependency resolution is
`galaxy.tool_util.deps` — filesystem and subprocess — and is identical in or out of process. Emit it
opt-in, default off, inside `tool_script.sh` where Galaxy puts it (`command_factory.py:239-243`).

---

## Open decisions

- **Console-script name.** `galaxy-tool-script` sits one letter-group from `galaxy-tool-test`
  (`packages/tool_util/pyproject.toml:75`) in the script list. Alternatives:
  `galaxy-expand-tool-script`, `galaxy-tool-script-expand`, `galaxy-emit-tool-script`. Note
  `galaxy-tool-test-case-validation` (`:76`) shows multi-word suffixes are already precedented.
- **Planemo boundary: import `galaxy.tool_runtime`, or shell out to the console script?** The two
  plans disagree and both cite the ownership split. Recommendation above; your call.
- **Phase 0 in scope, or a separate issue?** It is the only lever on the 10 s loop and it touches
  files neither ask otherwise needs.
- **`ToolRuntimeApplication` home** — `galaxy.app` (less surface, keeps the `UniverseApplication`
  de-duplication local) vs `galaxy.tool_runtime` (clearer ownership).
- **Working-directory seam for prepare-only** — new kwarg on `JobWrapper`, or a `working_directory`
  setter, or emit into the job working directory and copy out?
- **Keep the `test_evaluation.py` CE stub** (my recommendation) or grow the library class to cover
  `false_path` + `unstructured_path_rewrites`?
- **Stable ids across runs** for diffable emitted output? Currently ids come from a throwaway sqlite
  sequence.
- **`--emit-job-script` too?** Out of the stated ask; would make the artifact a full reproduction and
  would let the fidelity test diff more.
- **Phase 1 (`error_reports`) — file as a Galaxy bug first?** It affects the Celery `finish_job` path
  today, independent of this project.
