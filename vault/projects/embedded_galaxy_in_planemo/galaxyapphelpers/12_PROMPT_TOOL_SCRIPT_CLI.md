# 12 — PROMPT: tool-test → tool-script CLI, pluggable into Planemo

You are planning agent 2. Research + planning only. **Do not modify any file in any Galaxy or Planemo
worktree.** Your only write is `30_PLAN_TOOL_SCRIPT_CLI.md` in this directory.

## The ask (from John Chilton, Galaxy core dev)

> A little CLI, pluggable into Planemo, that does tool-test → tool-script. Full expansion of a *tool script*
> file. (In Galaxy parlance the *job script* calls out to a *tool script*.) I do NOT care about job details
> — I want the tool details. Purpose: aid rapid Galaxy tool development.

Read that literally: input is a tool + one of its tests; output is the fully-expanded shell the tool would
actually run, with config files materialized beside it. Job-level wrapping (slots, memory, metadata
collection, exit-code capture, stdout redirection, `from_work_dir` copies) is explicitly out of scope.

Context: Planemo PR #1701 ("Run package-installed Galaxy through Gravity", OPEN) established that Planemo
can run the Galaxy packages installed in its own virtualenv. This ask pushes that concept into Galaxy.
**This is a Galaxy change**, filed under a Planemo project directory for convenience.

## Pinned substrate

- Galaxy, read-only: `/Users/jxc755/projects/repositories/galaxy-embedded-research`, detached at
  `c6c3b6df49` (== `origin/dev` as of 2026-09-16). **Use only this worktree.** Do NOT use
  `~/projects/repositories/galaxy` — it is 854 commits stale.
- Planemo PR #1701: `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/embedded_galaxy_in_planemo/planemo-installed-galaxy-gravity`
  (branch `package-installed-galaxy-gravity`, `a9a48ca5`).
- Planemo master: `/Users/jxc755/projects/repositories/planemo`.

## Read `10_RECON.md` in this directory first

Sections 2, 3, 4, 5 are yours. Start from them; verify, then go deeper. Do not re-do the recon.

## The boundary you are cutting at (verified — confirm, then use)

`tool_script.sh` is written by `__externalize_commands`
(`lib/galaxy/jobs/command_factory.py:170-213`), name hardcoded at `:175`, contents assembled at `:194`:

```
#!{shell}                          # job_wrapper.shell, default /bin/sh
{integrity_injection}              # if job_io.check_job_script_integrity
{set -e}                           # if job_wrapper.strict_shell
{container.source_environment}     # containerized only
{tool_commands}
```

`tool_commands` is, in order:
1. dependency-resolution shell commands — `__handle_dependency_resolution` (`command_factory.py:239-243`)
   from `job_wrapper.dependency_shell_commands`. **Inside the tool script.**
2. task-splitting `prepare_input_files_cmds` — `:232-236`. Legacy.
3. `job_wrapper.get_command_line()` = `f"{version_command_line or ''}{command_line}"`
   (`lib/galaxy/jobs/__init__.py:2569-2573`) — the first two elements of `ToolEvaluator.build()`.

Everything else is *job* script: containerization (`:114`), stdout/stderr capture to
`../outputs/tool_stdout|tool_stderr` (`:121-124`), `cd working` (`:131`), `remote_tool_eval` prepend
(`:133`), container monitor (`:135`), exit-code capture (`:139`), CWL relocate (`:141-158`),
`from_work_dir` copies (`:160`), metadata (`:163`), and the whole
`lib/galaxy/jobs/runners/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh`.

`commands_in_new_shell` defaults `True` (`lib/galaxy/jobs/__init__.py:1045,1216`), so local jobs always
produce a `tool_script.sh`.

**The one trap.** `ToolEvaluator._build_environment_variables()` (`lib/galaxy/tools/evaluation.py:816-874`)
produces env var values that are backtick expressions —
`` `cat "$_GALAXY_JOB_DIR/configs/<basename>"` `` (`:859-861`) — and they are injected into the *job
script's* `env_setup_commands`, not the tool script
(`lib/galaxy/jobs/runners/__init__.py:508-527`, `envs.extend(job_wrapper.environment_variables)` at `:516`).
A self-contained, runnable tool script must inline them or emit its own `export` preamble. **This is the
sharpest design decision in the ask** — a strict "just the tool script" reading produces a file that will
not run standalone.

## Recon findings you inherit

1. **`remote_tool_eval.py` is the back half, not 90%.** `lib/galaxy/tools/remote_tool_eval.py:79
   evaluate_tool` builds `ToolApp` (`:48`, a `MinimalToolApp`) over a `SessionlessContext`, rehydrates a
   `JobIO` from `job_io.json` (`:89`), builds the tool via `create_tool_from_representation` (`:111`), and
   **appends** `version_command_line + command_line` to `tool_script.sh` (`:121-123`). Everything it
   consumes is produced by a real Galaxy during `MinimalJobWrapper.prepare()`
   (`lib/galaxy/jobs/__init__.py:1349-1352`). Your work is the front half.
2. **The better skeleton is `test/unit/app/tools/test_evaluation.py`.** `:49-57` constructs
   `ToolEvaluator(app, tool, job, test_directory)` with a `Job`, a `History`, `JobParameter`s and HDAs
   built as plain Python objects (`:227-237`, `Dataset(id=…, external_filename=path)`), plus a hand-rolled
   `ComputeEnvironment` at `:246-302` that needs **no `JobIO` and no DB**. It runs `build()` end to end.
   Caveat: it uses `MockTool` (`:305`), not a real `Tool`.
3. **`ToolEvaluator`'s contract** — see `10_RECON.md` §3 for the full enumeration of what `app`, `job`,
   `local_working_directory` and `ComputeEnvironment` must supply. Highlights:
   `MinimalToolApp` is 7 members (`lib/galaxy/structured_app/__init__.py:101`);
   `ComputeEnvironment` is 16 abstract methods (`lib/galaxy/job_execution/compute_environment.py:20-107`),
   2 of which `SimpleComputeEnvironment` (`:110`) gives you free;
   `<wd>/working` and `<wd>/configs` must exist (`evaluation.py:803-810`);
   `app.security` is dereferenced only when `job.history` is truthy (`evaluation.py:261-262`) — note
   `remote_tool_eval.ToolApp` sets `security = None` (`:72`).
4. **Tool test parsing is already pure.** `parse_tool_test_descriptions(tool_source, …)`
   (`lib/galaxy/tool_util/verify/parse.py:61`) takes a `ToolSource` and returns `ToolTestDescription`
   objects (`interactor.py:2206`, `.test_data()` at `:2272`) with `inputs` (`ExpandedToolInputs`),
   `required_files`, `outputs`, and — for profile ≥ 24.2 — a validated `request` + `request_schema`.
   **No app, no DB, and it lives in `galaxy-tool-util`**, which Planemo already depends on.
5. **Three substrates for the synthesized job** (recon §4), not two:
   - **A. no session** — `test_evaluation.py:53-57`. Breaks for real tools at
     `ToolEvaluator._validate_incoming` (`evaluation.py:384-393`) → `DataToolParameter.from_json` →
     `trans.sa_session` (`lib/galaxy/tools/parameters/basic.py:2410-2483`).
   - **B. `SessionlessContext`** — `lib/galaxy/model/store/__init__.py:223-256`. What Pulsar uses in
     production. Needs hand-assigned ids and explicit `add()`. `query().filter_by()` is a stub (`:249-251`).
   - **C. real in-memory sqlite** — `GalaxyDataTestApp` → `init("/tmp", "sqlite:///:memory:", create_tables=True)`
     (`lib/galaxy/model/unittest_utils/data_app.py:40,111`), inherited by `MockApp`
     (`lib/galaxy/app_unittest_utils/galaxy_mock.py:112,135`). Ships in `galaxy-data`, not `test/`.
   Also worth evaluating: **`DictImportModelStore` / `get_import_model_store_for_dict`**
   (`model/store/__init__.py:1556,1604`) can build a populated `SessionlessContext` from a plain dict —
   the same machinery `imported_store_for_metadata` (`:3115`) uses for Pulsar. That would reuse Galaxy's
   own serialization contract instead of hand-building ORM graphs.
6. **What is genuinely unavoidable** (recon §5): file on disk at a resolvable path
   (`Dataset(external_filename=…)` is the cheap trick); `hda.extension` set (sniff via
   `lib/galaxy/datatypes/sniff.py:315 guess_ext` / `:593 guess_ext_from_file_name` /
   `:878 handle_uploaded_dataset_file` when the test omits `ftype`); metadata **not** strictly required —
   `DatasetFilenameWrapper.MetadataWrapper.__getattr__` falls back to `spec[name].no_value`
   (`lib/galaxy/tools/wrappers.py:313-332`) — but metadata-referencing tools then expand wrong.
   Real `set_meta`: `lib/galaxy/metadata/set_metadata.py:126,190`.
7. **Packaging is already decided; do not reflex-refactor.** `ToolEvaluator` is in `galaxy-app`
   (`packages/app/pyproject.toml:18-33`). Planemo PR #1701 declares
   `installed_galaxy = ["galaxy-app>=26.1,<26.2", "galaxy-web-apps>=26.1,<26.2", "gravity>=1.2.3"]`
   (PR worktree `pyproject.toml:72-77`). `galaxy-remote-tool-eval` is already a `galaxy-app` console script
   (`packages/app/pyproject.toml:104`) — a `galaxy-tool-script` sibling is the precedent. **Only propose a
   package split if you find a concrete reason**, and state it.

## What to study (with file:line)

**The evaluator**
- `lib/galaxy/tools/evaluation.py`: `:139 ToolEvaluator`, `:149 __init__`, `:164 set_compute_environment`,
  `:229 execute_tool_hooks`, `:238 build_param_dict`, `:295 _materialize_objects`, `:384 _validate_incoming`,
  `:482 __populate_wrappers`, `:601 __populate_output_dataset_wrappers`, `:621 __populate_non_job_params`,
  `:653 __populate_unstructured_path_rewrites`, `:703 __sanitize_param_dict`, `:723 build`,
  `:751 _build_command_line`, `:786 _build_version_command`, `:794 _build_config_files`,
  `:816 _build_environment_variables`, `:894 _build_param_file`, `:936 _write_workdir_file`,
  `:965 _register_extra_file`, `:1003 _history`, `:1007 _user`, `:1015 PartialToolEvaluator`,
  `:1034 UserToolEvaluator`, `:1150 RemoteToolEvaluator`.
- `lib/galaxy/job_execution/compute_environment.py:20,110,118`.
- `lib/galaxy/job_execution/setup.py:68 JobIO`, `:157 from_json`, `:167 from_dict`, `:283 compute_outputs`,
  `:329 ensure_configs_directory`.
- `lib/galaxy/tools/wrappers.py:289 DatasetFilenameWrapper` and siblings.
- `lib/galaxy/tools/runtime.py:51 setup_for_runtimeify` (only reached by `UserToolEvaluator`).

**Where it is called from today (the model to mimic)**
- `lib/galaxy/jobs/__init__.py:1290 MinimalJobWrapper.prepare` — the real call site. `:1424
  default_compute_environment`, `:1437 _get_tool_evaluator` (chooses Partial/User/plain).
- `lib/galaxy/jobs/command_factory.py:46 build_command`, `:170 __externalize_commands`.
- `lib/galaxy/jobs/runners/__init__.py:336 build_command_line`, `:508 get_job_file`.
- `lib/galaxy/jobs/runners/util/job_script/__init__.py:75 job_script`, `:145 write_script`;
  `DEFAULT_JOB_FILE_TEMPLATE.sh`.

**Tool tests → structured inputs**
- `lib/galaxy/tool_util/verify/parse.py:61 parse_tool_test_descriptions`, `:134 _qualify_test_inputs`,
  `:167 _description_from_tool_source`.
- `lib/galaxy/tool_util/verify/interactor.py:2206 ToolTestDescription`, `:2272 test_data`,
  `:2313 test_data_iter`, `:826 run_tool` (shows exactly how test inputs become submission inputs, and
  how `self.uploads` maps test filenames → HDA refs), `:665 remote_to_input`, `:204 stage_data_in_history`.
- `lib/galaxy/tool_util/verify/_types.py`, `lib/galaxy/tool_util/verify/test_data.py TestDataResolver`.
- `lib/galaxy/tool_util/parameters/` — `test_case_state`, `encode_test`, `input_models_for_tool_source`.

**Tool loading without a toolbox**
- `lib/galaxy/tools/__init__.py:491 create_tool_from_representation`, `create_tool_from_source`.
- `lib/galaxy/app_unittest_utils/tools_support.py:29 mock_app_for_tool_support`, `:79 UsesTools`,
  `:82 _init_tool`, `:104 _init_tool_for_path`, `:119 __setup_tool`.

**Model / session**
- `lib/galaxy/model/store/__init__.py:223 SessionlessContext`, `:1556 DictImportModelStore`,
  `:1604 get_import_model_store_for_dict`, `:3115 imported_store_for_metadata`.
- `lib/galaxy/model/__init__.py:1924 Job.io_dicts`.
- `lib/galaxy/model/unittest_utils/data_app.py`.
- `lib/galaxy/tools/remote_tool_eval.py` in full (148 lines).

**Planemo plug point**
- `planemo/engine/factory.py:30 build_engine`; `planemo/engine/galaxy.py`; `planemo/runnable.py`;
  how Planemo already consumes `galaxy-tool-util` (`planemo/engine/galaxy.py:14`).
- Existing Planemo commands for shape precedent: `planemo/commands/cmd_test.py`, `cmd_run.py`,
  and anything that operates on a tool without serving Galaxy (`cmd_lint.py`, `cmd_tool_init.py`).

## Open questions you must answer WITH EVIDENCE (not preference)

1. **SessionlessContext or a real model mapping?** This is the central question. Investigate **all three**
   substrates in recon §4 plus the `DictImportModelStore` route. Decide with evidence: get a **real** `Tool`
   (loaded from an actual tool XML in `test/functional/tools/`, not `MockTool`) through
   `ToolEvaluator.set_compute_environment` + `build()` on each substrate and report what breaks.
   Specifically test a tool with: a `data` input, a `select` with options, a `configfile`, an
   `environment_variable`, and a `<version_command>`.
2. **Exactly what must a synthesized `Job` carry?** Produce the definitive list (fields + relationships)
   from `evaluation.py:164-227` and `model/__init__.py:1924`. Then say which of those a tool test can
   supply and which must be invented.
3. **`JobIO`/`SharedComputeEnvironment`, or a hand-rolled `ComputeEnvironment`?** `test_evaluation.py:246`
   proves the latter works. Decide, and if hand-rolled, propose **promoting it out of `test/`** into
   `galaxy.job_execution.compute_environment` as a named reusable class (e.g. `LocalDirectoryComputeEnvironment`).
   Name every in-tree caller that could then reuse it.
4. **How much of `set_metadata` / sniffing must run?** Answer empirically: pick tools whose command
   references `$input.metadata.*` and show what the expanded command line looks like with and without
   `set_meta`. Then decide: run `datatype.set_meta` per input dataset, run the full
   `set_metadata_portable` path, or document the limitation. If sniffing: which entry point
   (`guess_ext` vs `handle_uploaded_dataset_file`) and what does it cost?
5. **What exactly does the CLI emit?** Options (pick, justify):
   (a) byte-identical `tool_script.sh` as Galaxy writes it, nothing more;
   (b) (a) plus an `export` preamble inlining `ToolEvaluator.environment_variables`, so it is runnable;
   (c) a directory: `tool_script.sh` + `configs/` + `working/` + a manifest of input/output path mappings.
   Note the trap above — (a) is not runnable for tools with `<environment_variable>`.
   Also decide: include dependency-resolution commands (they *are* in the real tool script,
   `command_factory.py:239`) or not? Include `version_command_line` (it is in `get_command_line`)?
6. **Should this reuse `__externalize_commands` or duplicate its ~20 lines?** Reuse means passing something
   `MinimalJobWrapper`-shaped (`job_io.check_job_script_integrity`, `strict_shell`, `working_directory`,
   `shell`, `dependency_shell_commands`). Decide whether to introduce a narrow Protocol for that, or to
   factor a pure `render_tool_script(shell, commands, *, strict_shell, integrity, source_command) -> str`
   out of `command_factory.py:170-213` and have both callers use it. **The second is the better reusable
   abstraction — argue it or refute it.**
7. **Which evaluator subclass?** Plain `ToolEvaluator`, or `RemoteToolEvaluator` (`evaluation.py:1150`,
   which skips `execute_tool_hooks` and `_build_environment_variables`)? `_get_tool_evaluator`
   (`jobs/__init__.py:1437`) picks between three. What does a tool-script CLI want, and what does it want
   for YAML/`base_command` tools (`UserToolEvaluator`, `:1034`)?
8. **Multiple tests, collections, composite inputs, `location:` URIs.** Tool tests can have collection
   inputs (`TestCollectionDef`), composite datatypes, and remote `location:` inputs. What is in scope for
   v1 and what fails loudly? Cite `interactor.py:854-890` for how each shape is handled today.
9. **Where does the CLI live, and how does Planemo plug in?** `galaxy-app` console script
   (`packages/app/pyproject.toml:104` precedent), a `galaxy-tool-util` script (but `ToolEvaluator` isn't
   there), or a Planemo command that imports from `galaxy.tools`? Given PR #1701 already accepts
   `planemo[installed_galaxy]` pulling `galaxy-app`, **justify any package split or explicitly decline to
   make one.** Also: what would the Planemo command be called and where does it sit
   (`planemo/commands/cmd_*.py`)?
10. **What does the developer actually do with the output?** `cd` into the emitted directory and
    `sh tool_script.sh`? Does it need to work under `conda run` / a container? Does the CLI resolve
    requirements (`lib/galaxy/tool_util/deps/`) or leave that to the user? This determines whether (a),
    (b) or (c) in Q5 is right.
11. **How do you test byte-fidelity against real Galaxy?** Propose a test that runs a tool test through a
    real Galaxy, captures the `tool_script.sh` it wrote, runs the CLI on the same tool+test, and diffs.
    Name the tools you would pin this against (`test/functional/tools/` has small, stable ones) and which
    parts of the diff must be normalized (temp paths, config file basenames — note
    `_build_config_files` uses `NamedTemporaryFile`, `evaluation.py:804`, so basenames are random).

## Deliverable — `30_PLAN_TOOL_SCRIPT_CLI.md`

Required structure:

1. **Answers to the 11 open questions**, each with evidence (`file:line` or command + output).
   Q1 and Q5 are the load-bearing ones.
2. **The chosen cut line**, stated precisely: exactly what is in the emitted artifact and what is not,
   against `command_factory.py` line numbers.
3. **Chosen substrate** (SessionlessContext / in-memory sqlite / model-store dict) with the evidence that
   decided it, and the rejected alternatives.
4. **Phased plan.** Ordered, independently mergeable steps. Per step:
   - what changes, in which files
   - **red-to-green test plan**: the failing test first (file + assertion), then the change.
     Prefer extending `test/unit/app/tools/test_evaluation.py`, `test/unit/app/jobs/test_command_factory.py`,
     and `test/unit/tool_util/` over new scaffolding.
   - **existing abstractions reused** (name them from the recon seam table)
   - **new reusable abstraction created**, if any — and who else in-tree could use it
     (candidates already identified: a library `ComputeEnvironment` for local directories; a pure
     `render_tool_script`; a "synthesize a job from a tool test" builder)
   - blast radius
5. **Ordering relative to ask #1** (in-process tool test, `11_PROMPT_INPROCESS_TOOL_TEST.md`). Shared
   substrate or independent tracks? Answer with evidence; do not assume.
6. **Claims I could not verify** — mandatory section.
7. **Unresolved questions** — terse list at the end. Sacrifice grammar for concision.

## Rules

- Research and planning only. No edits to Galaxy or Planemo worktrees.
- Every non-obvious assertion cited `path/file.py:line` against `c6c3b6df49`.
- You may *run* things (pytest, a python REPL against the worktree) as long as you don't modify tracked
  files — prefer a scratch directory. Running beats reading; say clearly which claims you executed vs. read.
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
