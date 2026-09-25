# 41 — VERIFICATION LOG

Date: 2026-09-16. Author: verification agent.
Substrate: `/Users/jxc755/projects/repositories/galaxy-embedded-research` @ `c6c3b6df49` (verified:
`git log -1` → `c6c3b6df49ff0f17d393fb0c60326d98f3f0251e Wed Sep 16 08:50:25 2026`).
Planemo master `d3ce9bfe`; Planemo PR #1701 worktree `a9a48ca5`.

## Method

Both prior agents' venvs and harnesses survived in the shared session scratchpad
(`.../scratchpad/gxvenv` = agent 1, `.../scratchpad/gxenv` = agent 2, plus `exp/`, `synth.py`,
`run_matrix.py`, `substrates.py`, `sweep*.json`). I **re-ran** their experiments rather than
re-deriving them, and wrote four new harnesses in `.../scratchpad/verify/`:

| File | What it does |
| --- | --- |
| `a_sweep.py` | agent 1's path over agent 2's 225-test corpus (the decisive experiment) |
| `unified.py` | real app + real `Job` + `LocalDirectoryComputeEnvironment` injected into `JobWrapper.prepare()` |
| `errrep.py` | `error_reports` crash, thread counts, `involucro_auto_init` |
| `conda_check.py` | conda resolution, no toolbox, no job config, no network |
| `cost.py`, `threads.py`, `pkg.py` | startup decomposition, thread census, import-graph check |

`test-data/` was **copied into scratch** before use; nothing wrote to any pinned worktree.

Final state: `git status --porcelain` **empty** in all three worktrees (galaxy-embedded-research,
planemo master, planemo-installed-galaxy-gravity).

---

## A. Conflict 1 — ordering. New evidence.

### A1. Agent 1's 0.227 s prefix is measured *after* app build and after staging — **CONFIRMED (as a caveat)**

`exp/e15_toolscript.py` times only `runner.prepare_job(jw)`. App build, imports, user/history
creation and HDA staging all precede `t0`. Re-measured on the same harness: `prepare_job` 0.21–0.59 s
depending on tool. The honest end-to-end number is below.

### A2. Honest end-to-end cost, (a) vs (b) — **MEASURED**

Cold process, one tool (`column_param_configfile`), two runs each, `/usr/bin/time -p`:

| | path (a) agent 1 | path (b) agent 2 |
| --- | --- | --- |
| single tool, process start → artifact | **9.7 s / 10.9 s** | **4.4 s** (13.0 s first, cold FS) |
| 225-test corpus sweep, wall clock | **~90 s** | **40.4 s** |

Decomposition of (a)'s 10 s (`verify/cost.py`, `python -X importtime`):

```
import galaxy.app                      6.44 s   <-- dominant
   galaxy.agents.factory               2.51 s   (app/__init__.py:27-28, top-level import)
   galaxy.model                        1.94 s
   galaxy.jobs                         1.21 s
      pulsar.client (-> pydantic_ai)   1.20 s   (jobs/__init__.py:37, for ONE constant)
GalaxyManagerApplication ctor          1.06-1.21 s
toolbox (1-tool conf / 354-tool conf)  0.73 s / 1.11 s
work (stage + submit + prepare)        ~0.6 s
```

`import galaxy.tools` (what (b) pays) = **3.41 s**.

**So the (a)-vs-(b) gap is ~3 s of module import, not architecture.** ~3.7 s of `import galaxy.app`
is `galaxy.agents` + `pulsar.client`, neither of which a tool-script CLI uses. Agent 2's "70 ms"
is app *construction* only and is not the number a developer experiences.

### A3. Does (a) generalize to agent 2's corpus? — **YES, and it dominates**

`verify/a_sweep.py`: same 302 files, same `test_index=0`, same `GALAXY_TEST_FILE_DIR`, real
`GalaxyManagerApplication` + 6 additions with `test/functional/tools/sample_tool_conf.xml`,
`tool.handle_input` → `JobWrapper` → `runner.prepare_job` → read `tool_script.sh`.

```
225 tools with tests attempted
  OK                              167
  NotImplementedError (collections) 25
  NOT_IN_TOOLBOX                   16   <- harness: tool absent from sample_tool_conf.xml
  TestDataNotFoundError             7
  RequestParameterInvalidException  5   <- CORRECT refusals
  AssertionError                    3   <- cheetah_problem_*, prepare_job correctly returned False
  Exception                         1   <- metadata_bcf: `python` not on PATH (env)
  IsADirectoryError                 1   <- harness: copyfile on a directory input
```

Path (b), re-run by me on the same corpus: **176 OK** (agent 2 reported 175 — reproduced).

Set difference:

- **(b) wins 15 tools — every one is a harness artifact**: 14 `NOT_IN_TOOLBOX` (not listed in
  `sample_tool_conf.xml`), 1 `IsADirectoryError` (my staging code). **Zero real capability gaps.**
- **(a) wins 7 tools, all real path-(b) failures**: `collection_creates_pair`,
  `collection_creates_pair_format`, `collection_creates_pair_from_type`, `explicit_conversion`,
  `job_properties`, `metadata_column_names` (all `ToolTemplatingException` at
  `evaluation.py:131 global_tool_logs` on (b)), and `collection_nested_default`
  (`AssertionError` at `parameters/basic.py:2936 from_json`). These are tools whose *outputs* are
  collections, or which need implicit conversion, or whose job carries extra outputs — things the
  real `DefaultToolAction` builds and agent 2's `synthesize_job` does not.

**Verdict: corrected for harness artifacts, path (a) is a strict superset of path (b) on
fidelity.** Agent 1's "do not assume (a) generalizes" caveat is answered: it does, and further.

### A4. Agent 2's drift defence (`render_tool_script` byte-identity) — **CONFIRMED, and stronger than measured**

`command_factory.py:194`:

```python
script_contents = f"#!{shell}\n{integrity_injection}{set_e}{source_command}{tool_commands}"
```

Agent 2's proposed `render_tool_script` is that exact f-string. Byte-identity is therefore true
**by construction**, not just across their 3-row flag matrix. I re-implemented it in
`verify/unified.py` and the emitted scripts ran correctly. The drift objection to (b) is genuinely
defused — but see A5: it does not follow that (b) is the right driver.

### A5. **The discriminator — path (a) alone cannot emit a standalone tool script** — REFUTES "(a) is enough"

`verify/a_env.py`, `environment_variables.xml`, path (a) untouched:

```
"value": "`cat \"$_GALAXY_JOB_DIR/tool_env_t13n0h0i\"`",
"raw": true,
"job_directory_path": "<jobdir>/tool_env_t13n0h0i"
```

`_GALAXY_JOB_DIR` is defined only by the *job script*
(`runners/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh`, emitted by `get_job_file`,
`runners/__init__.py:516,518`), because `SharedComputeEnvironment.env_config_directory()` returns
the literal `"$_GALAXY_JOB_DIR"` (`compute_environment.py:163-165`). Output paths on path (a) also
point into the object store (`<data>/objects/a/9/4/dataset_<uuid>.dat`), not into an emittable
directory.

**So ask #2 built on path (a) as-is would have to emit the job script too — which ask #2 explicitly
excludes.** Agent 1's claim that ask #2 is "a strict prefix of ask #1's pipeline" is **REFUTED for
the deliverable**: the prefix yields a `tool_script.sh` that is not standalone-runnable.

### A6. **Can both be true? — CONFIRMED, executed end to end**

`verify/unified.py`: agent 1's substrate (real `ToolRuntimeApplication`-shaped app, real toolbox,
`tool.handle_input` → real `Job` from `DefaultToolAction`, real `JobWrapper`) + agent 2's two
abstractions (`LocalDirectoryComputeEnvironment`, `render_tool_script`) + `env_to_statement`
(`runners/util/env.py:4`), injected through the **already-existing seam**
`MinimalJobWrapper.prepare(compute_environment=None)` (`jobs/__init__.py:1290,1315`).

`environment_variables.xml`:

```
=== _GALAXY_JOB_DIR present anywhere? === False
=== 'export' inside tool_script.sh? === False   (agent 2's Q11 negative control)
=== run.sh exit: 0
--- outputs/dataset_environment_variables.dat ---
2
moo

NOTTHREE
```

`column_param_configfile.xml`:

```
tool_script.sh:  python '<out>/configs/tmpuipkxc6y' inputs.json
emitted:         working/inputs.json  configs/tmpuipkxc6y  configs/tmpv09x_77a  env.sh  run.sh
working/inputs.json -> {"col": [11], "col_mult": [1, 2, 3]}
sh run.sh -> exit 0   (with `python` on PATH)
```

Byte-for-byte the artifact agent 2 designed, produced from agent 1's substrate, with
**no `synthesize_job`, no `SessionlessContext`, no second app class**.

**The brief's hypothesis is confirmed with an executed demonstration, and is tighter than stated:
the two drivers differ by one call** — `runner.prepare_job(jw)` (ask #1) vs
`jw.prepare(LocalDirectoryComputeEnvironment(...))` (ask #2).

### A7. Agent 2: "ask #2's app deliberately has no toolbox, and that is fine" — **CONFIRMED but self-defeating**

`Tool.build_dependency_shell_commands` hard-codes `self.app.toolbox.dependency_manager`
(`tools/__init__.py:2593-2597`) — CONFIRMED verbatim. Agent 2 works around it by calling the
dependency manager directly. On the unified path the app *has* a toolbox, so the seam is a
non-issue. The toolbox-less app buys ~3 s of import and costs the 7 tools in A3.

---

## B. Conflict 2 — is metadata required? **RESOLVED, reproduced on a second substrate**

`verify/unified.py` with `NO_SET_META=1`, path (a), `column_param_configfile.xml`:

```
galaxy.exceptions.RequestParameterInvalidException:
  Parameter 'col': an invalid option ('11') was selected (valid options: 2,3,1)
```

With `set_meta`, the same tool emits `{"col": [11], "col_mult": [1, 2, 3]}` and runs.

**The precise rule.** `DatasetFilenameWrapper.MetadataWrapper.__getattr__` (`tools/wrappers.py:313-332`)
does fall back to `spec[name].no_value` — so the recon and the orientation note are right *about
templating*. But metadata is consumed **earlier**, during parameter validation
(`DataColumnParameter.from_json` → `get_legal_values`), and a wrong `no_value` there is a **hard
error, not a quiet wrong string**. The failure surfaces as `ParameterValueError` inside
`expand_incoming` on path (b) and as `RequestParameterInvalidException` (`tools/__init__.py:2346`,
`handle_incoming_errors`) on path (a) — same root cause.

**Rule for the CLI: `datatype.set_meta(hda)` on every staged input is mandatory, not optional.**
Any tool using `data_column`, `options from_dataset`, `options from_data_table` with a metadata
filter, or a metadata `<validator>` fails hard without it. Agent 2's finding stands; the recon's
§8.3 wording ("NOT strictly required") is **PARTLY REFUTED** — true for templating, false for
validation, and the validation gate runs first.

---

## C. Load-bearing single-source claims

| # | Claim | Source | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| C1 | `JobWrapper.finish()` → `_report_error()` dereferences `app.error_reports`, so every failing tool test becomes `AttributeError` | agent 1 | **CONFIRMED (reproduced)** | `verify/errrep.py`: `queue_job RAISED AttributeError 'GalaxyManagerApplication' object has no attribute 'error_reports'`; `jobs/__init__.py:2413-2414`, `:1569`, `:2889-2893`. With `error_reports` registered: `queue_job returned normally / job.state=error exit_code=127` |
| C2 | …and it is "a genuine upstream bug worth its own issue" | agent 1 | **CONFIRMED, and stronger than argued** | `error_reports` is declared on `MinimalManagerApp` (`structured_app/__init__.py:152`) but only set in `UniverseApplication.__init__` (`app/__init__.py:1000`). `celery/tasks.py:467` calls `MinimalJobWrapper.finish("", "")` on that app — an errored job there hits the same `AttributeError` **today**. Same class also references unset `self.tool_cache`/`self.toolbox_search` in `reindex_tool_search` (`app/__init__.py:925-933`). `_report_error` also dereferences `self.app.toolbox` (`:2891`) |
| C3 | `_report_error` is only reachable on tool failure | agent 1 (implied) | **PARTLY CONFIRMED** | Also reached from `MinimalJobWrapper.fail()` (`:1569`), which `BaseJobRunner.prepare_job` calls on **parameter-validation** failure (`runners/__init__.py:311-317`). Wider blast radius than stated |
| C4 | GIL rebuttal: in-process 0.494 s vs job subprocess 3.800 s; tool 0.013 s; `metadata/set.py` 3.787 s | agent 1 | **CONFIRMED (re-run), conclusion intact, cause restated** | Re-ran `exp/e13_timing.py`: 0.487 / 3.693 / 0.014 / 3.679. But 4b is a *residual* and 4a is a warm re-run without `_galaxy_setup_environment`. Direct measurement: bare `python -c pass` = **0.02 s**; `python -c "import galaxy.metadata.set_metadata"` = **3.65 s**. So the 3.7 s is **Galaxy module import inside the metadata subprocess**, not "Python interpreter startup" (agent 1's §Q12 wording). That matters: it is fixable, interpreter startup is not |
| C5 | Thread counts 1 / 6 / 14 | brief, quoting agent 1 | **PARTLY REFUTED (brief mis-transcribed)** | Measured: `GalaxyManagerApplication` + 6 additions = **1** thread, build 1.97–2.39 s. `UniverseApplication` = **12** threads (11 + main), build 2.57 s, `shutdown()` 0.01 s → 1. `build_galaxy_web_app` = 14 (agent 1, not re-run). The "6" is the async job path (2 handler monitors + 4 `LocalRunner.work_thread-*`), not an app |
| C6 | `render_tool_script` byte-identical to `__externalize_commands` across strict_shell × integrity | agent 2 | **CONFIRMED (by construction)** | `command_factory.py:194` is the identical f-string |
| C7 | Dependency resolution works with no toolbox and no job config | agent 2 | **CONFIRMED, but their evidence was GalaxyPackage, not conda** | Their fiona case exercised a hand-made `env.sh`. See §D for a real conda run |
| C8 | `Tool.build_dependency_shell_commands` hard-codes `self.app.toolbox.dependency_manager` | agent 2 | **CONFIRMED** | `tools/__init__.py:2593-2597` |
| C9 | sqlite 175 / sessionless 172, zero tools where sessionless wins | agent 2 | **CONFIRMED (175→176 on re-run); 172 PARTLY CONFIRMED** | Re-ran their sweep: 176 OK. `sweep3_*.json`: sqlite_iso 175, sessionless **169 raw**. `ob - oa` = **∅** — no tool sessionless handles that sqlite does not. The 6-tool delta: 3 object-store harness (`FileNotFoundError .../database/tmp`, their claimed fix → 172), 3 structural (`expression_pick_larger_file` → `create_time` `None`; `select_optional`(+`_legacy`) → `scalars()` returns `None`). The 172 re-run is not in the saved artifacts; the structural classification checks out |
| C10 | `SessionlessContext.scalars()` returns `None`; `filter_by` is a stub | agent 2 / recon | **CONFIRMED** | `model/store/__init__.py:233-234` (body `pass`), `:249-251` |
| C11 | `MockApp` scores 162/225 and is 55× slower | agent 2 | **CONFIRMED (162)** | `sweep3_sqlite.json` (= `mock_app_for_tool_support`) → 162 OK. Timing not re-measured |
| C12 | Promoting the `test_evaluation.py:246` stub to `LocalDirectoryComputeEnvironment` lets the ~20 existing tests "pass unchanged" | agent 2 (phase 2) | **REFUTED** | Executed: copied `test_evaluation.py` to scratch, swapped the stub for agent 2's proposed shape, ran pytest → **4 failed, 12 passed**. Failures: `test_evaluation_with_path_rewrites_wrapped/_unwrapped`, `test_arbitrary_path_rewriting_wrapped/_unwrapped`. The stub exists to test `DatasetPath(..., false_path=…)` (`:139-140`) and `unstructured_path_rewrites={"/old": "/new"}` (`:187`) — exactly what a local-directory CE drops. Also it is **16** tests, not ~20. Consequence: the stub cannot be deleted, so "two in-tree consumers" for the promoted class does **not** come from the test suite |
| C13 | `output_names()` has exactly one in-tree caller, Pulsar | agent 2 | **CONFIRMED** | `grep -rn "output_names()" lib/` → `jobs/runners/pulsar.py:439` only |
| C14 | Interactor hot path = 10 methods + `uploads` + `_post`; annotations at :205/:252/:1755; only `Protocol` in `verify/` is `TestConfig` :1707 | recon + agent 1 | **CONFIRMED** | `grep -o "galaxy_interactor\.[a-zA-Z_]*"` → exactly those 12, `wait_for_job` ×3; annotations confirmed at `interactor.py:205,252,1755`; `Protocol` only at `:33` (import) and `:1707` |
| C15 | Planemo imports no `galaxy.app`/`galaxy.jobs`/`galaxy.model`/`galaxy.webapps` | both | **CONFIRMED** | Planemo master `d3ce9bfe`: 55 × `galaxy.tool_util`, 29 × `galaxy.util`, nothing else. `grep` for the four modules → empty |
| C16 | Planemo also imports `galaxy.containers` and `galaxy.job_config` | agent 1 (Q10) | **REFUTED** | No such imports anywhere in `planemo/` |
| C17 | Planemo line refs `engine/galaxy.py:141,161`, `factory.py:30-48`, `config.py:386,525`, `pyproject.toml:72-77` | agent 1 | **CONFIRMED against PR #1701 worktree** | All exact at `a9a48ca5`. On master they are `:102,:120` — cite the PR worktree explicitly to avoid confusion |
| C18 | The `tool.handle_input` path never imports `galaxy.webapps` | agent 1 | **PARTLY CONFIRMED** | `verify/pkg.py`: `galaxy.webapps modules imported: []`, `fastapi: False`. But `uvicorn: True`, `starlette: True` — third-party ASGI libs still land in `sys.modules` transitively. The Galaxy-package layering claim holds; the "no web machinery at all" implication does not |
| C19 | `prepare_job` *asserts* state QUEUED | agent 1 (Q4) | **PARTLY REFUTED** | `runners/__init__.py:295-297` is `elif job_state != QUEUED: log.info(...); return False` — a silent skip, not an assert. A driver that forgets `enqueue()` gets `False`, not a traceback |
| C20 | `DefaultJobDispatcher.__init__` loads plugins but starts no threads | agent 1 | **CONFIRMED** | Observed: 1 thread throughout every run that built a dispatcher without `start()` |
| C21 | `register_postfork_function` runs the function immediately | recon | **CONFIRMED** | `web_stack/__init__.py:46-48` |
| C22 | `galaxy-remote-tool-eval` console-script precedent; `galaxy-tool-test` exists | both | **CONFIRMED** | `packages/app/pyproject.toml:104`; `packages/tool_util/pyproject.toml:75`. Note `galaxy-tool-test-case-validation` at `:76` — multi-word suffixes are precedented |
| C23 | `DEFAULT_JOB_SHELL = "/bin/bash"`; `strict_shell` is a tool property defaulting True for profile ≥ 20.09 | brief errata / agent 2 | **CONFIRMED** | `jobs/__init__.py:143`, `:1211-1213`; `tool_util/parser/xml.py:683-690` |
| C24 | "Both shebang and `set -e` are derivable from the tool alone" | brief errata | **PARTLY REFUTED** | `set -e` yes. The shebang is `job_destination.shell or config.default_job_shell or DEFAULT_JOB_SHELL` (`jobs/__init__.py:1202-1203`) — a *destination/config* value. Without a destination you fall back to `/bin/bash`; you do not derive it from the tool |
| C25 | Env-var trap: `env_config_directory()` → `"$_GALAXY_JOB_DIR"`; `env_to_statement` reused by `get_job_file` | brief errata | **CONFIRMED** | `compute_environment.py:163-165`; `runners/__init__.py:516,518` |

---

## D. Conda / dependency resolution in-process — **NOT A BLOCKER**

`verify/conda_check.py`, real conda prefix `~/miniforge3`, `conda_auto_init: False`,
`conda_auto_install: False`, **no toolbox, no job config, no network**:

```
build_dependency_manager: 0.003s
resolvers: [ToolShedPackage, GalaxyPackage, Conda, GalaxyPackage, Conda]
--- coreutils@9.5   resolver: MergedCondaDependency exact: True
    shell_commands: ['[ "$(basename "$CONDA_DEFAULT_ENV")" = ... ] || { ... . '~/miniforge3/bin/activate' '~/miniforge3/envs/__coreutils@9.5' ... }']
--- fastqc@0.12.1   resolver: MergedCondaDependency exact: True   (same shape)
--- coreutils@8.31  resolver: MergedCondaDependency exact: False  -> falls back to __coreutils@_uv_
```

**Verdict: conda resolution works in-process, toolbox-free, in 3 ms, and emits the real activation
block.** It is `galaxy.tool_util.deps` — pure filesystem + subprocess — and behaves identically in
or out of process. It undermines neither plan.

Two real hazards, both now pinned down:

1. **Network at startup — CONFIRMED and then fixed.** `_configure_toolbox()` → `_init_container_finder()`
   (`app/__init__.py:403,483-501`) passes `involucro_auto_init` and triggers a **7.4 MB download of
   involucro from GitHub** on first run (`a_sweep.err:2945-2947` — it happened in my run too).
   `involucro_auto_init: false` **fully suppresses it** (`verify/errrep.py`: zero involucro log
   lines). That answers agent 1's open question. Download target is
   `<tool_dependency_dir>/involucro` (`config_schema.yml:757-761`, `path_resolves_to: tool_dependency_dir`)
   — it never touched the Galaxy worktree.
2. **`Tool.build_dependency_shell_commands` needs a toolbox** (C8). Moot on the unified path.

Agent 1's observation that `cat1`'s `coreutils` requirement silently no-op'd is explained: no
`tool_dependency_dir` existed, so the resolver list was empty — which is exactly what real Galaxy
does with dependency resolution off. Not a defect.

---

## E. Claims I could not verify

1. **Linux, PostgreSQL, non-local runners.** Everything ran on macOS 15 (arm64) / Python 3.12 /
   sqlite / `LocalJobRunner`. `DB-SKIP-LOCKED` is unavailable on sqlite and falls back to
   `DB_TRANSACTION_ISOLATION`; handler assignment may behave differently on PostgreSQL.
2. **Containers.** No Docker/Singularity job run. `container.containerize_command`
   (`command_factory.py:114`) and `container.source_environment` (`:192-193`) untested on either path.
3. **`verify_tool` was never executed** by any of the three agents. Agent 1's Phase 4 rests on a
   call-site grep (which I confirmed exhaustively, C14) and on the claim that the assertion logic is
   interactor-parameterised — **read, not run**.
4. **Byte-fidelity against a real Galaxy server** was never measured by anyone. My A6 artifact is
   faithful *by construction* (same evaluator, same f-string, same `env_to_statement`), which is
   stronger than agent 2's prototype but still not a diff against a job a live Galaxy ran.
5. **Agent 2's "172 OK on sessionless after the object-store fix"** — the fixed re-run is not in the
   saved artifacts; I measured 169 raw and confirmed the 3-tool cause by traceback.
6. **`build_galaxy_web_app` = 8.49 s / 14 threads** (agent 1) — not re-run.
7. **`a2wsgi` → `httpx.WSGITransport` transport injection** — not built by anyone. Agent 1's
   sync/async reasoning about `httpx.ASGITransport` was not re-checked.
8. **`test/unit/app/jobs/test_runner_local.py`** has 2 pre-existing failures in this venv
   (`test_galaxy_lib_on_path`, `test_timelimit_kills_job`); 58 of 60 tests pass across
   `test_evaluation.py` + `test_command_factory.py` + `test_runner_local.py`. I did not diagnose the
   two, and did not run the full unit suite — so "the Phase 1 refactor is non-breaking" remains
   unproven.
9. **Collections and composite datatypes** on either path — 25 `NotImplementedError` in both sweeps
   is a count of what the harnesses refused, not a measurement of difficulty.
10. **Package installation layering** — I showed `galaxy.webapps` is never imported from a source
    checkout; nobody has installed `galaxy-app` alone from `packages/app/` and run the path.
11. **Timings are single- or double-sample on one warm laptop.** The 10 s vs 4.4 s and 90 s vs 40 s
    gaps survive noise; sub-second differences do not.

---

## F. Worktree cleanliness (final)

```
/Users/jxc755/projects/repositories/galaxy-embedded-research        git status --porcelain -> (empty)
/Users/jxc755/projects/repositories/planemo                          git status --porcelain -> (empty)
.../embedded_galaxy_in_planemo/planemo-installed-galaxy-gravity      git status --porcelain -> (empty)
```
