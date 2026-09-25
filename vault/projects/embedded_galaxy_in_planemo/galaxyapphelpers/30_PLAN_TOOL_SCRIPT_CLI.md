# 30 — PLAN: tool-test → tool-script CLI

Author: planning agent 2. Date: 2026-09-16.
Substrate: `/Users/jxc755/projects/repositories/galaxy-embedded-research` @ `c6c3b6df49`. Every `file:line` is
against that tree. Planemo PR #1701 worktree: `.../planemo-installed-galaxy-gravity` @ `a9a48ca5`.

**Most claims here were executed, not read.** A throwaway venv (`uv venv --python 3.12` +
`uv pip install -r requirements.txt`) with `PYTHONPATH=<worktree>/lib` was built in a scratch dir; a
prototype (job synthesis → `ToolEvaluator.build()` → emitted script) was run against **every tool in
`test/functional/tools/`** on three substrates. Nothing in any Galaxy or Planemo worktree was modified.
Where a claim is read-only, it says so.

---

## 0. TL;DR

- **Cut line**: emit a *directory*. `tool_script.sh` is byte-faithful to `command_factory.__externalize_commands`
  (`command_factory.py:170-213`). The `export` preamble that the *job* script owns goes in a **sibling
  `env.sh`**, never inside `tool_script.sh`. `run.sh` composes them.
- **Env-var trap resolved by one method override**, not by post-processing:
  `ComputeEnvironment.env_config_directory()`. `SharedComputeEnvironment` returns the literal
  `"$_GALAXY_JOB_DIR"` (`compute_environment.py:163-165`); a local compute environment returns the real
  absolute directory, so the backtick expressions Galaxy already generates (`evaluation.py:859-861`) are
  self-resolving. The preamble itself is produced by reusing `env_to_statement`
  (`jobs/runners/util/env.py:4`) — the same function `BaseJobRunner.get_job_file` uses at
  `runners/__init__.py:518`. **Zero duplicated logic.**
- **Substrate: real in-memory sqlite**, on a *lean* app (not `MockApp`). Measured: 70 ms to construct.
  Executed sweep over 225 tool tests: **sqlite 175 OK, `SessionlessContext` 172 OK, and zero tools where
  `SessionlessContext` wins.** The whole 3-tool gap is two structural breaks, both captured as tracebacks.
- **Two new reusable abstractions**, both module-level, no new package:
  `render_tool_script()` (pure, factored out of `command_factory`) and
  `LocalDirectoryComputeEnvironment` (promoted out of `test/unit/app/tools/test_evaluation.py:246`).
- **No package split.** `galaxy-tool-script` console script in `galaxy-app`, sibling to
  `galaxy-remote-tool-eval` (`packages/app/pyproject.toml:104`).
- **Ask #1 and ask #2 do NOT share a substrate.** Evidence in §5. They share three *modules*, not a
  foundation. "#2 first" buys ask #1 roughly one afternoon.

---

## 1. Answers to the 11 open questions

### Q1 — SessionlessContext, real model mapping, no-session, or DictImportModelStore?

**Answer: real in-memory sqlite.** Executed, not argued.

**Method.** A prototype pipeline — `parse_tool_test_descriptions` → stage inputs as HDAs →
`tool.expand_incoming` → `tool.params_to_strings` → synthesized `Job` → `ToolEvaluator.set_compute_environment`
→ `build()` — was run against every `test/functional/tools/*.xml` on three substrates. Crucially, the
sqlite and sessionless arms use **the same app class**, differing only in `self.model`. (A first pass used
`MockApp` for sqlite; that confounded session semantics with app completeness, so it was redone.)

| Substrate | What it is | Result over 225 tool tests |
| --- | --- | --- |
| **A. no session** (`app.model = None`) | `test_evaluation.py:53-57` shape | **Dead.** Fails immediately: `WorkRequestContext.sa_session` → `return self.app.model.session` → `AttributeError: 'NoneType' object has no attribute 'session'`. Reached for *every* tool, because `ToolEvaluator._validate_incoming` builds a `WorkRequestContext` unconditionally (`evaluation.py:385-387`). |
| **B. `SessionlessContext`** (`model/store/__init__.py:223`) | what Pulsar uses | **172 OK** (169 raw; see below) |
| **C. real in-memory sqlite** (`init("/tmp", "sqlite:///:memory:", create_tables=True)`, `model/unittest_utils/data_app.py:111`) | | **175 OK** |

**C strictly dominates: there is no tool that B handles and C does not.** The raw sweep showed a 6-tool
delta; three of those (`discover_metadata_files`, `metadata_bam`, `vcf_bgzip`) were my own harness omitting
`setup_global_object_store_for_models`, and **pass on B once that is fixed** (re-run, confirmed). So the
honest comparison is **175 vs 172**, and the entire remaining gap is **two structural mechanisms** that no
amount of config repairs:

1. **`SessionlessContext.scalars()` returns `None`** (`model/store/__init__.py:233-234`, body is `pass`).
   Breaks any `genomebuild` select. Captured traceback (`select_optional.xml`, `select_optional_legacy.xml`):

   ```
   evaluation.py:180 set_compute_environment
   evaluation.py:393 _validate_incoming
   parameters/basic.py:1074 from_json → :1079 _select_from_json → :1320 get_legal_values
   parameters/basic.py:1349 _get_dbkey_names
   managers/dbkeys.py:99  for dataset in datasets:      # datasets = scalars(...) -> None
   TypeError: 'NoneType' object is not iterable
   ```

2. **No ORM column defaults.** `create_time` / `update_time` are never populated, so anything calling
   `HistoryDatasetAssociation.to_dict()` dies. Captured traceback (`expression_pick_larger_file.xml`):

   ```
   evaluation.py:215 set_compute_environment → :232 execute_tool_hooks
   tools/__init__.py:3286 exec_before_job
   parameters/wrapped_json.py:29 json_wrap → :135 → :198 _hda_to_object
   model/__init__.py:6466  create_time=hda.create_time.isoformat(),
   AttributeError: 'NoneType' object has no attribute 'isoformat'
   ```

   This is the whole `expression` / `GalaxyExpressionTool` family, not one tool.

**Both failures are inside `ToolEvaluator.set_compute_environment`** — i.e. in the part of the pipeline the
CLI cannot rewrite, not in synthesis code we control. That is what makes them disqualifying rather than
annoying.

**There is a third, earlier B failure** worth recording because it constrains the design: with a history on
the request context, `_populate_state_legacy` calls `input.get_initial_value(...)` **unconditionally for
every input** (`parameters/__init__.py:590`); for a `DataToolParameter` that runs
`history.paginated_active_visible_datasets()` (`parameters/basic.py:2136`, `:1983-1988`) →
`required_object_session(self)` (`model/__init__.py:4196`, raising at `:269`). So **every tool with a `data`
input** fails on B unless `trans.history` is `None` during synthesis. That workaround is only half
effective: the evaluator *rebuilds its own context from `job.history`* (`evaluation.py:385-387`), which is
exactly why `select_optional` still breaks. B forces an asymmetry the CLI cannot fully control.

**The cost argument for B collapses under measurement.** The objection to sqlite is startup. Measured:

```
import GalaxyDataTestApp        2.51 s   (module import - unavoidable, shared by all substrates)
construct GalaxyDataTestApp     0.07 s   (in-memory sqlite + create_tables + object store + datatypes)
construct 2nd                   0.05 s
full tool-test → build() run    0.11 s
```

**70 ms.** For comparison, `mock_app_for_tool_support()` (`app_unittest_utils/tools_support.py:29`) takes
**3.85 s** — that cost is `MockApp`'s di container and manager graph, not sqlite. The real import cost
(2.5 s) is identical for every substrate.

**`MockApp` is rejected too**, on three grounds: it is 55x slower to construct (3.85 s vs 0.07 s); its own
module docstring calls it an anti-pattern (`app_unittest_utils/tools_support.py:1-4`); and it hard-codes a
datatypes registry the caller cannot replace — `GalaxyDataTestApp.init_datatypes` does
`Registry(); load_datatypes()` with no config (`model/unittest_utils/data_app.py:122-127`), i.e. the 35-extension
set. The same sweep scores **162 OK on `MockApp` vs 175 on the lean sqlite app**; that gap is *partly* the
datatypes registry (which my harness could inject into the lean app but not into `MockApp`) and partly
`MockAppConfig` paths (`new_file_path`, `tool_data_path`) fighting the CLI's. I did not decompose the 13-tool
gap — but "cannot be given a real datatypes config without patching it" is on its own disqualifying for a
shipped console script.

**`DictImportModelStore` / `get_import_model_store_for_dict` (`model/store/__init__.py:1556,1604`): rejected.**
It *constructs* a `SessionlessContext` (`imported_store_for_metadata` asserts exactly that,
`remote_tool_eval.py:86-87`), so it inherits every defect above **plus** it requires synthesizing the
model-store serialization format — a strictly larger authoring burden for a strictly worse substrate. Its
value in the Pulsar flow is *transporting* a graph a real Galaxy already built; we have no such graph.

**What the chosen app must supply**, empirically (everything the sweep needed on top of `MinimalToolApp`,
`structured_app/__init__.py:101`):

| Member | Why | Evidence |
| --- | --- | --- |
| `model` (real `GalaxyModelMapping`) | `WorkRequestContext.sa_session`, `_validate_incoming`, `_materialize_objects` | Q1 above |
| `datatypes_registry` **loaded from a real config** | `Registry().load_datatypes()` with no config registers only **35** extensions; with `config/datatypes_conf.xml.sample` it registers **793**. Without it, `png`, `zip`, `tar`, `bcf`, `biom1`, `fastqsolexa`, `tiff`, `vcf_bgzip`, `fasta.gz` are all unknown | executed |
| `tool_data_tables` **loaded from a real config** | loading `test/functional/tool-data/sample_tool_data_tables.xml` moved the sweep from **137 → 162 OK**. Without it every `options from_data_table` select fails `"requires a value, but no legal values defined"` | executed |
| `object_store` | metadata temp files (`MetadataTempFile`); 3 tools fail without `setup_global_object_store_for_models` | executed |
| `security` (`IdEncodingHelper`) | `param_dict["__history_id__"]` at `evaluation.py:261-262`. Note `remote_tool_eval.ToolApp` sets `security = None` (`:72`) and therefore cannot support `$__history_id__` | read |
| `genome_builds`, `file_sources`, `config`, `execution_timer_factory` | `_get_dbkey_names`, `get_file_sources_dict`, `expand_incoming`'s timer | executed |

### Q2 — Exactly what must a synthesized `Job` carry?

Definitive list, from `evaluation.py` and `model/__init__.py:1924`, with what a tool test can supply.

| Field / relationship | Where read | From the test? |
| --- | --- | --- |
| `job.parameters` → `[JobParameter(name, value)]`, values are `params_to_strings` JSON | `evaluation.py:172` | **Yes** — `tool.params_to_strings(params, app)` (`tools/__init__.py:2535`), exactly as `DefaultToolAction._record_inputs` does at `actions/__init__.py:1077` |
| `job.input_datasets` → `JobToInputDatasetAssociation(name, dataset=HDA)` | `io_dicts`, `model/__init__.py:1925` | **Yes** — one HDA per `testdef.test_data()` entry |
| `job.output_datasets` → `JobToOutputDatasetAssociation(name, dataset=HDA)` | `io_dicts`, `:1926` | **Invented** — one HDA per `tool.outputs`, path under `<wd>/outputs/` |
| `job.history` | `_history`, `evaluation.py:1005`; `__history_id__` `:261` | **Invented** — a throwaway `History` |
| `job.tool_id` | `evaluation.py:280` (`upload1` special case) | **Yes** |
| `job.user` | `_user`, `evaluation.py:1012`; `User.user_template_environment` `:208` | **Invented** — `None` works; `$__user_email__` etc. become the anonymous defaults |
| `job.galaxy_session` | `evaluation.py:386` | **Invented** — `None` |
| `job.tool_state` | `evaluation.py:219-220`, only when `param_dict_style != "regular"` | **Yes, for YAML tools** — `JobInternalToolState` from `expand_incoming_async` (see Q7). Real Galaxy sets it at `tools/execute.py:329` |
| `job.credentials_context_associations` | `evaluation.py:999` | **Invented** — `[]`; only touched if `tool.credentials` |
| `job.interactivetool_entry_points` | `evaluation.py:838` | **Invented** — `[]`; only for `inject="entry_point_path_for_label"` |
| `job.input_dataset_collections` / `..._elements` | `evaluation.py:1091-1093` | **Yes in principle, out of v1** (Q8) |
| `job.input_library_datasets`, `output_library_datasets`, `output_dataset_collection_instances`, `output_dataset_collections` | `model/__init__.py:1927-1955` | **Invented** — empty |

**Verified by construction**: the prototype sets only `tool_id`, `history`, `parameters`, `input_datasets`,
`output_datasets` (+ `tool_state` for YAML tools) and clears 175/225 tool tests. `id`, `create_time`,
`update_time`, `state` come free from the ORM — which is Q1's point.

### Q3 — `JobIO`/`SharedComputeEnvironment`, or a hand-rolled `ComputeEnvironment`?

**Hand-rolled — and promote it to the library** as
`galaxy.job_execution.compute_environment.LocalDirectoryComputeEnvironment`.

`JobIO` is rejected on evidence: `JobIO.compute_outputs` asserts `dataset.id is not None`
(`job_execution/setup.py:271`) and does `sa_session.query(JobExportHistoryArchive).filter_by(job=job).first()`
(`:288`) — the exact call `SessionlessContext.filter_by` stubs out (`model/store/__init__.py:249-251`). More
decisively, `JobIO` is a *job* abstraction: it carries `tool_data_path`, `len_file_path`, `galaxy_url`,
`user_context`, `home_directory`, `tmp_directory`, object-store config. Rehydrating it means inventing
job-level policy the ask explicitly excludes. `test_evaluation.py:246` already proves the evaluator does not
need it.

**The promoted class is smaller than the test stub it replaces.** Measured: replacing the stub's
identity-keyed path dicts with `return dataset.get_file_name()` (correct because
`Dataset(external_filename=path)` makes `get_file_name()` authoritative for both inputs and outputs) changed
the sweep result **not at all** (175 both ways). The shipped class needs only a working directory, a tool
directory and a galaxy URL.

The evaluator touches 11 of the 18 `ComputeEnvironment` members (`grep compute_environment\. evaluation.py`):
`get_file_sources_dict` (`:177`), `working_directory` (`:254`, `:1082`), `galaxy_url` (`:263`),
`tool_directory` (`:635`, `:790`), `new_file_path` (`:643`), `version_path` (`:792`),
`env_config_directory` (`:860`), `home_directory` (`:866`), `tmp_directory` (`:869`),
`config_directory` (`:972`), `sep` (`:980`) — plus the five `*_rewrite` methods via the wrappers.
`output_names()` has exactly one in-tree caller and it is Pulsar (`jobs/runners/pulsar.py:439`).

**In-tree callers after promotion — honestly, two:**
1. `test/unit/app/tools/test_evaluation.py:246-302` — 57 lines deleted, ~20 existing tests keep passing unchanged.
2. the tool-script CLI.

Two consumers is exactly the bar `01_UPSTREAM_CONSTRAINTS.md` records ("Split into a library only after the
boundary is stable and there is a second real consumer"), and this is a **module** promotion inside
`galaxy-data`/`galaxy-app` — it adds no release boundary, so the standing bias does not apply.
Ask #1 is a plausible third consumer but must not be assumed (§5).

**The one method that matters** is `env_config_directory()`. See Q5.

### Q4 — How much of `set_metadata` / sniffing must run?

**Run `datatype.set_meta(hda)` per input dataset. It is not optional.** Executed proof, `column_param_configfile.xml`:

```
# without set_meta
NO_SET_META 11.tabular interval columns= 3
AssertionError: param errors: [{'col': ParameterValueError(
    "Parameter 'col': an invalid option ('11') was selected (valid options: 2,1,3)")}]

# with datatype.set_meta(hda)
SET_META 11.tabular interval columns= 11 column_types= ['int' x 11]
COMMAND_LINE: python '<wd>/configs/tmppdsk0sov' inputs.json
<wd>/working/inputs.json  ->  {"col": [11], "col_mult": [1, 2, 3]}
```

`columns == 3` is the `interval` datatype's metadata-spec `no_value`, surfaced by
`DatasetFilenameWrapper.MetadataWrapper.__getattr__` (`wrappers.py:313-332`). The recon's claim that
metadata is "not strictly required" is true for *command-line templating* but **false for parameter
validation**: `data_column` / `options from_dataset` / `<validator>` all consult metadata during
`expand_incoming`, and a wrong `no_value` produces a hard `ParameterValueError`, not a quietly wrong string.

**Choose `datatype.set_meta(hda)` directly**, not `set_metadata_portable`. `set_metadata_portable`
(`metadata/set_metadata.py:190`) is the job-script-side entry point: it reads `metadata_params` JSON, a
model-store export and an object-store config out of a *prepared job working directory*. None of that
exists here. `set_meta` is the underlying call and it worked on every tool in the sweep given a real
object store (required for `MetadataTempFile`-based datatypes: BAM, BCF, VCF.gz — 3 tools failed without
`setup_global_object_store_for_models`).

**Sniffing: `guess_ext` (`datatypes/sniff.py:315`), not `handle_uploaded_dataset_file`.** Tests usually carry
`ftype=`; when `ftype` is absent (`test_data_iter` defaults to `"auto"`, `interactor.py:2318`) `guess_ext`
suffices and costs one pass over the file. `handle_uploaded_dataset_file` (`:878`) additionally does
decompression, conversion and link-vs-copy policy — upload-tool behaviour, out of scope. **Caveat found:**
`guess_ext` returned `interval` for `11.tabular` where the tool declares `format="tabular"`; that is what
real Galaxy's upload does too, and it validated fine, but it means the CLI should prefer an explicit
`ftype` and only sniff as fallback.

### Q5 — What exactly does the CLI emit? (load-bearing)

**Option (c): a directory — but with (a) preserved byte-exactly inside it.**

```
<outdir>/
  tool_script.sh        # byte-identical to command_factory.__externalize_commands (:194)
  env.sh                # the job script's contribution, isolated
  run.sh                # . ./env.sh ; cd working ; exec /bin/sh ../tool_script.sh
  manifest.json         # inputs, outputs, config files, env-var value files
  configs/              # _build_config_files output (evaluation.py:794-814)
  working/              # cwd for the tool; explicit-filename configs hard-linked here (:806-810)
  outputs/              # synthesized output dataset paths + COMMAND_VERSION
  tool_env_XXXXXXXX     # env-var value files (evaluation.py:849-850)
```

Executed end to end on `environment_variables.xml` (profile 16.01, so `parse_strict_shell()` returns False
and there is no `set -e`; a profile ≥ 20.09 tool gets `set -e` as line 2 — see the correction at the end of
this answer):

```
--- tool_script.sh (nothing added; exactly what Galaxy writes)
#!/bin/bash
echo "$INTVAR"  >  <wd>/outputs/dataset_out_file1.dat; echo "$FORTEST" >> ...; echo "$IFTEST"  >> ...;

--- env.sh
INTVAR=`cat "<wd>/tool_env_cgpklkjm"`; export INTVAR
FORTEST=`cat "<wd>/tool_env_fsj9d2uv"`; export FORTEST
IFTEST=`cat "<wd>/tool_env_uf3_jd_8"`; export IFTEST
HOME="<wd>/home"; export HOME
TMPDIR="<wd>/tmp"; export TMPDIR
TMP="<wd>/tmp"; export TMP
TEMP="<wd>/tmp"; export TEMP

$ sh <wd>/run.sh ; echo exit=$?
exit=0
$ cat <wd>/outputs/dataset_out_file1.dat
2
moo

NOTTHREE
```

`2 / moo / NOTTHREE` are exactly the test's `<has_line>` assertions.

**Why not (a) alone, and why not (b).** (a) is not runnable: the exports live in the job script
(`runners/__init__.py:508-527`, `envs.extend(job_wrapper.environment_variables)` at `:516`). (b) —
inlining the preamble into `tool_script.sh` — makes the artifact runnable but **destroys the very property
Q11 asks us to test**, since Galaxy's `tool_script.sh` never contains exports. Splitting gives both.

**How the env-var trap is actually resolved — one method, no new logic.**
`_build_environment_variables` writes each value to a real local file
(`evaluation.py:849-850`, `prefix="tool_env_"`, `dir=self.local_working_directory`) and sets

```python
environment_variable["value"] = f'`cat "{self.compute_environment.env_config_directory()}/{basename}"`'   # :859-861
environment_variable["raw"] = True                                                                        # :863
environment_variable["job_directory_path"] = config_filename                                              # :864
```

`SharedComputeEnvironment.env_config_directory()` returns the literal string `"$_GALAXY_JOB_DIR"`
(`compute_environment.py:163-165`) — a variable only the job script defines. **A local compute environment
returns the real absolute working directory instead, and the backtick expression becomes self-resolving.**
Confirmed in the emitted `env.sh` above: `` `cat "/var/folders/.../tsc_.../tool_env_cgpklkjm"` `` runs.
`env_to_statement` (`jobs/runners/util/env.py:4`) then turns the dicts into `NAME=…; export NAME` — the
identical call `get_job_file` makes at `runners/__init__.py:518`. `job_directory_path` (`:864`) is the
escape hatch if a fully literal preamble is ever wanted; we do not need it.

**Dependency-resolution commands: emit them, opt-in, default off.** They *are* inside the tool script
(`command_factory.py:239-243`), so a faithful artifact includes them. Executed:

```python
build_dependency_manager(app_config_dict={"tool_dependency_dir": None, ...})
#   resolvers: []   ->  dependency_shell_commands(...) == []

build_dependency_manager(app_config_dict={"tool_dependency_dir": <dir>, "conda_auto_init": False, ...})
#   resolvers: [ToolShedPackage, GalaxyPackage, Conda, GalaxyPackage, Conda]
#   -> ['PACKAGE_BASE=<dir>/fiona/1.8.6; export PACKAGE_BASE; . <dir>/fiona/1.8.6/env.sh']
```

(tool: `composite_shapefile.xml`, `<requirement type="package" version="1.8.6">fiona</requirement>`.)
So it works with **no toolbox and no job config**, via `galaxy.tool_util.deps.build_dependency_manager`
(`tool_util/deps/__init__.py:44`). With no `tool_dependency_dir` the list is empty, which is exactly what
real Galaxy produces with dependency resolution off — so "default off" is faithful, not a shortcut.
**Seam to note:** `Tool.build_dependency_shell_commands` hard-codes `self.app.toolbox.dependency_manager`
(`tools/__init__.py:2597`), so the CLI must call the manager directly or give the app a toolbox shim.
Also needs `app.config.preserve_python_environment` (`tools/__init__.py:1305`).

**`version_command_line`: include.** It is part of `get_command_line()`
(`jobs/__init__.py:2569-2573`: `f"{version_command_line or ''}{command_line}"`), so omitting it would make
the artifact non-faithful. Executed (`version_command_plain.xml`):
`VERSION="4.0.0"; echo "$VERSION" > <wd>/outputs/COMMAND_VERSION 2>&1;`.

**Correction to the recon.** `10_RECON.md:125` says the shebang is "`job_wrapper.shell`, default `/bin/sh`".
It is **`/bin/bash`** (`DEFAULT_JOB_SHELL`, `jobs/__init__.py:143`; used at `:1202-1203`). And `strict_shell`
is a *tool* property, not a job one — `jobs/__init__.py:1212-1213` returns `self.tool.strict_shell`, parsed
at `tool_util/parser/xml.py:683-690` where it **defaults True for profile ≥ 20.09**. Both are therefore
derivable from the tool alone, with no job destination. The CLI must honour them or its output diverges
from Galaxy's for every modern tool.

### Q6 — Reuse `__externalize_commands` or factor it?

**Factor it.** The prompt's second option is right, and it is verifiable rather than merely tasteful.

Reusing `__externalize_commands` means passing a `MinimalJobWrapper`-shaped object carrying
`working_directory`, `shell`, `strict_shell`, `dependency_shell_commands` and a `job_io` exposing
`check_job_script_integrity`, `check_job_script_integrity_count`, `check_job_script_integrity_sleep`
(`runners/util/job_script/__init__.py:150-154`). That is a duck-typed fake of the single heaviest class in
`lib/galaxy/jobs/` — and it would also *write the file*, which the CLI wants to control.

Proposed:

```python
def render_tool_script(shell, tool_commands, *, strict_shell=False,
                       integrity_injection="", source_command="") -> str:
    set_e = "set -e\n" if strict_shell else ""
    return f"#!{shell}\n{integrity_injection}{set_e}{source_command}{tool_commands}"
```

**Verified byte-identical** against the live `__externalize_commands` across its whole matrix (executed:
called `command_factory.__dict__["__externalize_commands"]` with a `Bunch` job wrapper, read back the file
it wrote, compared):

| `strict_shell` | `check_job_script_integrity` | match |
| --- | --- | --- |
| False | False | **True** |
| True | False | **True** |
| True | True | **True** |

`__externalize_commands` then keeps its remaining four jobs — resolving `container.source_environment`
(`:192-193`), `write_script` (`:195-199`, chmod + integrity self-test), the `shell == "none"` early return
(`:186-187`), and the Pulsar `script_directory` hack (`:207-209`) — and calls `render_tool_script` for the
string. Two callers immediately; the string shape stops being duplicable by construction.

### Q7 — Which evaluator subclass?

**Plain `ToolEvaluator` for XML tools; `UserToolEvaluator` for YAML/`base_command`/`shell_command` tools.**
Mirror `_get_tool_evaluator` (`jobs/__init__.py:1437-1444`) exactly.

- **`RemoteToolEvaluator` (`evaluation.py:1150`) is disqualified, not merely unsuitable.** Its `build()`
  (`:1159-1171`) omits `_build_environment_variables` — the single most load-bearing output of this CLI —
  and its `execute_tool_hooks` is `pass` (`:1155-1157`). Hooks are load-bearing too: the
  `expression_pick_larger_file` traceback in Q1 runs entirely inside
  `execute_tool_hooks → exec_before_job → json_wrap`, i.e. that path *builds* expression-tool input files.
- **`PartialToolEvaluator` (`:1015)`** builds only env vars. Wrong half.
- **`UserToolEvaluator` (`:1034`) works — verified, not assumed.** Executed on
  `test/functional/tools/cat_user_defined.yml` (`class: GalaxyUserTool`, `shell_command`), on the sqlite
  substrate:

  ```
  tool class: UserDefinedTool  shell_command: cat '$(inputs.input1.path)' > output.txt
  vsr: test_case_json  request: {'input1': {'class': 'File', 'path': 'simple_line.txt'}}
  errors: []
  COMMAND_LINE: cat '/…/test-data/simple_line.txt' > output.txt
  ```

  The route differs from XML tools: `param_dict_style = "json"` (`evaluation.py:1035`) sends
  `set_compute_environment` down the `job.tool_state` branch (`:218-227`), so synthesis must use
  `tool.expand_incoming_async(trans, RequestInternalDereferencedToolState({...}), None)`
  (`tools/__init__.py:2015-2074`) and set `job.tool_state = internal_states[0].input_state` — exactly what
  `tools/execute.py:329` does in production. That is a *second* synthesis path, which is why it is its own
  phase (§4, phase 7) rather than v1.

### Q8 — Multiple tests, collections, composite inputs, `location:` URIs

**Multiple tests: in scope, trivially.** `parse_tool_test_descriptions` returns one `ToolTestDescription`
per `<test>` (`verify/parse.py:74`); `--test-index N` / `--all`. Verified: the sweep addresses tests by
index.

**Collections: out of v1, fail loudly.** Largest single gap — **25 of 225** tools in
`test/functional/tools/` (plus 6 more whose *outputs* are collections). Today
`interactor._create_collection` POSTs `element_identifiers` to `/api/dataset_collections`
(`interactor.py:1011`), built recursively by `_element_identifiers` (`:1016-1036`), with each leaf resolved
through `self.uploads[element_def["value"]]` (`:1027`). Offline that means building
`DatasetCollection` / `DatasetCollectionElement` / `HistoryDatasetCollectionAssociation` graphs by hand and
threading them into `job.input_dataset_collections` (`evaluation.py:1091-1093`). Real work, orthogonal to
everything else; phase 9.

**Composite datatypes: out of v1.** 6 tools. `remote_to_input` maps `test_data["composite_data"]` to a list
of paths (`interactor.py:685-696`) which the fetch API assembles into an extra-files directory. Offline this
needs `datatype.writable_files` population into `hda.extra_files_path`. Observed failures:
`composite.xml`, `composite_output.xml`, `composite_output_tests.xml`, `metadata.xml` (test data absent),
`composite_pbed.xml`, `composite_shapefile.xml` (`ParameterValueError: … specify a dataset of the required format`).

**`location:` URIs: out of v1, but there is a cheap path.** 1 tool
(`remote_test_data_location.xml`). `run_tool`'s modern branch turns them into
`DataRequestUri(url=…, ext=…)` (`interactor.py:886-890`). **The evaluator already materializes deferred
datasets**: `_materialize_objects` (`evaluation.py:295-330`) walks `_deferred_objects` and calls
`materializer_factory(...).ensure_materialized(value)` for any HDA in `Dataset.states.DEFERRED`. So a
`location:` input could become a DEFERRED HDA with `source_uri` set and the evaluator would fetch it with
no new code. **Untested** (needs network); listed in §6.

**Scope summary of the 225-test sweep (sqlite substrate):**

| Outcome | n |
| --- | --- |
| Expanded a command line | **175** |
| Correctly *refused* — `expect_failure="true"` tests (`metadata_check_eq`, `validation_empty_dataset`, `validation_metadata_in_range`) and deliberately broken Cheetah (`cheetah_problem_*` ×3) | 6 |
| Collection inputs / outputs | 31 |
| Composite datatypes | 6 |
| Test data absent from the repo (`2.bigwig`, `4.maf`, `input_taxonomy.biom2`) | 3 |
| `location:` URI | 1 |
| Prototype config gaps (`filter_data_table` column spec, `metadata_bcf` temp path, `collection_nested_default`) | 3 |

**181/225 behaving correctly (80%)**, with the residue dominated by collections.

### Q9 — Where does the CLI live, and how does Planemo plug in?

**`galaxy-app`. No package split. Declined explicitly.**

- `ToolEvaluator` is in `galaxy-app` (`packages/app/pyproject.toml:18-33`). A `galaxy-tool-util` home is
  impossible without moving it, and moving it is a far larger change than this ask.
- The console-script precedent is exact: `galaxy-remote-tool-eval = "galaxy.tools.remote_tool_eval:main"`
  (`packages/app/pyproject.toml:104`). **Add `galaxy-tool-script = "galaxy.tools.tool_script:main"`** beside it.
- Planemo PR #1701 already declares `installed_galaxy = ["galaxy-app>=26.1,<26.2", …]`
  (PR worktree `pyproject.toml:72-77`), so the dependency edge exists and is paid for.
- `01_UPSTREAM_CONSTRAINTS.md` records a standing bias against new release boundaries
  ("Split into a library only after the boundary is stable and there is a second real consumer").
  There is no second consumer and no stable boundary. **Declining.**

**Galaxy side.** New module `lib/galaxy/tools/tool_script.py` exposing a supported API:

```python
def build_tool_script(tool_path, *, test_index=0, output_dir, test_data_dirs=None,
                      datatypes_config=None, tool_data_table_config=None,
                      dependency_resolution=None) -> ToolScriptResult
def main() -> None       # console-script entry point
```

**Planemo side: `planemo tool_script` (`planemo/commands/cmd_tool_script.py`).** Shape precedent
`cmd_lint.py` — it takes `optional_tools_arg`, does not serve Galaxy, and exits on a report. Planemo
contributes only adapter/policy, which is what `01_UPSTREAM_CONSTRAINTS.md` binds it to:

| Planemo supplies | Existing Planemo machinery |
| --- | --- |
| tool path(s), `--test_index` | `options.optional_tools_arg` |
| test-data directories | Planemo already resolves these for `planemo test` |
| conda prefix → `dependency_resolution` | `planemo/conda.py:53`, `planemo/deps.py:61-86`, `options.conda_prefix_option()` (`options.py:720`) |
| output dir / `--no_cleanup` | existing temp-dir policy |

**Naming caution.** `galaxy-tool-test` already exists (`packages/tool_util/pyproject.toml:75`) and is
Planemo-adjacent. `galaxy-tool-script` is one letter-group away from it in a list; if that is a concern,
`galaxy-expand-tool-script` disambiguates. Flagging rather than deciding.

**Planemo must not import `galaxy.tools` — shell out to `galaxy-tool-script`.** Today Planemo imports only `galaxy.util` and
`galaxy.tool_util` (verified: `grep -rn '^from galaxy\.' planemo/ | grep -v tool_util` returns only
`galaxy.util*`). A subprocess boundary keeps that true, and turns the missing-extra case into a clean
"command not found → install `planemo[installed_galaxy]`" instead of an `ImportError` thrown from inside
Galaxy's import graph. Importing the supported API would give better error messages, but preserving the
ownership split `01_UPSTREAM_CONSTRAINTS.md` binds us to matters more.

### Q10 — What does the developer actually do with the output?

`cd <outdir> && sh run.sh`. Executed, exit 0, correct output (Q5).

- **`cd working` is mandatory, not cosmetic.** `column_param_configfile`'s command line is
  `python '<wd>/configs/tmpXXXX' inputs.json` — a *bare relative* `inputs.json`, which exists only because
  `_build_config_files` hard-links explicit-filename configs into `<wd>/working` (`evaluation.py:806-810`).
  Galaxy's job script does this `cd` (`command_factory.py:128-131`); `run.sh` must too.
- **Requirements: the CLI does not resolve them by default.** Empty `dependency_shell_commands` means the
  emitted script runs against whatever is on `$PATH` — right for the "rapid tool development" loop, where
  the developer already has the tool installed. `--dependency-resolution conda` (Planemo passes its
  `conda_prefix`) prepends the resolver's own activation lines *inside* `tool_script.sh`, which is where
  Galaxy puts them (`command_factory.py:239-243`), so no external `conda run` wrapper is needed.
- **Containers: out of scope, and that is faithful.** Containerization happens at
  `command_factory.py:114` (`container.containerize_command`), outside the tool script. The only
  container-related thing *inside* is `container.source_environment` (`:192-193`), which
  `render_tool_script` accepts as `source_command` for a future caller.
- **Output dataset paths are `outputs/dataset_<name>.dat`**, not Galaxy's `dataset_<id>.dat`. Fidelity costs
  nothing — Q11's normalization already reads a dataset-path map out of the manifest rather than matching on
  filename — and `<name>` is what makes the directory readable, which is the point. Ids are not stable
  across runs anyway (throwaway sqlite sequence), so the id form would be less useful and no more reproducible.
- This is why (c) beats (a) and (b): the developer needs `configs/`, `working/` and the cwd convention,
  not just a string.

### Q11 — How to test byte-fidelity against real Galaxy

**Byte-identity is impossible for any tool with `<configfiles>` or `<environment_variables>`.** Determined
empirically by emitting twice from the same tool+test and diffing:

| Tool | raw diff | after normalizing workdir | after workdir + tmp basenames |
| --- | --- | --- | --- |
| `version_command_plain` (no configs) | differs | **identical** | identical |
| `environment_variables` | differs | **identical** | identical |
| `column_param_configfile` (`<configfiles>`) | differs | **still differs** (`configs/tmpblw8n016` vs `configs/tmpp6u4nbi_`) | **identical** |

**The complete normalization set is three token classes**, and no more:

1. the job working-directory prefix (every tool);
2. `configs/tmp########` — `tempfile.NamedTemporaryFile` at `evaluation.py:804` (tools with `<configfiles>`);
3. `tool_env_########` — `NamedTemporaryFile(prefix="tool_env_")` at `evaluation.py:849` (tools with
   `<environment_variables>`);
4. plus, when comparing against a *real* Galaxy, a dataset-path map (`database/objects/…/dataset_*.dat`
   → the emitted `outputs/dataset_<name>.dat`), taken from the manifest rather than guessed.

**Proposed test** — `test/integration/test_tool_script_fidelity.py`, an `IntegrationTestCase`:

1. Configure `cleanup_job: never` (the driver already wires this from `GALAXY_TEST_NO_CLEANUP`,
   `driver_util.py:181-183,224`).
2. Run the tool test through the existing driver and read `<job_dir>/tool_script.sh`.
3. Run `build_tool_script()` on the same tool + test index.
4. Normalize both with the four rules and assert equality.

**Pin against, tiered:**
- **exact match after workdir normalization only** — `version_command_plain.xml`, `version_command_tool_dir.xml`
  (both verified reproducible above, no configs, no env vars);
- **normalized diff** — `environment_variables.xml` (env vars), `column_param_configfile.xml`
  (configfile + `<inputs>` + `data_column`, so it also regression-guards Q4's `set_meta`), `cat1`-style
  data-in/data-out;
- **negative control** — assert that `tool_script.sh` contains **no** `export` statement, i.e. the artifact
  really is option (a) and the preamble really did land in `env.sh`.

Make step 2 a fixture so the same captured script can serve future fidelity assertions.

---

## 2. The chosen cut line, stated precisely

Against `lib/galaxy/jobs/command_factory.py`:

**IN the emitted `tool_script.sh`** (matching `__externalize_commands`, `:170-213`):
- `#!{shell}` — `tool.strict_shell`-aware; shell = `DEFAULT_JOB_SHELL` (`jobs/__init__.py:143`) unless overridden
- `{integrity_injection}` — off by default (`:186-188`)
- `set -e` when `tool_source.parse_strict_shell()` (`:189-191`; `parser/xml.py:683-690`)
- dependency-resolution commands (`:239-243`) — opt-in, default empty
- `version_command_line` then `command_line` (`jobs/__init__.py:2569-2573`)

**OUT of `tool_script.sh`, emitted as siblings:**
- `env.sh` — `environment_variables` via `env_to_statement`; Galaxy puts these in the job script
  (`runners/__init__.py:508-527`)
- `run.sh` — the `cd working` (`command_factory.py:128-131`) and the `. env.sh`

**OUT entirely, and not emitted at all:**
- containerization `:114`; stdout/stderr capture to `../outputs/tool_stdout|tool_stderr` `:121-124`;
  `remote_tool_eval` prepend `:133`, `:216-229`; container monitor `:135-136`; exit-code capture `:139`;
  CWL `relocate_dynamic_outputs` `:141-158`; `from_work_dir` copies `:160-161`, `:246-256`; metadata +
  `SETUP_GALAXY_FOR_METADATA` `:163-165`, `:259-298`; task-splitting `prepare_input_files_cmds` `:232-236`;
  the entirety of `DEFAULT_JOB_FILE_TEMPLATE.sh` (`GALAXY_SLOTS`, `GALAXY_MEMORY_MB`, TMP juggling,
  metrics instrumentation).

---

## 3. Chosen substrate

**Real in-memory sqlite** (`galaxy.model.mapping.init("/tmp", "sqlite:///:memory:", create_tables=True)`,
the call `GalaxyDataTestApp` makes at `model/unittest_utils/data_app.py:111`) behind a **purpose-built lean
tool app** in `lib/galaxy/tools/tool_script.py` — *not* `MockApp`, *not* `GalaxyDataTestApp` directly
(it lacks `security`-for-tools, `genome_builds`, `tool_data_tables`, `execution_timer_factory`).

Deciding evidence: Q1's two tracebacks (`model/store/__init__.py:233` `scalars() -> None`;
`model/__init__.py:6466` unset `create_time`), the 175-vs-172 sweep on an app that differs *only* in
`self.model`, and the 70 ms construction measurement that removes the cost objection.

**Rejected:** no-session (dies at `WorkRequestContext.sa_session` for every tool);
`SessionlessContext` (above, plus the `trans.history` asymmetry at `evaluation.py:385-387`);
`DictImportModelStore` (constructs a `SessionlessContext`, so inherits every defect and adds a
serialization format to author); `MockApp` (3.85 s, 162/225, self-described anti-pattern);
`JobIO`/`SharedComputeEnvironment` (job-level policy the ask excludes; `setup.py:271,288`).

---

## 4. Phased plan

Each phase is independently mergeable and independently useful. Red-to-green throughout.

### Phase 1 — `render_tool_script` (pure)
- **Change**: `lib/galaxy/jobs/command_factory.py` — add module-level `render_tool_script(...)`; make
  `__externalize_commands` (`:194`) call it.
- **Red**: `test/unit/app/jobs/test_command_factory.py` — new `TestRenderToolScript` asserting the three-row
  table in Q6 (`render_tool_script("/bin/sh", "echo hi", strict_shell=True) == "#!/bin/sh\nset -e\necho hi"`).
  Fails: `ImportError`.
- **Green**: extract. The existing 287-line `TestCommandFactory` suite must pass untouched — it is the
  regression net.
- **Reuses**: `INTEGRITY_INJECTION`, `write_script` (`runners/util/job_script/__init__.py:145`).
- **New abstraction**: `render_tool_script`. Second consumer arrives in phase 5.
- **Blast radius**: one function body. Verified byte-identical across the full flag matrix.

### Phase 2 — `LocalDirectoryComputeEnvironment` (promote out of `test/`)
- **Change**: `lib/galaxy/job_execution/compute_environment.py` — new class beside
  `SharedComputeEnvironment` (`:118`). Ctor `(working_directory, tool_directory, galaxy_url=…, home=…, tmp=…)`.
  `input_path_rewrite`/`output_path_rewrite` → `dataset.get_file_name()`. **`env_config_directory()` returns
  the real working directory** (contrast `:163-165`) — document that this is what makes the emitted env
  statements self-contained.
- **Red**: rewrite `test/unit/app/tools/test_evaluation.py` to import the library class and delete the local
  stub (`:246-302`). Fails: `ImportError`.
- **Green**: add the class. All ~20 existing evaluation tests pass unchanged.
- **Reuses**: `SimpleComputeEnvironment` (`:110`) for `config_directory` + `sep`.
- **New abstraction**: the class. Callers: the test suite (now), the CLI (phase 4). Two = the stated bar.
- **Blast radius**: one test file + one new class. Nothing in `lib/` imports the stub today.

### Phase 3 — job synthesis from a tool test
- **Change**: new `lib/galaxy/tools/tool_script.py` — a lean `ToolScriptApp` (sqlite mapping, datatypes
  registry from config, tool data tables from config, disk object store, `IdEncodingHelper`, `GenomeBuilds`)
  and `synthesize_job(app, tool, testdef, work_dir, test_data_resolver)`.
- **Red (primary)**: new `test/unit/app/tools/test_tool_script.py::test_synthesize_job_data_column_requires_set_meta`
  — assert the exact `ParameterValueError` from Q4 (`"an invalid option ('11') was selected"`) when
  `set_meta` is skipped, and the correct expansion when it is not. This is the one test in the plan guarding
  a finding a reviewer would not predict: missing metadata is a hard validation error, not a quietly wrong
  string. Lead with it.
- **Red (secondary)**: `::test_synthesize_job_version_command_plain` asserting the built `Job` carries 1
  input dataset, 1 output dataset and the expected `JobParameter` set for `version_command_plain.xml`.
- **Green**: implement. Must include `datatype.set_meta` per input (Q4) and `guess_ext` fallback.
- **Reuses**: `parse_tool_test_descriptions` (`verify/parse.py:61`), `TestDataResolver`,
  `create_tool_from_source` (`tools/__init__.py`), `Tool.expand_incoming` (`:2076`),
  `Tool.params_to_strings` (`:2535`), `Job.add_parameter`/`add_input_dataset`/`add_output_dataset` — i.e.
  the exact sequence `DefaultToolAction._record_inputs` uses (`actions/__init__.py:1077,1095`),
  `galaxy.model.mapping.init`, `build_object_store_from_config`, `datatypes.sniff.guess_ext`.
- **New abstraction**: `synthesize_job` — the "tool test → Job" builder. Candidate third consumer is ask #1,
  **but do not design for it** (§5).
- **Blast radius**: one new module. Nothing existing changes.
### Phase 4 — expand and emit
- **Change**: `tool_script.py` — `build_tool_script(...) -> ToolScriptResult`; writes `tool_script.sh`,
  `env.sh`, `run.sh`, `manifest.json`, `configs/`, `working/`, `outputs/`.
- **Red**: `test_tool_script.py::test_emits_runnable_environment_variables` — emit for
  `environment_variables.xml`, `subprocess.run(["sh", "run.sh"])`, assert exit 0 and that the output file
  contains `2`, `moo`, `NOTTHREE`. (Executed against the prototype; it passes.)
- **Red #2**: `test_tool_script_contains_no_exports` — the Q11 negative control.
- **Green**: implement, using phases 1–3.
- **Reuses**: `render_tool_script`, `LocalDirectoryComputeEnvironment`, `ToolEvaluator`,
  `env_to_statement` (`runners/util/env.py:4`).
- **Blast radius**: none outside the new module.

### Phase 5 — console script + fidelity test
- **Change**: `main()` in `tool_script.py`; `galaxy-tool-script` in `packages/app/pyproject.toml` beside
  `galaxy-remote-tool-eval` (`:104`). Docs page.
- **Red**: `test/integration/test_tool_script_fidelity.py` per Q11 — first against
  `version_command_plain.xml` (exact after workdir normalization), then the normalized-diff tier.
- **Blast radius**: one packaging line. No import-graph change.

### Phase 6 — dependency resolution (opt-in)
- **Change**: `--dependency-resolution` / `dependency_resolution=` → `build_dependency_manager`
  (`tool_util/deps/__init__.py:44`), prepend to `tool_commands`.
- **Red**: `test_tool_script.py::test_dependency_commands_prepended` — with a fake
  `<dir>/fiona/1.8.6/env.sh` on disk, assert `tool_script.sh` contains
  `PACKAGE_BASE=…; export PACKAGE_BASE; . …/env.sh` **above** the command line. (Executed against the
  prototype; produces exactly that string.)
- **Blast radius**: flag-gated; default `[]` keeps every earlier test byte-stable.

### Phase 7 — YAML / user-defined tools
- **Change**: select `UserToolEvaluator` when `tool.base_command or tool.shell_command`, mirroring
  `_get_tool_evaluator` (`jobs/__init__.py:1437-1444`); synthesize via `expand_incoming_async` +
  `RequestInternalDereferencedToolState`; set `job.tool_state` as `tools/execute.py:329` does.
- **Red**: `test_tool_script.py::test_user_defined_tool` asserting
  `cat '<path>/simple_line.txt' > output.txt` for `cat_user_defined.yml`. (Executed; passes.)
- **Blast radius**: one branch; XML path untouched.

### Phase 8 — Planemo adapter
- **Change**: `planemo/commands/cmd_tool_script.py` + `planemo/tool_script.py`. Options: tools arg,
  `--test_index`, `--output_dir`, `--test_data`, conda options, `--no_cleanup`. Adapter only — resolve
  paths, call the supported Galaxy API, print the emitted directory.
- **Red**: `tests/test_cmd_tool_script.py` (Planemo's `CliTestCase`) — run against
  `project_templates/`'s cat tool, assert `tool_script.sh` exists and the emitted command line contains the
  input path. Skipped without the `installed_galaxy` extra.
- **Reuses**: `planemo/conda.py:53`, `planemo/deps.py:61-86`, `options.conda_prefix_option()` (`options.py:720`),
  `options.optional_tools_arg`. Shape precedent `cmd_lint.py`.
- **Blast radius**: new command; no change to `planemo/engine/`.

### Phase 9 (optional) — collection inputs
- 31 of 225 functional tool tests. Build `DatasetCollection` / `DatasetCollectionElement` /
  `HistoryDatasetCollectionAssociation` from `TestCollectionDef`, mirroring `_element_identifiers`
  (`interactor.py:1016-1036`), thread into `job.input_dataset_collections` (`evaluation.py:1091-1093`).
- Until then v1 must raise a named, actionable error — not a traceback.

---

## 5. Ordering relative to ask #1

**Independent tracks. They do not share a substrate. Answer derived from evidence, not assumed.**

The orientation note framed it as: "If ask #2 can live on `SessionlessContext` while ask #1 needs a real DB
plus a job handler, they are independent tracks." The evidence inverts the premise but not the conclusion.

Ask #2 turns out to want a **real DB too** (§3). That looks like convergence, and is not:

1. **Different DB, for different reasons.** Ask #2 needs an in-memory sqlite that is *thrown away per
   invocation* (70 ms) and never sees a job handler, a runner, a `JobDestination` or a `finish()`. Ask #1
   needs a **persistent** database that survives across handler threads, because `JobHandlerQueue.__monitor`
   (`jobs/handler.py:278`) and the runner worker pool (`runners/__init__.py:126-133`) read the job back by
   id from another thread. An in-memory sqlite is precisely the wrong choice there.
2. **Ask #2 never constructs an app that can run a job.** `10_RECON.md` §0.2 establishes that the minimum
   app which can *execute* a tool is `UniverseApplication` (or a `GalaxyManagerApplication` that also calls
   `_configure_toolbox()`, `app/__init__.py:1009`). Ask #2's app deliberately has **no toolbox at all** —
   verified: `Tool.build_dependency_shell_commands` fails with
   `AttributeError: 'SqliteToolApp' object has no attribute 'toolbox'` and that is *fine*, the CLI calls the
   dependency manager directly.
3. **Ask #2 stops exactly where ask #1's hard part begins.** Ask #2 ends at
   `MinimalJobWrapper.prepare()`'s output (`jobs/__init__.py:1290-1321`). Ask #1's stated spine is
   `tool submission -> preparation -> execute -> job finalize`; ask #2 covers a *slice* of "preparation" and
   none of submission, execute or finalize. Nothing in ask #2 touches the GIL / process-isolation objection,
   Celery, teardown, or `LocalJobRunner.queue_job`.
4. **The one real overlap is three modules, not a foundation.**
   `LocalDirectoryComputeEnvironment` (ask #1 uses `SharedComputeEnvironment` via a real `JobIO`, so it may
   not even want it), `render_tool_script` (ask #1 goes through `command_factory.build_command`, which will
   call it anyway), and `synthesize_job` (ask #1 gets its `Job` from the real `DefaultToolAction`, not from
   a synthesizer). Phases 1 and 2 are small, safe and land first regardless.

**Recommended ordering: run them in parallel.** If serialization is forced, do ask #2 first — it is smaller,
lands phases 1–2 as pure refactors that ask #1 inherits for free, and produces a shippable developer tool
within a few merges. But **"#2 first" buys ask #1 roughly one afternoon of work**, not a foundation. Ordering
should be chosen on reviewer bandwidth, not on dependency.

*(Caveat: this is my independent answer. Ask #1's plan — `20_PLAN_INPROCESS_TOOL_TEST.md` — was written in
parallel and I have not read it. The verification agent should reconcile.)*

---

## 6. Claims I could not verify

1. **Byte-fidelity against a real Galaxy was never run.** No Galaxy server was started. Every fidelity claim
   here is (a) `render_tool_script` vs the live `__externalize_commands` in-process (executed, exact), and
   (b) emit-twice reproducibility (executed). The end-to-end diff against a job Galaxy actually ran is
   **proposed, not performed** — it is phase 5's deliverable.
2. **The 175/225 number is my prototype's, not the proposed implementation's.** The harness lives in a
   scratch directory. It reproduces the design (lean app, real Tool, real `ToolEvaluator`,
   `LocalDirectoryComputeEnvironment`, `env_to_statement`), but the shipped module may score differently.
3. **`location:` URIs via the deferred-dataset path is a hypothesis.** `evaluation.py:295-330` does
   materialize DEFERRED datasets, but I never built a DEFERRED HDA or fetched a URI (needs network).
4. **Collections and composite datatypes were never attempted.** My harness raises `NotImplementedError` by
   construction. The `_create_collection` / `remote_to_input` shapes (`interactor.py:1011-1036`, `:685-696`)
   were *read*, not exercised. The 31/6 counts are counts of tools my harness refused, which is a lower
   bound on difficulty, not a measurement of it.
5. **macOS only.** Everything ran on Darwin 25.6. `_build_config_files` uses `os.link` (`evaluation.py:807`)
   for explicit-filename configs — hard links across filesystems will fail differently on Linux/Windows,
   untested. `/bin/sh` on macOS is bash-in-posix-mode; `set -e` and backtick behaviour under dash were not
   checked.
6. **`filter_data_table.xml` (`ValueError: invalid literal for int(): 'value'` at
   `dynamic_options.py:1026`) and `metadata_bcf.xml`** were diagnosed as my tool-data / temp-path config
   rather than substrate issues, but I did not fix them and confirm.
7. **Three `TestDataNotFoundError`s** (`2.bigwig`, `4.maf`, `input_taxonomy.biom2`) — I assumed the files are
   fetched by the git test-data resolver in CI. Not confirmed; I ran with `GALAXY_TEST_FILE_DIR=test-data` only.
8. **`galaxy-tool-script` naming collision with `galaxy-tool-test`** is my judgement call, not tested with
   anyone.
9. **`app.security` with `job.history` set**: I used one `IdEncodingHelper` for both encode and decode, so
   `$__history_id__` round-trips. Whether the emitted id should be *stable* across runs (it currently is
   not — history ids come from the sqlite sequence) is undecided.
10. **Sweep numbers depend on my config choices** (`config/datatypes_conf.xml.sample`,
    `test/functional/tool-data/sample_tool_data_tables.xml`). Different configs move the number materially
    — that is itself a finding (137 → 162 → 175 across three config states), and it means the CLI must make
    these configurable and document sensible defaults.

---

## 7. Unresolved questions

- Console-script name: `galaxy-tool-script` vs `galaxy-expand-tool-script`? Collides visually with `galaxy-tool-test`.
- Default datatypes config: ship a pointer to `config/datatypes_conf.xml.sample`, or require `--datatypes-config`? Silent 35-vs-793 gap is a footgun.
- Same for tool data tables — default to none (loud failures on `from_data_table` selects) or to the sample conf?
- Stable ids across runs — worth forcing, for diffable output?
- `--emit-job-script` too, for developers who want stdout/stderr capture and exit-code files? Out of the stated ask; would make the artifact a full reproduction.
- Should phase 2 also retarget `SharedComputeEnvironment` onto a shared base, or leave it alone?
- Collections (phase 9): own PR, or a follow-up issue?
- Does ask #1 actually want `LocalDirectoryComputeEnvironment` and `synthesize_job`? If not, the "two consumers" argument for phase 2 rests entirely on the test suite. Acceptable, but say so upstream.
