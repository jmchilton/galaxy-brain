# CWL Legacy Runtime Deep Dive

How CWL tools execute inside Galaxy's job infrastructure — from API request to command execution to output collection. Written to inform the migration toward a `runtimeify`-style approach using the tool request API and validated tool state.

Branch: `cwl_on_tool_request_api_2`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [YAML Tool Runtime (The Target Pattern)](#yaml-tool-runtime-the-target-pattern)
3. [CWL Tool Execution: End-to-End](#cwl-tool-execution-end-to-end)
4. [Phase 1: API Entry and State Handling](#phase-1-api-entry-and-state-handling)
5. [Phase 2: Job Creation and Persistence](#phase-2-job-creation-and-persistence)
6. [Phase 3: Job Preparation and Evaluation](#phase-3-job-preparation-and-evaluation)
7. [Phase 4: exec_before_job — The CWL Core](#phase-4-exec_before_job--the-cwl-core)
8. [Phase 5: JobProxy — cwltool Bridge](#phase-5-jobproxy--cwltool-bridge)
9. [Phase 6: Command Assembly and Job Script](#phase-6-command-assembly-and-job-script)
10. [Phase 7: Output Collection](#phase-7-output-collection)
11. [The Representation Layer (Legacy Hack)](#the-representation-layer-legacy-hack)
12. [Comparison: CWL vs YAML Tool Runtime](#comparison-cwl-vs-yaml-tool-runtime)
13. [What a CWL Runtimeify Would Look Like](#what-a-cwl-runtimeify-would-look-like)
14. [Unresolved Questions](#unresolved-questions)

---

## Executive Summary

CWL tool execution uses a fundamentally different architecture from YAML tools:

- **YAML tools** use `UserToolEvaluator` with `param_dict_style="json"`. The evaluator calls `runtimeify()` to convert `JobInternalToolState` into a `JobRuntimeToolState` with CWL-style File objects. Command building uses `do_eval()` (JavaScript/CWL expressions) against these inputs. Everything happens inside the evaluator — no special pre-processing hook needed.

- **CWL tools** use the standard `ToolEvaluator` with `param_dict_style="regular"`. The critical work happens in `CwlCommandBindingTool.exec_before_job()`, which extracts `validated_tool_state.input_state`, creates a `JobProxy` wrapping cwltool, and pre-computes the entire command line, stdin/stdout/stderr, and environment variables. These are stashed in `param_dict` as `__cwl_command` and `__cwl_command_state`. The evaluator just uses those pre-computed values verbatim.

The key architectural difference: YAML tools build commands at evaluation time using expressions. CWL tools delegate command building to cwltool via a proxy object and store the result before evaluation even starts.

---

## YAML Tool Runtime (The Target Pattern)

Understanding this is critical because the goal is to make CWL execution follow a similar pattern.

### Evaluator Selection

`MinimalJobWrapper._get_tool_evaluator()` (`jobs/__init__.py:1402-1415`):
```python
if self.tool.base_command or self.tool.shell_command:
    klass = UserToolEvaluator   # YAML tools
else:
    klass = ToolEvaluator       # Galaxy tools, CWL tools
```

CWL tools have neither `base_command` nor `shell_command`, so they get `ToolEvaluator`.

### UserToolEvaluator.build_param_dict() (`evaluation.py:1130-1170`)

Two paths based on whether `validated_tool_state` exists:

**New path (runtimeify):**
```python
hda_references, adapt_datasets, adapt_collections = setup_for_runtimeify(
    self.app, compute_environment, input_datasets, input_dataset_collections
)
job_runtime_state = runtimeify(validated_tool_state, self.tool, adapt_datasets, adapt_collections)
cwl_style_inputs = job_runtime_state.input_state
```

**Returns:** `{"inputs": cwl_style_inputs, "outdir": job_working_directory}`

### UserToolEvaluator._build_command_line() (`evaluation.py:1172-1198`)

Evaluates `base_command` + `arguments` or `shell_command` using `do_eval()` against the CWL-style inputs. No Cheetah templates. No pre-computation.

### State Transformation Chain

```
RequestToolState (API) → decode() → RequestInternalToolState
    → dereference() → RequestInternalDereferencedToolState
    → expand() → JobInternalToolState (persisted to job.tool_state)
    → runtimeify() → JobRuntimeToolState (at evaluation time, File objects with paths)
```

Each transition is typed, validated, and unit-testable.

---

## CWL Tool Execution: End-to-End

```
POST /api/jobs (tool_request_raw)
    │
    ▼
Tool.handle_input_async()
    │ has_galaxy_inputs=False → bypass expand_meta_parameters, _populate_async
    │ creates JobInternalToolState from raw input
    ▼
execute_async() → _execute()
    │ job.tool_state = execution_slice.validated_param_combination.input_state
    ▼
[Job persisted to DB, queued via Celery]
    │ Tool serialized via ToolProxy.to_persistent_representation()
    ▼
JobWrapper.prepare()
    │ _get_tool_evaluator() → ToolEvaluator (not UserToolEvaluator)
    ▼
ToolEvaluator.set_compute_environment()
    │ Reconstructs JobInternalToolState from job.tool_state
    │ Calls build_param_dict() → returns early for CWL (no output wrapping)
    │ Calls execute_tool_hooks() → exec_before_job(validated_tool_state=...)
    ▼
CwlCommandBindingTool.exec_before_job()
    │ input_json = validated_tool_state.input_state  ← direct access
    │ Creates JobProxy(input_json, output_dict, job_dir)
    │ Extracts: command_line, stdin, stdout, stderr, env
    │ Stages files, saves .cwl_job.json
    │ Sets param_dict["__cwl_command"] and ["__cwl_command_state"]
    ▼
ToolEvaluator.build()
    │ _build_command_line() → uses param_dict["__cwl_command"] verbatim
    │ _build_config_files() → returns empty (CWL tools have no config files)
    │ _build_environment_variables() → reads from __cwl_command_state["env"]
    ▼
build_command() (command_factory.py)
    │ Wraps command with container, dependency resolution
    │ CWL-specific: writes cwl_params.json, generates relocate_dynamic_outputs.py
    ▼
Job script executes on compute node
    │ 1. Run __cwl_command
    │ 2. python relocate_dynamic_outputs.py
    ▼
handle_outputs()
    │ Loads JobProxy from .cwl_job.json
    │ Calls job_proxy.collect_outputs()
    │ Moves files to Galaxy dataset paths
    │ Writes galaxy.json metadata
```

---

## Phase 1: API Entry and State Handling

### Tool.expand_incoming_async() (`tools/__init__.py:2157-2223`)

The `has_galaxy_inputs` flag controls whether Galaxy's parameter machinery runs:

```python
if self.has_galaxy_inputs:
    # Galaxy tools: full parameter expansion, validation, population
    expanded_incomings, job_tool_states, collection_info = expand_meta_parameters_async(...)
else:
    # CWL tools: pass state through as-is
    expanded_incomings = [deepcopy(tool_request_internal_state.input_state)]
    job_tool_states = [deepcopy(tool_request_internal_state.input_state)]
    collection_info = None
```

After expansion, validation still happens:
```python
if self.has_galaxy_inputs:
    params, errors = self._populate_async(request_context, expanded_incoming)
else:
    params = expanded_incoming
    errors = {}
```

But a `JobInternalToolState` is always created and validated against the tool's parameter model:
```python
internal_tool_state = JobInternalToolState(job_tool_state)
internal_tool_state.validate(self, f"{self.id} (job internal model)")
```

### has_galaxy_inputs Flag (`tools/__init__.py:1725,1734`)

Set during `parse_inputs()`:
```python
self.has_galaxy_inputs = False           # line 1725
if pages.inputs_defined:
    self.has_galaxy_inputs = True        # line 1734
```

For CWL tools, `CwlPageSource.inputs_style` is `"cwl"`, which means `inputs_defined` behavior depends on the page source implementation. With the new commits, CWL tools have `has_galaxy_inputs = False`.

---

## Phase 2: Job Creation and Persistence

### execute.py (`lib/galaxy/tools/execute.py`)

`execute_async()` → `_execute()` → `execute_single_job()`:

```python
# Line 254-256:
if execution_slice.validated_param_combination:
    tool_state = execution_slice.validated_param_combination.input_state
    job.tool_state = tool_state
```

This persists the `JobInternalToolState.input_state` dict as JSON on the Job model. For CWL tools using the new path, this is the raw CWL-compatible input dict (dataset references as `{src: "hda", id: <int>}`).

### Celery Serialization

Tool request API uses Celery tasks. CWL tools must round-trip through serialization:

- `ToolProxy.to_persistent_representation()` serializes the full CWL tool description
- `QueueJobs` schema carries `tool_id` and `tool_uuid`
- On the worker, `create_tool_from_representation()` reconstructs the tool
- This was fixed in commit `d4d68d2a9b`

---

## Phase 3: Job Preparation and Evaluation

### JobWrapper.prepare() (`jobs/__init__.py:1247-1314`)

Called by the job runner when the job is ready to execute:

```python
tool_evaluator = self._get_tool_evaluator(job)                    # line 1270
tool_evaluator.set_compute_environment(compute_environment, ...)   # line 1272
(self.command_line, self.version_command_line,
 self.extra_filenames, self.environment_variables,
 self.interactivetools) = tool_evaluator.build()                   # line 1274
```

### Evaluator Selection (`jobs/__init__.py:1402-1415`)

```python
if self.tool.base_command or self.tool.shell_command:
    klass = UserToolEvaluator   # YAML tools have these
else:
    klass = ToolEvaluator       # CWL tools don't
```

CWL tools always get `ToolEvaluator` (not `UserToolEvaluator`).

### ToolEvaluator.set_compute_environment() (`evaluation.py:166-243`)

Reconstructs validated state from the persisted job:

```python
# Lines 217-220:
internal_tool_state = None
if job.tool_state:
    internal_tool_state = JobInternalToolState(job.tool_state)
    internal_tool_state.validate(self.tool, f"{self.tool.id} (job internal model)")
```

Then calls hooks with the validated state:
```python
self.execute_tool_hooks(inp_data=inp_data, out_data=out_data,
                        incoming=incoming, validated_tool_state=internal_tool_state)
```

Which calls:
```python
self.tool.exec_before_job(self.app, inp_data, out_data, self.param_dict,
                          validated_tool_state=validated_tool_state)
```

### ToolEvaluator.build_param_dict() — CWL Branch (`evaluation.py:263-285`)

CWL tools get a plain dict (not TreeDict) and return early:

```python
if self.tool.tool_type == "cwl":
    param_dict: Union[dict[str, Any], TreeDict] = self.param_dict
else:
    param_dict = TreeDict(self.param_dict)

# ... populate wrappers, input dataset wrappers ...

if self.tool.tool_type == "cwl":
    # don't need the outputs or the sanitization
    param_dict["__local_working_directory__"] = self.local_working_directory
    return param_dict
```

Skips: output dataset wrapping, output collection wrapping, non-job params, sanitization.

---

## Phase 4: exec_before_job — The CWL Core

### CwlCommandBindingTool.exec_before_job() (`tools/__init__.py:3757-3829`)

This is where CWL-specific execution setup happens. Full annotated flow:

```python
def exec_before_job(self, app, inp_data, out_data, param_dict=None,
                    validated_tool_state=None):
    super().exec_before_job(...)
    local_working_directory = param_dict["__local_working_directory__"]

    # 1. GET INPUT STATE — direct from validated_tool_state (new path)
    input_json = validated_tool_state.input_state

    # 2. BUILD OUTPUT DICT — maps output names to dataset paths
    output_dict = {}
    for name, dataset in out_data.items():
        output_dict[name] = {
            "id": str(getattr(dataset.dataset, dataset.dataset.store_by)),
            "path": dataset.get_file_name(),
        }

    # 3. FILTER INPUT JSON — remove unset optional files and empty strings
    input_json = {k: v for k, v in input_json.items()
                  if not (isinstance(v, dict) and v.get("class") == "File"
                          and v.get("location") == "None")}
    input_json = {k: v for k, v in input_json.items() if v != ""}

    # 4. CREATE JOB PROXY — wraps cwltool
    cwl_job_proxy = self._cwl_tool_proxy.job_proxy(
        input_json, output_dict, local_working_directory)

    # 5. EXTRACT EXECUTION DETAILS FROM CWLTOOL
    cwl_command_line = cwl_job_proxy.command_line   # list of args
    cwl_stdin = cwl_job_proxy.stdin
    cwl_stdout = cwl_job_proxy.stdout
    cwl_stderr = cwl_job_proxy.stderr
    env = cwl_job_proxy.environment

    # 6. ASSEMBLE COMMAND STRING
    command_line = " ".join(
        shlex.quote(arg) if needs_shell_quoting_hack(arg) else arg
        for arg in cwl_command_line
    )
    if cwl_stdin:  command_line += f' < "{cwl_stdin}"'
    if cwl_stdout: command_line += f' > "{cwl_stdout}"'
    if cwl_stderr: command_line += f' 2> "{cwl_stderr}"'

    # 7. STAGE FILES — symlinks for input files + InitialWorkDirRequirement
    tool_working_directory = os.path.join(local_working_directory, "working")
    safe_makedirs(tool_working_directory)
    cwl_job_proxy.stage_files()
    cwl_job_proxy.rewrite_inputs_for_staging()

    # 8. PERSIST JOB PROXY — for output collection later
    cwl_job_proxy.save_job()   # writes .cwl_job.json

    # 9. STASH IN PARAM_DICT — for evaluator to pick up
    param_dict["__cwl_command"] = command_line
    param_dict["__cwl_command_state"] = {
        "args": cwl_command_line,
        "stdin": cwl_stdin,
        "stdout": cwl_stdout,
        "stderr": cwl_stderr,
        "env": env,
    }
```

**Critical observation**: The `input_json` at step 1 is now `validated_tool_state.input_state` (the new path). In the legacy path, this would have been `self.param_dict_to_cwl_inputs(param_dict, local_working_directory)` which reverse-engineers CWL inputs from Galaxy's wrapped parameter dict via `to_cwl_job()` or `galactic_flavored_to_cwl_job()`.

### $GALAXY_SLOTS Handling

`needs_shell_quoting_hack()` exempts `$GALAXY_SLOTS` from quoting. But there's a deeper hack: cwltool needs a concrete number for `ResourceRequirement.coresMin` at job-construction time. `JobProxy._select_resources()` substitutes a sentinel value (`1.480231396`), and `command_line` property replaces it back with `$GALAXY_SLOTS`:

```python
# parser.py:442-449
@property
def command_line(self):
    command_line = self.cwl_job().command_line
    return [fragment.replace(str(SENTINEL_GALAXY_SLOTS_VALUE), "$GALAXY_SLOTS")
            for fragment in command_line]
```

---

## Phase 5: JobProxy — cwltool Bridge

### Constructor (`parser.py:329-344`)

```python
class JobProxy:
    def __init__(self, tool_proxy, input_dict, output_dict, job_directory):
        self._tool_proxy = tool_proxy
        self._input_dict = input_dict      # CWL job inputs
        self._output_dict = output_dict    # {name: {id, path}}
        self._job_directory = job_directory
        self._final_output = None
        self._ok = True
        self._cwl_job = None
        self._normalize_job()
```

### _normalize_job() (`parser.py:376-391`)

Prepares input dict for cwltool:

1. Converts `"path"` keys to `"location"` in File/Directory objects
2. Calls `process.fill_in_defaults()` to inject CWL defaults
3. Uses cwltool's `visit_class()` for recursive path rewriting

### _ensure_cwl_job_initialized() (`parser.py:354-374`)

Lazily creates the cwltool Job object:

```python
job_args = dict(
    basedir=self._job_directory,
    select_resources=self._select_resources,
    outdir=os.path.join(self._job_directory, "working"),
    tmpdir=os.path.join(self._job_directory, "cwltmp"),
    stagedir=os.path.join(self._job_directory, "cwlstagedir"),
    use_container=False,            # Galaxy handles containers
    beta_relaxed_fmt_check=True,
)
runtimeContext = RuntimeContext(job_args)

# Defensive copy to prevent mutations
cwl_tool_instance = copy.copy(self._tool_proxy._tool)
cwl_tool_instance.inputs_record_schema = copy.deepcopy(
    cwl_tool_instance.inputs_record_schema)

self._cwl_job = next(cwl_tool_instance.job(
    self._input_dict, self._output_callback, runtimeContext))
self._is_command_line_job = hasattr(self._cwl_job, "command_line")
```

**Key: `use_container=False`** — Galaxy's own containerization (Docker/Singularity) wraps the command later in `build_command()`. cwltool must not try to run containers.

### Directory Layout

```
{job_directory}/
├── .cwl_job.json           # Serialized JobProxy (tool + inputs + outputs)
├── cwl_params.json         # {job_metadata, job_id_tag} for output collection
├── cwlstagedir/            # cwltool staging area (symlinks)
├── cwltmp/                 # cwltool temp directory
├── working/                # Tool output directory (outdir)
├── outputs/
│   └── dataset_{id}_files/ # Galaxy extra files per output
│       └── __secondary_files__/  # Secondary files
├── relocate_dynamic_outputs.py   # Generated output collection script
└── tool_script.sh          # Galaxy job script
```

### stage_files() (`parser.py:541-564`)

Uses cwltool's `PathMapper` to create symlinks:

```python
if hasattr(cwl_job, "pathmapper"):
    process.stage_files(cwl_job.pathmapper, stageFunc, ignore_writable=True)

if hasattr(cwl_job, "generatefiles"):
    # InitialWorkDirRequirement
    generate_mapper = pathmapper.PathMapper(
        cwl_job.generatefiles["listing"], outdir, outdir, separateDirs=False)
    process.stage_files(generate_mapper, stageFunc, ignore_writable=inplace_update)
    relink_initialworkdir(generate_mapper, outdir, outdir, inplace_update=inplace_update)
```

### save_job() (`parser.py:508-516`)

Writes `.cwl_job.json`:
```python
job_objects = {
    "tool_representation": self._tool_proxy.to_persistent_representation(),
    "job_inputs": self._input_dict,
    "output_dict": self._output_dict,
}
json.dump(job_objects, open(job_file, "w"))
```

This is how the post-execution output collection script can reconstruct the full CWL context.

### CommandLineTool vs ExpressionTool

| Property | CommandLineTool | ExpressionTool |
|----------|---------------|----------------|
| `is_command_line_job` | True | False |
| `command_line` | cwl_job.command_line (list of args) | `["true"]` (no-op) |
| `stdin/stdout/stderr` | From cwl_job | None |
| `environment` | From cwl_job (EnvVarRequirement) | `{}` |
| `stage_files()` | Uses pathmapper + generatefiles | No pathmapper |
| `collect_outputs()` | cwl_job.collect_outputs(workdir, rcode) | cwl_job.run() → JS execution → _output_callback |

---

## Phase 6: Command Assembly and Job Script

### ToolEvaluator.build() (`evaluation.py`)

After `exec_before_job` has set `__cwl_command` in `param_dict`:

**_build_command_line() (line 806-809):**
```python
if self.tool.tool_type in CWL_TOOL_TYPES and "__cwl_command" in param_dict:
    command_line = param_dict["__cwl_command"]  # Pre-computed, no Cheetah
```

**_build_config_files() (line 849-851):**
```python
if self.tool.tool_type in CWL_TOOL_TYPES:
    return config_filenames  # Empty — CWL tools have no config files
```

**_build_environment_variables() (line 873-907):**
```python
# Extract CWL env vars from __cwl_command_state
for key, value in param_dict.get("__cwl_command_state", {}).get("env", {}).items():
    environment_variable = dict(name=key, template=value)
    environment_variables_raw.append(environment_variable)

# Later: CWL tools skip Cheetah templating for env vars
if self.tool.tool_type not in CWL_TOOL_TYPES:
    template_type = "cheetah"
```

### build_command() (`command_factory.py:39-293`)

Assembles the final job script. CWL-specific block at lines 141-158:

```python
if job_wrapper.is_cwl_job:
    # 1. Write cwl_params.json for output collection
    cwl_metadata_params = {
        "job_metadata": join("working", job_wrapper.tool.provided_metadata_file),
        "job_id_tag": job_wrapper.get_id_tag(),
    }
    with open(cwl_metadata_params_path, "w") as f:
        json.dump(cwl_metadata_params, f)

    # 2. Generate relocate script
    relocate_contents = (
        "from galaxy_ext.cwl.handle_outputs import relocate_dynamic_outputs; "
        "relocate_dynamic_outputs()"
    )
    write_script(relocate_script_file, relocate_contents, ...)

    # 3. Append to job script
    commands_builder.append_command(SETUP_GALAXY_FOR_METADATA)
    commands_builder.append_command(f"python '{relocate_script_file}'")
```

Also at line 289-293, CWL jobs skip the duplicate `SETUP_GALAXY_FOR_METADATA` before the metadata command since it's already added above.

### Resulting Job Script Structure

```bash
# 1. Dependency setup (conda, etc.)
# 2. Container setup if needed
# 3. The CWL command itself (__cwl_command)
<cwl_tool_command> < stdin > stdout 2> stderr
# 4. Exit code capture
# 5. Galaxy environment setup
SETUP_GALAXY_FOR_METADATA
# 6. Output relocation
python 'relocate_dynamic_outputs.py'
# 7. Standard metadata commands
```

---

## Phase 7: Output Collection

### Entry Point: relocate_dynamic_outputs.py

Generated by `command_factory.py`, calls:
```python
from galaxy_ext.cwl.handle_outputs import relocate_dynamic_outputs
relocate_dynamic_outputs()
```

### handle_outputs.py → runtime_actions.py

`galaxy_ext/cwl/handle_outputs.py` is a thin wrapper that adjusts `sys.path` and calls `galaxy.tool_util.cwl.runtime_actions.handle_outputs()`.

### handle_outputs() (`runtime_actions.py:69-229`)

**Step 1: Load context**
```python
job_proxy = load_job_proxy(job_directory, strict_cwl_validation=False)
cwl_metadata_params = json.load(open(cwl_metadata_params_path))
exit_code_file = default_exit_code_file(".", cwl_metadata_params["job_id_tag"])
tool_exit_code = read_exit_code_from(exit_code_file, job_id_tag)
```

`load_job_proxy()` (`parser.py:798-808`) reconstructs the full CWL context:
```python
job_objects = json.load(open(os.path.join(job_directory, ".cwl_job.json")))
cwl_tool = tool_proxy_from_persistent_representation(job_objects["tool_representation"])
return cwl_tool.job_proxy(job_objects["job_inputs"], job_objects["output_dict"], job_directory)
```

**Step 2: Collect CWL outputs**
```python
outputs = job_proxy.collect_outputs(tool_working_directory, tool_exit_code)
```

For CommandLineTools: delegates to cwltool's `collect_outputs()` which evaluates output glob patterns.
For ExpressionTools: calls `cwl_job.run()` to execute the JavaScript expression.

**Step 3: Process each output**

| CWL Output Type | Processing |
|---|---|
| `File` (dict with location) | `move_output()` — copies file to Galaxy dataset path, handles secondary files |
| `Directory` (dict with location) | `move_directory()` — copies tree to extra_files_path |
| Record (dict without location) | Splits by `\|__part__\|` prefix, processes each field |
| List (array) | Creates indexed elements with filenames |
| Scalar/JSON | `handle_known_output_json()` — writes to expression.json |
| None/missing | Fills with null JSON for declared-but-absent outputs |

**Step 4: Write galaxy.json**
```python
job_metadata = os.path.join(job_directory, cwl_metadata_params["job_metadata"])
with open(job_metadata, "w") as f:
    json.dump(provided_metadata, f)
```

This `galaxy.json` contains per-output metadata: `created_from_basename`, `ext`, `format`, and for collections, `elements`.

### Secondary Files

Stored in `dataset_{id}_files/__secondary_files__/` with an index file:
```json
{"order": ["file.idx", "file.bai"]}
```

The `move_output()` function handles secondary file naming. CWL uses a `^` prefix convention (each `^` removes one extension from the primary file name), but the code also supports `STORE_SECONDARY_FILES_WITH_BASENAME` mode.

---

## The Representation Layer (Legacy Hack)

This section documents what the migration aims to eliminate. The legacy path converts Galaxy param_dict back to CWL inputs.

### to_cwl_job() (`representation.py:386-488`)

Called by `CwlTool.param_dict_to_cwl_inputs()`. Walks `tool.inputs` (Galaxy's parsed parameter tree):

- **Repeat** inputs → CWL arrays (strips `_repeat` suffix)
- **Conditional** inputs → reads `_cwl__type_` discriminator, extracts `_cwl__value_`
- **Data** inputs → `dataset_wrapper_to_file_json()` creates CWL File objects
- **Collections** → `collection_wrapper_to_array()` or `collection_wrapper_to_record()`
- **Primitives** → type-coerced values

### galactic_flavored_to_cwl_job() (`representation.py:286-383`)

Simpler variant for `GalacticCwlTool`. Uses `map_to` paths for nested structures. No repeat/conditional handling.

### dataset_wrapper_to_file_json() (`representation.py:155-195`)

Converts a Galaxy DatasetWrapper to CWL File object:
```python
raw_file_object = {
    "class": "File",
    "location": path,
    "size": int(dataset_wrapper.get_size()),
    "format": str(dataset_wrapper.cwl_formats[0]),
    "basename": basename,
    "nameroot": nameroot,
    "nameext": nameext,
    "secondaryFiles": [...]
}
```

Handles secondary files by symlinking into an `_inputs` directory.

### Why This Is a Problem

The round-trip (CWL schema → Galaxy widgets → user input → Galaxy param_dict → CWL job JSON) requires:
- Every CWL type mapped to a Galaxy widget type (`TYPE_REPRESENTATIONS`)
- Union types become Galaxy conditionals with `_cwl__type_`/`_cwl__value_` keys
- `FieldTypeToolParameter` in `basic.py` as a catch-all for CWL's flexible typing
- DatasetWrappers must be reverse-engineered back to CWL File objects
- All of this touches `basic.py`, which is core Galaxy infrastructure

With validated tool state, the input JSON goes directly to `exec_before_job` without this reverse-engineering.

---

## Comparison: CWL vs YAML Tool Runtime

| Aspect | CWL Tool (current) | YAML Tool (runtimeify) |
|--------|--------------------|-----------------------|
| **Evaluator class** | `ToolEvaluator` | `UserToolEvaluator` |
| **param_dict_style** | `"regular"` | `"json"` |
| **Input state source** | `validated_tool_state.input_state` (new) or `param_dict_to_cwl_inputs()` (legacy) | `runtimeify(validated_tool_state)` |
| **Dataset → File conversion** | Done in `exec_before_job` (input_json already has references) OR `dataset_wrapper_to_file_json()` (legacy) | Done by `setup_for_runtimeify()` adapters |
| **Command building** | Pre-computed by cwltool via `JobProxy`, stored in `__cwl_command` | Built at eval time via `do_eval()` with CWL expressions |
| **Where command lives** | `param_dict["__cwl_command"]` | Returned from `_build_command_line()` |
| **Output collection** | Post-execution `relocate_dynamic_outputs.py` script via cwltool | Standard Galaxy metadata |
| **Job proxy needed** | Yes — wraps cwltool.job.Job | No |
| **Container handling** | Galaxy wraps (cwltool `use_container=False`) | Galaxy wraps |
| **File staging** | cwltool PathMapper (symlinks) | Galaxy's standard input staging |
| **Config files** | None | YamlTemplateConfigFile |
| **Environment vars** | From cwltool (`EnvVarRequirement`) | From tool definition |

### Key Structural Differences

1. **Command pre-computation**: CWL delegates to cwltool at `exec_before_job` time. YAML tools evaluate at `_build_command_line` time. This is unavoidable — cwltool is the authoritative CWL command builder.

2. **Two-phase output**: CWL uses a post-execution script to collect outputs because cwltool needs to run its own output glob evaluation. YAML tools use Galaxy's standard metadata.

3. **File staging**: CWL uses cwltool's PathMapper. YAML tools use Galaxy's standard input path rewriting via `compute_environment.input_path_rewrite()`.

4. **No `runtimeify()` equivalent**: CWL currently gets `validated_tool_state.input_state` directly. It does NOT go through `runtimeify()` to convert dataset references to File objects with paths. The input_state either already has the right format (new path) or gets reverse-engineered from param_dict (legacy path).

---

## What a CWL Runtimeify Would Look Like

The goal: make CWL execution use typed state transitions similar to YAML tools.

### Current New Path (partially done)

```
validated_tool_state.input_state  (has dataset refs as {src: "hda", id: N})
    ↓
exec_before_job() filters + passes directly to JobProxy
    ↓
JobProxy._normalize_job() fills CWL defaults
    ↓
cwltool processes and generates command
```

### What's Missing for Full Runtimeify

1. **Dataset reference → File object conversion**: Currently `exec_before_job` receives `input_state` with raw references. Someone needs to convert `{src: "hda", id: N}` to `{"class": "File", "location": "/path/to/file", ...}`. In the YAML path, `runtimeify()` + `setup_for_runtimeify()` does this. For CWL, this conversion could happen:
   - **Option A**: Inside `exec_before_job` (current approach — it has access to `inp_data`)
   - **Option B**: Via a CWL-specific `runtimeify()` before `exec_before_job`
   - **Option C**: Use `UserToolEvaluator` for CWL tools too (would need `base_command` or `shell_command` set)

2. **Secondary files**: YAML's `runtimeify()` doesn't handle secondary files. CWL needs them. `dataset_wrapper_to_file_json()` currently handles this in the legacy path.

3. **Directory inputs**: CWL directories are tar archives in Galaxy. Need extraction logic that the YAML path doesn't have.

4. **Collection mapping**: CWL arrays/records map to Galaxy collections. The YAML `runtimeify()` has `adapt_collection` but raises `NotImplementedError` for some cases.

### The Input State Question

In the current new path, what does `validated_tool_state.input_state` look like for CWL tools? It appears to be the raw API input — dataset references but not yet File objects with paths. The conversion to CWL File objects (with location, size, checksum, secondary files) would need to happen somewhere before `JobProxy` gets the input dict.

The YAML tool path does this in `setup_for_runtimeify()` → `adapt_dataset()` which creates `DataInternalJson` objects (CWL File-like). A CWL equivalent would need to be richer — adding secondary files, CWL format URIs, checksums, etc.

---

## Unresolved Questions

1. **Where should dataset→File conversion happen for CWL?** In `exec_before_job` (has `inp_data` dict), in a CWL-specific `runtimeify`, or somewhere else? The current code in `exec_before_job` just uses `validated_tool_state.input_state` directly — does this already contain resolved paths or just references?

2. **Can CWL tools use `UserToolEvaluator`?** They'd need `base_command` or `shell_command`. Could we set a synthetic `shell_command` that's the cwltool-generated command? Probably not — the command isn't known until `JobProxy` runs.

3. **How close can file staging get to Galaxy's standard path?** CWL uses cwltool's PathMapper for symlinks. YAML uses `compute_environment.input_path_rewrite()`. Could we skip PathMapper and use Galaxy's rewriting? Probably not for InitialWorkDirRequirement files.

4. **Can output collection move inside Galaxy?** Currently it's a post-execution script. Could `collect_outputs()` run inside Galaxy's job finishing instead of as a script appended to the job? This would avoid needing to serialize the full tool representation to `.cwl_job.json`.

5. **ExpressionTool execution**: These run JS, not shell commands. The current path returns `["true"]` as the command and runs the expression during `collect_outputs`. How does this interact with the tool request API? Is there a simpler path?

6. **What validated_tool_state.input_state actually contains for CWL right now?** Need to trace a concrete test case to see the actual JSON structure at each phase. The filtering in `exec_before_job` (removing `location == "None"` files and empty strings) suggests the state may not be fully clean yet.

7. **Secondary files in the new path**: The legacy `dataset_wrapper_to_file_json()` reconstructs secondary files from `__secondary_files__` directories. In the new path using `validated_tool_state.input_state`, who provides secondary file information?
