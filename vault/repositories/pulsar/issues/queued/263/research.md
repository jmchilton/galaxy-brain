# pulsar#263 — Support Galaxy Expression Tools in Pulsar

Research note for planning. Read-only investigation; nothing was executed.

- Galaxy: `origin/dev` @ `ba94fb44cdf` (fetched 2026-09-22)
- Pulsar: `origin/master` @ `e476697` (fetched 2026-09-22; tip is the pulsar#515 merge that
  removed `__PULSAR_JOBS_DIRECTORY__`)
- Issue: https://github.com/galaxyproject/pulsar/issues/263 (open since 2021-07-15)

**Bottom line.** The gap is real and unchanged since 2021. The diagnosis is narrower than the
issue implies: `cd ../` is *not* the problem (it resolves correctly under Pulsar), and
`__local_working_directory__` is not really the problem either. The one defect is that
`ExpressionTool.exec_before_job` writes two files with a bare `open()` and never registers them
with any staging list, so they exist only on the Galaxy head node. Additionally, expression tools
are routed away from Pulsar by `tool_type_local = True` in every job conf in both repos, so
nobody has ever seen the failure.

Scope caveat: the fix below is verifiable under **embedded** Pulsar, which shares Galaxy's Python.
A real out-of-process Pulsar additionally needs `galaxy_ext` importable on the compute node — via
`galaxy_home`/`GALAXY_LIB` or via packaging. I could not verify that, and embedded-Pulsar tests
will not catch it. See §7 and unresolved Q1/Q2.

---

## 1. Current mechanics

`ExpressionTool` still lives in `lib/galaxy/tools/__init__.py`, not in
`lib/galaxy/tools/expressions/` (that package holds only the evaluation engine and the script
writer).

`/Users/jxc755/projects/repositories/galaxy/lib/galaxy/tools/__init__.py:3205-3220`

```python
class ExpressionTool(Tool):
    requires_js_runtime = True
    tool_type = "expression"
    tool_type_local = True
    EXPRESSION_INPUTS_NAME = "_expression_inputs_.json"
    ...
    def parse_command(self, tool_source):
        self.command = f"cd ../; {expressions.EXPRESSION_SCRIPT_CALL}"
```

`lib/galaxy/tools/__init__.py:3235-3266` — `exec_before_job`, verbatim from the 2021 comment:

```python
    def exec_before_job(self, app, inp_data: InpDataDictT, out_data: OutDataDictT, param_dict=None):
        super().exec_before_job(app, inp_data, out_data, param_dict=param_dict)
        local_working_directory = param_dict["__local_working_directory__"]
        expression_inputs_path = os.path.join(local_working_directory, ExpressionTool.EXPRESSION_INPUTS_NAME)
        ...
        job: dict[str, str] = {}
        json_wrap(self.inputs, param_dict, self.profile, job, handle_files="OBJECT")
        expression_inputs = {"job": job, "script": self._expression, "outputs": outputs}
        expressions.write_evalute_script(os.path.join(local_working_directory))
        with open(expression_inputs_path, "w") as f:
            json.dump(expression_inputs, f)
```

Constants today (`lib/galaxy/tools/expressions/script.py:3-11`):

```python
EXPRESSION_SCRIPT_NAME = "_evaluate_expression_.py"
EXPRESSION_SCRIPT_CALL = f"python {EXPRESSION_SCRIPT_NAME}"

def write_evalute_script(in_directory):
    script = os.path.join(in_directory, EXPRESSION_SCRIPT_NAME)
    with open(script, "w") as f:
        f.write("from galaxy_ext.expressions.handle_job import run; run()")
```

(`write_evalute_script` — the typo is upstream, not mine.)

The inputs file is found at runtime through an env var, declared at
`lib/galaxy/tools/__init__.py:3317-3325`:

```python
    def parse_environment_variables(self, tool_source):
        expression_script_inputs = dict(name="GALAXY_EXPRESSION_INPUTS", template=ExpressionTool.EXPRESSION_INPUTS_NAME)
```

and consumed at `lib/galaxy_ext/expressions/handle_job.py:29-35` — `environment_path =
os.environ.get("GALAXY_EXPRESSION_INPUTS")`, then `open(environment_path)`. The template is a
*relative filename*, so the variable resolves against the process CWD.

So the 2021 quotes are byte-for-byte still current. `git log -S 'cd ../' -- lib/galaxy/tools/__init__.py`
returns exactly one commit (`f5c93e868b7 Implement expression tools and non-data tool outputs.`);
commits touching lines 3205-3270 since 2021 are lint, typing, black, pyupgrade, and a profile
floor. **Nothing quietly fixed this.**

One thing *has* changed since 2021 and it helps: expression evaluation no longer shells out to
nodejs. `lib/galaxy/tools/expressions/js_engine.py:1-7` — "Galaxy evaluates workflow `when`
expressions and expression-tool scripts in a fresh QuickJS context in a Python subprocess."
`lib/galaxy/tools/expressions/evaluation.py:56-58` keeps `config` only for backwards
compatibility. The compute-node requirement is therefore a Python package (`cwl-utils`, pulled in
by both `pyproject.toml:32` and `packages/app/pyproject.toml:37`), **not** a node binary.
`lib/galaxy/tools/expressions/util.py` (`find_engine`, which looks for `nodejs`/`node`) still
exists but is now vestigial for this path.

## 2. Why it breaks under Pulsar

`__local_working_directory__` is set at `lib/galaxy/tools/evaluation.py:637` to
`self.local_working_directory`, which the job wrapper supplies at
`lib/galaxy/jobs/__init__.py:1448` as `local_working_directory=self.working_directory`. And
`working_directory` (`lib/galaxy/jobs/__init__.py:1388-1400`) is the **job directory**, not the
tool working dir — `tool_working_directory` is `os.path.join(self.working_directory, "working")`.

So `exec_before_job` writes, on the Galaxy head node:

- `<local_job_dir>/_evaluate_expression_.py`
- `<local_job_dir>/_expression_inputs_.json`

Neither call goes through `ToolEvaluator._register_extra_file`
(`lib/galaxy/tools/evaluation.py:965-970`), which is the only thing that appends to
`extra_filenames`. That matters because `extra_filenames` is the entire input to Pulsar staging:

`/Users/jxc755/projects/repositories/galaxy/lib/galaxy/jobs/runners/pulsar.py:487-503`

```python
            job_directory_files = []
            config_files = job_wrapper.extra_filenames
            tool_script = os.path.join(job_wrapper.working_directory, "tool_script.sh")
            if os.path.exists(tool_script):
                log.debug(f"Registering tool_script for Pulsar transfer [{tool_script}]")
                job_directory_files.append(tool_script)
                config_files.append(tool_script)
            ...
            for tool_env in tool_envs:
                job_directory_path = tool_env.get("job_directory_path")
                if job_directory_path:
                    config_files.append(job_directory_path)
```

Consequence: the two expression files are in no list, so they are never uploaded. On the compute
node `cd ../; python _evaluate_expression_.py` finds nothing → `python: can't open file
'_evaluate_expression_.py'`. Even if the script existed, `GALAXY_EXPRESSION_INPUTS` would point at
an absent `_expression_inputs_.json`.

Note what *does* work: the env-var file itself is staged. `_build_environment_variables`
(`lib/galaxy/tools/evaluation.py:816-862`) writes a `tool_env_*` temp file into
`local_working_directory`, sets `environment_variable["job_directory_path"] = config_filename`, and
sets the value to `` `cat "<env_config_directory>/<basename>"` ``. The Pulsar runner picks that up
at `pulsar.py:500-502` and `PulsarComputeEnvironment.env_config_directory()`
(`pulsar.py:1478-1481`) returns the *remote* configs dir. So `GALAXY_EXPRESSION_INPUTS` will be
correctly set to the string `_expression_inputs_.json` on the compute node — pointing at a file
that was never sent. **The env-var half already respects compute environments; only the payload
files don't.** That is the whole bug.

Secondary breakage, worth flagging because it will bite the moment the staging is fixed for
chained expression tools: `handle_files="OBJECT"` → `_hda_to_object`
(`lib/galaxy/tools/parameters/wrapped_json.py:187-192`) does, for `expression.json` inputs:

```python
def _hda_to_object(hda):
    if hda.extension == "expression.json":
        # We may have a null data value
        with open(str(hda)) as inp:
```

`str(hda)` on a `DatasetFilenameWrapper` built with a compute environment returns `false_path`, the
**remote** path (`lib/galaxy/tools/wrappers.py:405-418, 484-491`). The `open()` sits outside the
`try`, so on a Pulsar destination with path rewriting this raises `FileNotFoundError` during
command-line build on the head node. Only expression tools reach this code — `"OBJECT"` has
exactly one caller (`lib/galaxy/tools/__init__.py:3258`).

Output paths, by contrast, are fine: `outputs[].path` comes from `str(param_dict[out_name])`, and
outputs are wrapped with the compute environment at `lib/galaxy/tools/evaluation.py:606`, so the
JSON already carries remote paths that Pulsar stages back.

## 3. The `cd ../` question — largely refuted

The two layouts line up. Concretely:

- **Galaxy local.** Job script template does `cd $working_directory`
  (`lib/galaxy/jobs/runners/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh`, last lines), and the
  runner passes `working_directory=os.path.abspath(job_wrapper.working_directory)` —
  the **job dir** (`lib/galaxy/jobs/runners/__init__.py:535`). `build_command` then prepends
  `cd working` (`lib/galaxy/jobs/command_factory.py:128-131`). CWD at tool command:
  `<job_dir>/working`. `cd ../` → `<job_dir>`. ✔
- **Pulsar.** `create_tool_working_directory=False`
  (`lib/galaxy/jobs/runners/pulsar.py:633`) so no `cd working` is prepended; instead Pulsar's own
  job script does the cd, and Pulsar passes the **working** subdir as the template's
  `working_directory`:

  `/Users/jxc755/projects/repositories/pulsar/pulsar/managers/base/directory.py:297-298`
  ```python
            # job_diredctory not used by job_script and it calls the job directory working directory
            "working_directory": self.job_directory(job_id).working_directory(),
  ```
  CWD at tool command: `<jobs_directory>/<id>/working`. `cd ../` → `<jobs_directory>/<id>`. ✔

Same relative position in both. `cd ../` is implicit and ugly but **correct on Pulsar**. It is also
sealed inside `tool_script.sh` — `__externalize_commands`
(`lib/galaxy/jobs/command_factory.py:168-211`) writes the tool commands to a script and the outer
command becomes `sh <script>`, so the stdout/stderr redirect
(`command_factory.py:120-124`, `io_directory = "../metadata" if for_pulsar else "../outputs"`)
is evaluated by the parent shell in `working/` and is unaffected by the inner `cd ../`.

Two caveats where that sealing does not hold, and `cd ../` then *does* corrupt the
`../metadata`/`../outputs` redirect:

- `shell: none` in the destination — `__externalize_commands` returns the raw commands
  (`command_factory.py:181-183`).
- `pulsar_version < 0.14.999` with `rewrite_paths` → `job_wrapper.disable_commands_in_new_shell()`
  (`lib/galaxy/jobs/runners/pulsar.py:614-615`).

Both are edge cases. Not a reason to redesign the command, but a reason to leave a comment.

Nothing here needs `__PULSAR_JOBS_DIRECTORY__`; the whole mechanism is relative-path based, which
is fortunate given pulsar#515 removed that token.

## 4. What pulsar#266 actually did

`gh pr view 266` — *"Use tool classes to only test remote Galaxy tools."*, merged 2021-07-16 (one
day after #263 was filed). Two commits, and the diff is **entirely CI configuration**:

- `.github/workflows/galaxy_framework.yaml`: parameterize the checked-out Galaxy branch and pick a
  per-branch job conf.
- rename `test_data/test_job_conf.yaml` → `test_job_conf_master.yaml`.
- add `test_data/test_job_conf_dev.yaml` ending in:
  ```yaml
  tools:
    - class: local
      environment: local_environment
  ```

Its Galaxy-side companion is `52cbaba1600 Allow specifying useful classes of tools for mapping in
job conf`, which added `tool_type_local` / `VALID_TOOL_CLASSES`
(`lib/galaxy/jobs/__init__.py:147`) and the class-matching at
`lib/galaxy/tools/__init__.py:1509-1517`.

So: **the prior vault triage line is verified.** #266 is a workaround — it routes expression tools
(and upload/data-fetch) *away* from Pulsar so Pulsar's Galaxy-framework CI goes green. It does not
touch staging, the command, or the script. The workaround is still live on `master` today:
`pulsar/test_data/test_job_conf.yaml` (now un-suffixed again) still carries the
`class: local → local_environment` mapping.

The `job_conf` sample says the quiet part out loud —
`lib/galaxy/config/sample/job_conf.sample.yml:1226-1233`:

```yaml
  # - local (these special tools that aren't parameterized for remote execution - expression tools, upload, etc..)
```

## 5. Existing abstractions to reuse

Ranked, because the right answer is "reuse a seam that already carries a head-node-written file
into the Pulsar job directory," and there are two credible ones.

### 5a. `job_directory_files` / `path_type.JOBDIR` — closest fit

`tool_script.sh` is the exact precedent: a file Galaxy writes into the **job directory root** on
the head node and that Pulsar stages into the **remote job directory root**.

- Galaxy side registers it: `lib/galaxy/jobs/runners/pulsar.py:489-493`.
- Client uploads it: `pulsar/client/staging/up.py:257-259`
  ```python
      def __upload_job_directory_files(self):
          for job_directory_file in self.job_directory_files:
              self.transfer_tracker.handle_transfer_path(job_directory_file, path_type.JOBDIR)
  ```
- `JOBDIR` maps to the job directory itself: `pulsar/client/job_directory.py:16-28`
  (`"jobdir": "job_directory"`), `pulsar/client/action_mapper.py:68`.

That lands the files at exactly `<remote_job_dir>/_evaluate_expression_.py` and
`<remote_job_dir>/_expression_inputs_.json` — precisely where `cd ../` plus a relative
`GALAXY_EXPRESSION_INPUTS` expect them. **Zero change to the command, the env var, or `cd ../`.**

Cost: `job_directory_files` is currently a local list built inline in `pulsar.py` with one
hardcoded member. To use it without teaching the Pulsar runner about expression tools, Galaxy needs
a generic wrapper-level list — e.g. `job_wrapper.job_directory_files`, populated the way
`extra_filenames` is, that `pulsar.py:487` seeds from instead of `[]`. That is a small, genuinely
reusable abstraction and is the kind of thing the issue is really asking for: *any* tool type that
needs a head-node-generated file in the job directory root would then work.

Related nit to fix while in there: `config_files = job_wrapper.extra_filenames` at
`pulsar.py:488` is an alias, not a copy, so the subsequent `.append(tool_script)` mutates
`job_wrapper.extra_filenames`.

### 5b. `_register_extra_file` → `extra_filenames` → `config_files` → `configs/`

The idiomatic Galaxy seam. `_build_config_files` (`lib/galaxy/tools/evaluation.py:794-814`) writes
into `ensure_configs_directory(self.local_working_directory)`, registers via
`_register_extra_file`, and Pulsar stages those as `path_type.CONFIG` with textual path rewriting
(`pulsar/client/staging/up.py:335-338, 347-357`).

Strong points beyond staging:

- `_build_config_file_text` already knows how to produce this payload. An `InputConfigFile`
  (`lib/galaxy/tool_util_models/tool_source.py:164-174`) is rendered as
  `json.dumps(wrapped_json.json_wrap(self.tool.inputs, self.param_dict, self.tool.profile,
  handle_files=...))` (`evaluation.py:914-935`) — which is what `exec_before_job` open-codes at
  `lib/galaxy/tools/__init__.py:3258`. The `"job"` half of `_expression_inputs_.json` is a
  duplicated `InputConfigFile`. Only `"script"` and `"outputs"` are extra.
- Config-file path rewriting would handle any residual local paths for free.

Cost: files land in `configs/`, not the job root, so `GALAXY_EXPRESSION_INPUTS` must become an
absolute compute path. There is precedent for handing `exec_before_job` compute-aware values —
`__populate_non_job_params` (`lib/galaxy/tools/evaluation.py:635-643`) already injects
`__tool_directory__` and `__new_file_path__` from `self.compute_environment`, alongside the
`__local_working_directory__` the issue complains about. Adding a compute-aware
`__config_directory__` (or having `exec_before_job` take the evaluator's compute environment) is the
direct answer to jmchilton's "don't seem to respect compute environments."

Note `ComputeEnvironment` (`lib/galaxy/job_execution/compute_environment.py:20-105`) exposes
`working_directory()`, `config_directory()`, `env_config_directory()`, `tool_directory()`,
`new_file_path()` — but **no** `job_directory()`, and `PulsarComputeEnvironment`
(`lib/galaxy/jobs/runners/pulsar.py:1476-1495`) has none either. Adding one is possible (the runner
already computes `remote_job_directory` at `pulsar.py:603`) but it is new surface; 5a avoids
needing it.

### 5c. Don't stage the script at all

`_evaluate_expression_.py` is a one-line bootstrap. Expression tools already have
`requires_galaxy_python_environment == True` (tool_type `expression` is not in the exempt set at
`lib/galaxy/tools/__init__.py:357-372`), and Pulsar already supports that: `GALAXY_LIB` is put on
`PYTHONPATH` by `pulsar/managers/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh:11-17`, sourced from
`_galaxy_lib()` (`pulsar/managers/base/__init__.py:174-179`, i.e. `<galaxy_home>/lib`) via
`pulsar/managers/base/directory.py:293`. So on a correctly configured Pulsar the import works
without shipping the file.

The precedent is `REMOTE_TOOL_EVAL_PULSAR_COMMAND`
(`lib/galaxy/jobs/command_factory.py:39-42`):

```python
REMOTE_TOOL_EVAL_PULSAR_COMMAND = (
    'if [ "$GALAXY_LIB" != "None" ] && [ -f "$GALAXY_LIB/galaxy/tools/remote_tool_eval.py" ]; '
    f"then {REMOTE_TOOL_EVAL_SOURCE_COMMAND}; else {REMOTE_TOOL_EVAL_PACKAGE_COMMAND}; fi"
)
```

backed by a console script `galaxy-remote-tool-eval = "galaxy.tools.remote_tool_eval:main"`
(`packages/app/pyproject.toml:105`). An analogous `galaxy-evaluate-expression` entry point would
make `EXPRESSION_SCRIPT_CALL` a source-or-package fallback and delete `write_evalute_script`
entirely.

I could not verify that `galaxy_ext` ships in any published package — it is not referenced in
`packages/app/pyproject.toml`, and `handle_job.py` relies on a `sys.path.insert` relative to its own
file (`lib/galaxy_ext/expressions/handle_job.py:15`). So 5c is attractive but has a packaging
question attached, which is why I'd sequence it after 5a rather than instead of it.

**Recommendation: 5a for staging (minimal, precedent-backed, no command change), 5b's
`_build_config_file_text` reuse for the payload as a follow-up, 5c as an optional later
simplification.**

### Not the right seam

- `tool_files` / `tool_directory` (`pulsar/client/staging/up.py:212-255`) — driven by files
  discovered under the tool's own directory or `required_files`. These are per-job generated
  artifacts, not tool-repo files.
- Metadata scripts — these flow via `metadata_directory` staging and `__build_metadata_configuration`
  (`pulsar.py:595-601`), which is its own pipeline tied to `metadata/outputs_new`. Not applicable.

## 6. Does it already work? — no, but the evidence is static

I want to be explicit: **I did not run anything.** There is no `.venv` in the Galaxy clone, and the
task was read-only. The conclusion is a static trace, resting on three independent legs:

1. **No registration.** `exec_before_job` uses bare `open()` and `write_evalute_script`; neither
   touches `_register_extra_file`. Grep confirms `extra_filenames` is appended to only at
   `evaluation.py:812`, `:909`, `:1056` and `jobs/__init__.py:2762`, `:3019` — none of them from
   expression code.
2. **Zero test coverage, by construction.** `tool_type_local = True` → the `local` tool class →
   every Pulsar job conf in both repos maps `class: local` to a local runner:
   - `galaxy/test/integration/embedded_pulsar_job_conf.yml`
   - `galaxy/test/integration/embedded_pulsar_metadata_extended_job_conf.yml`
   - `galaxy/test/integration/embedded_pulsar_none_job_conf.yml`
   - (same pattern in the docker/singularity/tpv/mq confs)
   - `pulsar/test_data/test_job_conf.yaml`

   And no Pulsar test module lists an expression tool: `test_pulsar_embedded.py` and
   `test_pulsar_embedded_extended_metadata.py` enumerate their tools explicitly and neither includes
   `expression_*`. Grep for `expression_forty_two|expression_parse_int|expression_pick_larger_file`
   across `lib/` + `test/` hits only `lib/galaxy_test/api/test_tool_execute.py`,
   `test_workflows.py`, `workflow_fixtures.py`, `sample_tool_conf.xml` and two tool_util unit tests
   — all local-runner paths.
3. **No relevant change since 2021**, per the `git log -L` over the `ExpressionTool` block and the
   log over `lib/galaxy/tools/expressions/`.

I also checked the one plausible "maybe extended metadata already fixes it" hypothesis, and it does
**not**:

- With `tool_evaluation_strategy: remote` (`lib/galaxy/jobs/__init__.py:1075-1079`), the head node
  uses `PartialToolEvaluator` (`:1438-1441`), but `JobWrapper.prepare` still calls
  `tool_evaluator.set_compute_environment(...)` (`:1313-1318`), which calls `execute_tool_hooks` →
  `exec_before_job` (`evaluation.py:215, 229-235`). So the files are still written on the head node.
- On the compute node, `RemoteToolEvaluator` explicitly skips them —
  `lib/galaxy/tools/evaluation.py:1155-1157`:
  ```python
      def execute_tool_hooks(self, inp_data, out_data, incoming):
          # These have already run while preparing the job
          pass
  ```

So under extended metadata the files are written on the wrong host *and* never written on the right
one. Extended metadata is not a workaround.

## 7. Blast radius

**Galaxy owns essentially all of it.** Pulsar already has every mechanism required:

- `path_type.JOBDIR` staging into the job directory root — exists, used for `tool_script.sh`.
- `GALAXY_LIB` on `PYTHONPATH` for `requires_galaxy_python_environment` tools — exists.
- Job-directory layout that makes `cd ../` correct — exists.

Pulsar-side work is limited to (a) removing the `class: local → local_environment` mapping from
`test_data/test_job_conf.yaml` once Galaxy can handle it, which is what actually closes #263's CI
story, and (b) nothing else that I can identify. The client-side `job_directory_files` plumbing
lives in the `pulsar` package (`pulsar/client/staging/up.py`) but needs no change — Galaxy just has
to put things in the list.

Caveat I cannot verify without running it: whether a *production* Pulsar (not embedded) has
`galaxy_home` configured often enough that `from galaxy_ext.expressions.handle_job import run` will
import. If not, expression tools on remote Pulsar need either the packaged-console-script route
(5c) or a documented `galaxy_home` requirement. Embedded Pulsar shares the process, so integration
tests will not exercise this.

---

## Plan

Ordered. Each step names repo, files, the seam reused, and the red-to-green test.

### Step 1 — Red test: expression tool on embedded Pulsar (Galaxy)

- **Repo:** galaxy
- **New files:** `test/integration/embedded_pulsar_expressions_job_conf.yml`,
  `test/integration/test_pulsar_embedded_expressions.py`
- **Seam:** `galaxy_test.driver.integration_util.integration_tool_runner`, exactly as
  `test/integration/test_pulsar_embedded.py` uses it.
- **Shape:** copy `embedded_pulsar_job_conf.yml` but add an explicit id-based override *above* the
  class rule so expression tools go to Pulsar while upload/data-fetch stay local:
  ```yaml
  tools:
  - id: expression_forty_two
    environment: pulsar_embed
  - id: expression_pick_larger_file
    environment: pulsar_embed
  - class: local
    environment: local
  ```
  Do **not** edit the existing confs — flipping `class: local` there reroutes upload and
  `__DATA_FETCH__` too, which is a coverage change, not a test.
- **Red:** `expression_forty_two` (no inputs, minimal case) fails today with
  `python: can't open file '_evaluate_expression_.py'` because the file was never staged.
  `expression_pick_larger_file` is the data-input case and should be added in the same module but
  expected red for a second reason (§2, `_hda_to_object`).
- **Control that must stay green:** add the same two tools to nothing else; keep
  `test_pulsar_embedded.py` untouched so a regression there is attributable.
- **Minimal case verified sound:** `expression_forty_two` has no inputs, so `json_wrap` returns
  `{}` (`wrapped_json.py:22-33`) and `_hda_to_object` is never reached. Its `type="integer"` output
  still goes through `__populate_output_dataset_wrappers`
  (`lib/galaxy/tools/evaluation.py:601-606`), which wraps *every* output in a
  `DatasetFilenameWrapper` with the compute environment regardless of declared type — so the
  `outputs[].path` in the JSON is already the remote path. The only thing missing is staging, which
  is exactly what Step 3 supplies.
- **Precedence verified:** `get_job_tool_configurations`
  (`lib/galaxy/jobs/__init__.py:798-819`) matches ids first and only falls through to
  `tool_classes` under `if not match_found:`. So an id entry does beat `class: local`.

### Step 2 — Generic job-directory-file registration (Galaxy)

- **Repo:** galaxy
- **Files:** `lib/galaxy/jobs/__init__.py` (add `self.job_directory_files: list[str] = []` beside
  `extra_filenames` at `:1020`, plus a `register_job_directory_file()` accessor),
  `lib/galaxy/tools/evaluation.py` (a `_register_job_directory_file` mirroring
  `_register_extra_file` at `:965-970`, and plumb the list out of `build()` the way
  `extra_filenames` is), `lib/galaxy/jobs/runners/pulsar.py:487-493` (seed `job_directory_files`
  from the wrapper rather than `[]`; also stop aliasing `extra_filenames`).
- **Seam reused:** `job_directory_files` → `path_type.JOBDIR`, i.e. the existing `tool_script.sh`
  route. No new Pulsar code.
- **Test:** unit test in `test/unit/app/jobs/` asserting a registered job-directory file appears in
  the wrapper's list and survives `prepare()`; plus a unit test on the runner that
  `ClientJobDescription.job_directory_files` contains it. The existing
  `test/unit/app/tools/test_evaluation.py` harness is the natural home for the evaluator half.

### Step 3 — Register the two expression files (Galaxy)

- **Repo:** galaxy
- **Files:** `lib/galaxy/tools/__init__.py:3235-3266`, `lib/galaxy/tools/expressions/script.py`
- **Change:** have `exec_before_job` register both written paths through the Step 2 seam. This
  requires `exec_before_job` to reach the evaluator; the cleanest route is for
  `execute_tool_hooks` (`lib/galaxy/tools/evaluation.py:229-235`) to pass a registration callback
  (or `self`) rather than widening `param_dict` with another `__…__` key.
- **Green:** Step 1's `expression_forty_two` case goes green. That is the whole red-to-green loop
  for the core issue.
- **Unit test:** extend `test/unit/app/tools/test_evaluation.py` with an expression-tool case
  asserting both filenames are registered — fails before Step 3, passes after.

### Step 4 — Fix `_hda_to_object` for rewritten paths (Galaxy)

- **Repo:** galaxy
- **File:** `lib/galaxy/tools/parameters/wrapped_json.py:187-192`
- **Change:** read `expression.json` contents from the *local* dataset path
  (`hda.unsanitized.get_file_name()`), not `str(hda)`, and/or move the `open()` inside the `try`.
  Head-node code has no business opening a compute-node path.
- **Red-to-green:** `expression_pick_larger_file` in Step 1's module, plus a chained
  expression-tool workflow test (`lib/galaxy_test/base/workflow_fixtures.py` already has expression
  fixtures) run under the Pulsar conf. Add a unit test in `test/unit/app/tools/` that calls
  `json_wrap(..., handle_files="OBJECT")` with a wrapper whose `false_path` points somewhere
  nonexistent — red today with `FileNotFoundError`.

### Step 5 — Kill the `EXPRESSION_SCRIPT_CALL` staging entirely (Galaxy, optional)

- **Repo:** galaxy
- **Files:** `packages/app/pyproject.toml` (new `galaxy-evaluate-expression` console script →
  `galaxy_ext.expressions.handle_job:run` or a thin `galaxy.tools.expressions` main),
  `lib/galaxy/tools/expressions/script.py`, `lib/galaxy/jobs/command_factory.py`
- **Seam reused:** `REMOTE_TOOL_EVAL_PULSAR_COMMAND`'s source-or-package fallback idiom
  (`command_factory.py:39-42`).
- **Benefit:** deletes `write_evalute_script` and halves the staged payload.
- **Blocked on:** confirming `galaxy_ext` is importable from a published package. If it is not,
  this step becomes "package `galaxy_ext.expressions`" first.
- **Test:** the Step 1 integration module is the regression net; add a doctest/unit assertion that
  `EXPRESSION_SCRIPT_CALL` renders the fallback form.

### Step 6 — Document why `cd ../` is correct; guard two edge cases (Galaxy, small)

- **Repo:** galaxy
- **File:** `lib/galaxy/tools/__init__.py:3217-3219`
- **Change:** nothing functional — `cd ../` is correct (§3). Add a comment recording *why*, and
  either guard or document the `shell: none` and `pulsar_version < 0.14.999` cases where
  `__externalize_commands` does not wrap the command and the `../metadata` redirect would be
  evaluated from the job dir.
- **Test:** a unit test over `build_command` asserting the expression command is wrapped in
  `tool_script.sh` for a Pulsar-shaped invocation. `test/unit/app/jobs/test_command_factory.py`
  exists and is the right home.

### Step 7 — Drop the workaround (Pulsar)

- **Repo:** pulsar
- **File:** `test_data/test_job_conf.yaml`
- **Change:** remove (or narrow to upload/data-fetch ids) the `class: local → local_environment`
  mapping added by #266, so Pulsar's Galaxy-framework CI actually exercises expression tools.
- **Scope:** #263's title and body are about expression tools specifically ("Need to transfer the
  Python script"), not the whole `local` class. `upload1` / `__DATA_FETCH__` are also `class: local`
  and genuinely are not remote-parameterized; narrowing the mapping to their ids rather than
  deleting it keeps the issue's scope honest.
- **Test:** Pulsar's own `galaxy_framework` workflow is the test. Do this **last**, and only after
  Steps 2-4 are in a Galaxy release Pulsar CI pins, or CI goes red for an unrelated reason
  (upload1 / `__DATA_FETCH__` are also `class: local` and genuinely are not remote-parameterized).

---

## Unresolved questions

1. Is `galaxy_ext` importable from any published Galaxy package? Gates Step 5, and possibly gates
   real (non-embedded) Pulsar at all.
2. Do production Pulsar deployments set `galaxy_home`? If rare, remote expression tools need the
   console-script route, not `GALAXY_LIB`.
3. Pass the registration seam into `exec_before_job` how — callback arg, evaluator reference, or a
   new compute-aware `param_dict` key? Existing precedent is the `__…__` key, which is the thing
   jmchilton complained about.
4. Should `_expression_inputs_.json`'s `"job"` half become a real `InputConfigFile` (5b) rather
   than the open-coded `json_wrap` at `tools/__init__.py:3258`? Bigger refactor, better abstraction.
5. Embedded Pulsar shares Galaxy's Python. Does any CI job exercise a *separate-process* Pulsar such
   that Step 5's packaging question would actually get tested?
6. Worth a `ComputeEnvironment.job_directory()` for its own sake, given `PulsarJobRunner` already
   computes `remote_job_directory` (`pulsar.py:603`)? Not needed for this fix.
