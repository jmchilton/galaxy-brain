# Dependency: cwltool

How Galaxy uses cwltool — every import, every API call, and whether those calls make sense for the migration.

Branch: `cwl_on_tool_request_api_2`

---

## Dependency Overview

cwltool is the CWL reference runner. Galaxy uses it as a **library**, not a CLI — loading CWL documents, generating commands, staging files, and collecting outputs. Galaxy never runs cwltool as a subprocess.

All cwltool imports go through a single wrapper module (`cwltool_deps.py`) with try/except guards so cwltool remains an optional dependency. Only `parser.py` and `schema.py` call cwltool APIs directly. Everything else uses plain Python dicts that happen to match the CWL spec.

### Package Dependencies

| Package | Purpose |
|---------|---------|
| `cwltool` | CWL reference runner — loading, validation, command generation, output collection |
| `schema_salad` | CWL schema library — URI resolution, YAML loading, source line tracking |
| `ruamel.yaml` | YAML parsing (transitive via schema_salad) — `CommentedMap` type |

---

## Import Inventory

### cwltool_deps.py — The Single Import Gateway

All cwltool access flows through `lib/galaxy/tool_util/cwl/cwltool_deps.py`:

| Import | Source | Used By |
|--------|--------|---------|
| `main` | `cwltool` | Availability check only |
| `pathmapper` | `cwltool` | `JobProxy.stage_files()` — PathMapper constructor |
| `process` | `cwltool` | `fill_in_defaults()`, `stage_files()` |
| `workflow` | `cwltool` | Type hint for Workflow objects |
| `getdefault` | `cwltool.context` | Filesystem access factory default |
| `LoadingContext` | `cwltool.context` | CWL document loading configuration |
| `RuntimeContext` | `cwltool.context` | Job execution configuration |
| `relink_initialworkdir` | `cwltool.job` | InitialWorkDirRequirement handling |
| `StdFsAccess` | `cwltool.stdfsaccess` | Filesystem access for `fill_in_defaults()` |
| `load_tool` | `cwltool` | `fetch_document()`, `make_tool()` |
| `command_line_tool` | `cwltool` | Imported but not directly referenced |
| `default_loader` | `cwltool.load_tool` | Raw YAML/JSON document loader |
| `resolve_and_validate_document` | `cwltool.load_tool` | CWL document validation |
| `Process` | `cwltool.process` | Base class type hint |
| `CWLObjectType` | `cwltool.utils` | Type alias for CWL data dicts |
| `JobsType` | `cwltool.utils` | Type alias for Job objects |
| `normalizeFilesDirs` | `cwltool.utils` | Imported but not referenced in Galaxy code |
| `visit_class` | `cwltool.utils` | Recursive CWL object visitor |
| `ref_resolver` | `schema_salad` | URI↔path conversion |
| `sourceline` | `schema_salad` | `add_lc_filename()` for in-memory CWL objects |
| `yaml_no_ts` | `schema_salad.utils` | YAML loading without timestamp parsing |
| `CommentedMap` | `ruamel.yaml.comments` | Type for parsed CWL documents |

Also: `beta_relaxed_fmt_check = True` (constant) and `needs_shell_quoting` (regex).

### Other Files with Direct cwltool Imports

| File | Import | Purpose |
|------|--------|---------|
| `lib/galaxy_test/base/cwl_location_rewriter.py` | `LoadingContext`, `default_loader`, `pack`, `visit_field` | Test utility for rewriting CWL locations |
| `test/unit/tool_util/test_cwl.py` | `schema_salad` (via cwltool_deps) | Accessing `ValidationException` for test assertions |

---

## API Usage by Galaxy Module

### 1. schema.py — CWL Document Loading

`SchemaLoader` wraps cwltool's three-phase loading pipeline:

**Phase 1: Fetch**
```python
load_tool.fetch_document(uri, loadingContext=loading_context)
# Returns: (LoadingContext, CommentedMap, str)
```
- Called in `raw_process_reference()` with a `file://` URI
- Called in `raw_process_reference_for_object()` with an in-memory CommentedMap
- The `loading_context` is configured with `strict`, `do_validate`, `enable_dev=True`, `do_update=True`, `relax_path_checks=True`

**Phase 2: Validate**
```python
resolve_and_validate_document(loading_context, process_object, uri)
# Returns: (LoadingContext, str)
```
- Resolves `$import`, `$include`, validates against CWL schema

**Phase 3: Instantiate**
```python
load_tool.make_tool(uri, loading_context)
# Returns: Process (CommandLineTool | ExpressionTool | Workflow)
```
- Returns a concrete cwltool Process object

**Two loader instances:**
- `schema_loader` — strict validation (tool loading)
- `non_strict_non_validating_schema_loader` — lenient (job execution, output collection)

**Assessment**: Clean, correct usage. The three-phase pipeline is cwltool's intended API. Galaxy's two-loader pattern correctly separates validation strictness for loading vs runtime.

---

### 2. parser.py — The Core Proxy Layer

This is where nearly all cwltool interaction happens. Three proxy classes wrap cwltool objects.

#### 2.1 ToolProxy — Wraps `cwltool.process.Process`

**Stored reference:**
```python
self._tool = tool  # Process instance
```

**Process attributes accessed:**

| Attribute | Type | Usage |
|-----------|------|-------|
| `.tool` | dict | Raw CWL definition — `id`, `inputs`, `outputs`, `class`, `doc`, `label`, `requirements`, `cwlVersion` |
| `.metadata` | dict | `metadata["cwlVersion"]` for serialization |
| `.inputs_record_schema` | dict | `{"type": "record", "fields": [...]}` — input type definitions |
| `.outputs_record_schema` | dict | Same structure for outputs |
| `.schemaDefs` | dict | Maps type names to resolved schema definitions |
| `.requirements` | list | CWL requirements (modified in-place by `_hack_cwl_requirements`) |
| `.hints` | list | CWL hints (DockerRequirement moved here) |

**Key operations on Process:**

1. **Format stripping** (`__init__`, line 145-148): Removes `"format"` from input field definitions so cwltool won't complain about missing format in input data. This is a workaround — Galaxy doesn't track CWL format URIs on datasets.

2. **Schema definition resolution** (`input_fields`, line 293-294): Looks up `input_type` in `schemaDefs` to resolve named types (e.g., SchemaDefRequirement types).

3. **Serialization** (`to_persistent_representation`): Serializes `.tool` dict + `.requirements` + `.metadata["cwlVersion"]` to JSON for database storage.

4. **DockerRequirement hack** (`_hack_cwl_requirements`, line 893-901): Moves DockerRequirement from `.requirements` to `.hints` so cwltool doesn't try to run containers — Galaxy handles containerization independently.

**Assessment**: All attribute access is on well-established cwltool Process properties. The format stripping and Docker hack are legitimate bridging concerns. The serialization approach (persisting `.tool` dict) works because cwltool can reconstruct a Process from a raw CWL dict via `fetch_document()` + `make_tool()`.

#### 2.2 JobProxy — Wraps `cwltool.job.Job` (lazily)

This is the heaviest cwltool integration point.

**`_normalize_job()` — Preparing inputs for cwltool** (line 376-391):

```python
runtime_context = RuntimeContext({})
make_fs_access = getdefault(runtime_context.make_fs_access, StdFsAccess)
fs_access = make_fs_access(runtime_context.basedir)
process.fill_in_defaults(self._tool_proxy._tool.tool["inputs"], self._input_dict, fs_access)
visit_class(self._input_dict, ("File", "Directory"), pathToLoc)
```

Calls:
1. `RuntimeContext({})` — empty context just to get filesystem access factory
2. `getdefault(runtime_context.make_fs_access, StdFsAccess)` — get fs_access class with StdFsAccess as default
3. `process.fill_in_defaults(inputs_list, input_dict, fs_access)` — fills default values into `_input_dict` in-place
4. `visit_class(obj, class_names, callback)` — converts `"path"` keys to `"location"` in File/Directory objects

**Assessment**: Correct API usage. `fill_in_defaults` is cwltool's standard way to apply CWL default values. `visit_class` is the standard recursive visitor. The `pathToLoc` conversion is necessary because Galaxy internally uses `path` but cwltool expects `location`.

**`_ensure_cwl_job_initialized()` — Creating the cwltool Job** (line 354-374):

```python
runtimeContext = RuntimeContext({
    basedir=job_directory,
    select_resources=self._select_resources,
    outdir=os.path.join(job_directory, "working"),
    tmpdir=os.path.join(job_directory, "cwltmp"),
    stagedir=os.path.join(job_directory, "cwlstagedir"),
    use_container=False,
    beta_relaxed_fmt_check=beta_relaxed_fmt_check,
})
cwl_tool_instance = copy.copy(self._tool_proxy._tool)
cwl_tool_instance.inputs_record_schema = copy.deepcopy(cwl_tool_instance.inputs_record_schema)
self._cwl_job = next(cwl_tool_instance.job(self._input_dict, self._output_callback, runtimeContext))
```

Key design decisions:
- `use_container=False` — Galaxy wraps the command in its own container layer later
- `select_resources=self._select_resources` — callback that injects `SENTINEL_GALAXY_SLOTS_VALUE` (1.480231396) for cores since the real slot count isn't known at job-preparation time
- Shallow copy of Process + deep copy of `inputs_record_schema` — because `Process.job()` mutates `inputs_record_schema` in place (not thread-safe)
- `next()` on the generator — cwltool's `job()` returns a generator, Galaxy only needs the first (and only) job

**Assessment**: The copy pattern is a legitimate workaround for cwltool's in-place mutation. The GALAXY_SLOTS sentinel hack is fragile but necessary — cwltool needs a concrete number for ResourceRequirement evaluation at job-construction time. The `use_container=False` is correct — Galaxy's container system handles Docker/Singularity.

**Job object properties accessed** (on the object returned by `Process.job()`):

| Property | Type | CommandLineTool | ExpressionTool |
|----------|------|-----------------|----------------|
| `command_line` | `list[str]` | Command fragments | N/A (checked via `hasattr`) |
| `stdin` | `str \| None` | Stdin redirect path | N/A |
| `stdout` | `str \| None` | Stdout redirect path | N/A |
| `stderr` | `str \| None` | Stderr redirect path | N/A |
| `environment` | `dict` | EnvVarRequirement vars | N/A |
| `generatefiles` | `dict` | `{"listing": [...]}` for InitialWorkDirRequirement | N/A |
| `pathmapper` | `PathMapper` | Input file path mapping | N/A (checked via `hasattr`) |
| `inplace_update` | `bool` | InlineJavascriptRequirement flag | N/A |

**Assessment**: These are all standard cwltool Job properties. Galaxy distinguishes CommandLineTool from ExpressionTool via `hasattr(cwl_job, "command_line")` which is the correct check — ExpressionTool jobs don't have a command_line attribute.

**Job methods called:**

| Method | When | Signature |
|--------|------|-----------|
| `collect_outputs(outdir, rcode)` | CommandLineTool post-execution | Returns `dict[str, CWLObjectType]` — output name to CWL value mapping |
| `run(RuntimeContext({}))` | ExpressionTool execution | Executes JS expression, calls `_output_callback(out, status)` |

**Assessment**: Correct usage. For CommandLineTools, `collect_outputs` evaluates output glob patterns against the working directory. For ExpressionTools, `run()` executes the JavaScript and delivers results via callback. The empty RuntimeContext for expression execution is fine — expressions don't need runtime configuration.

**`_select_resources()` callback** (line 433-440):

```python
def _select_resources(self, request, runtime_context=None):
    new_request = request.copy()
    new_request["cores"] = SENTINEL_GALAXY_SLOTS_VALUE
    return new_request
```

cwltool calls this during job construction to resolve ResourceRequirement. Galaxy substitutes a sentinel float for cores, then replaces it back with `$GALAXY_SLOTS` in the command_line property:

```python
return [fragment.replace(str(SENTINEL_GALAXY_SLOTS_VALUE), "$GALAXY_SLOTS") for fragment in command_line]
```

**Assessment**: This is a hack but functional. The sentinel value (1.480231396) is unlikely to appear naturally. The real fix would be deferring job construction to the compute node where slot count is known, but that would require architectural changes.

**`_output_callback(out, process_status)`** (line 486-493):

cwltool's callback contract: `(Optional[CWLObjectType], str)`. Galaxy stores the output and status, checking for `"success"`.

**Assessment**: Correct callback implementation matching cwltool's expected signature.

**`stage_files()`** (line 541-564):

```python
# Input files via pathmapper
process.stage_files(cwl_job.pathmapper, stageFunc, ignore_writable=True, symlink=False)

# InitialWorkDirRequirement files
generate_mapper = pathmapper.PathMapper(
    cwl_job.generatefiles["listing"], outdir, outdir, separateDirs=False
)
process.stage_files(generate_mapper, stageFunc, ignore_writable=inplace_update, symlink=False)
relink_initialworkdir(generate_mapper, outdir, outdir, inplace_update=inplace_update)
```

Galaxy's `stageFunc` creates symlinks (`os.symlink`). Two passes:
1. Input files — symlinked from Galaxy dataset paths to cwltool staging
2. Generated files (InitialWorkDirRequirement) — staged into working directory, then relinked

**Assessment**: This follows cwltool's own staging pattern. The `separateDirs=False` is correct for Galaxy's flat working directory. The `ignore_writable=True` for inputs prevents cwltool from trying to copy writable files. The `symlink=False` parameter to `process.stage_files` means Galaxy's custom `stageFunc` handles linking, not cwltool's default.

**`rewrite_inputs_for_staging()`** (line 393-431):

This method has a commented-out block for pathmapper-based rewriting, with an active fallback that manually symlinks files whose `location` doesn't match their `basename`. This is a workaround for files that cwltool's staging doesn't handle (e.g., expression tools without a pathmapper).

**Assessment**: The commented-out code suggests this is incomplete. The active fallback is functional but inelegant — it manually traverses the input dict looking for location/basename mismatches.

**`save_job()` / `load_job_proxy()`** — Persistence for output collection (line 508-516, 798-808):

```python
# save_job writes:
{"tool_representation": proxy.to_persistent_representation(), "job_inputs": input_dict, "output_dict": output_dict}

# load_job_proxy reads it back:
cwl_tool = tool_proxy_from_persistent_representation(persisted_tool)
return cwl_tool.job_proxy(job_inputs, output_dict, job_directory)
```

This serializes the full CWL context to `.cwl_job.json` so the output collection script can reconstruct a JobProxy post-execution.

**Assessment**: This round-trip works because `to_persistent_representation()` captures the raw CWL tool dict, and `from_persistent_representation()` feeds it back through cwltool's loading pipeline (with `strict_cwl_validation=False` for speed). The non-strict loader avoids re-validating at output collection time.

#### 2.3 WorkflowProxy — Wraps `cwltool.workflow.Workflow`

**Stored reference:**
```python
self._workflow = workflow  # cwltool.workflow.Workflow
```

**Workflow attributes accessed:**

| Attribute | Type | Usage |
|-----------|------|-------|
| `.tool` | dict | Raw CWL workflow dict — `id`, `inputs`, `outputs` |
| `.steps` | iterable | WorkflowStep objects |

**WorkflowStep attributes accessed:**

| Attribute | Type | Usage |
|-----------|------|-------|
| `.tool` | dict | Step definition — `run`, `class`, `inputs`, `scatter`, `scatterMethod`, `when` |
| `.id` | str | Step identifier |
| `.requirements` | list | Step-level requirements |
| `.hints` | list | Step-level hints |
| `.embedded_tool` | Process \| Workflow | The nested Process or sub-Workflow for inline tools |

**Assessment**: All access is on standard cwltool Workflow/WorkflowStep properties. Galaxy reads these to convert CWL workflows into Galaxy's internal workflow format. No mutation of cwltool objects here.

---

### 3. runtime_actions.py — Output Collection

**Direct cwltool calls:** Only `ref_resolver.uri_file_path(location)` for converting `file://` URIs to filesystem paths.

**Indirect cwltool calls:** `job_proxy.collect_outputs()` which delegates to cwltool's `Job.collect_outputs()` or `Job.run()`.

The rest is pure Galaxy logic — moving files, handling secondary files, writing `galaxy.json` metadata.

**Assessment**: Clean separation. The only cwltool dependency is through JobProxy (which is correct) and the URI resolver (which is a simple utility).

---

### 4. representation.py — Zero cwltool API Calls

Despite being the CWL↔Galaxy translation layer, this module **never calls cwltool directly**. It constructs plain Python dicts matching the CWL spec (`{"class": "File", "location": ...}`). The only cwltool-adjacent reference is `_cwl_tool_proxy.input_fields()` which is Galaxy's ToolProxy method.

**Assessment**: This is actually a good thing. The representation layer's problems are conceptual (the round-trip hack), not dependency-related. Eliminating it doesn't remove any cwltool API usage.

---

### 5. util.py — Zero cwltool API Calls

`galactic_job_json()`, `output_to_cwl_json()`, and the upload target classes all work with plain CWL-spec dicts. No cwltool dependency.

---

### 6. parser/cwl.py (CwlToolSource) — Indirect Only

All cwltool access goes through ToolProxy methods. The one exception is `self.tool_proxy._tool.tool.get("successCodes")` which reads the raw CWL dict for exit code parsing.

---

## cwltool Object Lifecycle

```
                    LOADING
                    =======
SchemaLoader.raw_process_reference(path)
    → load_tool.fetch_document(uri, loading_context)
    → RawProcessReference(loading_context, process_object, uri)

SchemaLoader.process_definition(raw_ref)
    → resolve_and_validate_document(loading_context, process_object, uri)
    → ResolvedProcessDefinition(loading_context, uri)

SchemaLoader.tool(process_definition)
    → load_tool.make_tool(uri, loading_context)
    → Process (CommandLineTool | ExpressionTool | Workflow)

                    WRAPPING
                    ========
_cwl_tool_object_to_proxy(Process)
    → CommandLineToolProxy(Process) | ExpressionToolProxy(Process)

_hack_cwl_requirements(Process)
    → Moves DockerRequirement from .requirements to .hints

                    JOB CREATION
                    ============
ToolProxy.job_proxy(input_dict, output_dict, job_directory)
    → JobProxy.__init__()
        → _normalize_job()
            → process.fill_in_defaults(tool.inputs, input_dict, fs_access)
            → visit_class(input_dict, ("File","Directory"), pathToLoc)
        → (lazy) _ensure_cwl_job_initialized()
            → Process.job(input_dict, output_callback, runtime_context) → Job

                    COMMAND EXTRACTION
                    ==================
JobProxy.command_line    → Job.command_line (with GALAXY_SLOTS unsentineling)
JobProxy.stdin/stdout/stderr → Job.stdin/stdout/stderr
JobProxy.environment     → Job.environment

                    FILE STAGING
                    ============
JobProxy.stage_files()
    → process.stage_files(Job.pathmapper, stageFunc)
    → pathmapper.PathMapper(Job.generatefiles["listing"], ...)
    → process.stage_files(generate_mapper, stageFunc)
    → relink_initialworkdir(generate_mapper, ...)

                    PERSISTENCE
                    ===========
JobProxy.save_job()
    → Writes .cwl_job.json (tool repr + inputs + outputs)

                    OUTPUT COLLECTION
                    =================
load_job_proxy(job_directory)
    → Reads .cwl_job.json
    → tool_proxy_from_persistent_representation()
    → ToolProxy.job_proxy() → new JobProxy

JobProxy.collect_outputs(working_dir, exit_code)
    → CommandLineTool: Job.collect_outputs(outdir, rcode)
    → ExpressionTool: Job.run(RuntimeContext({})) → output via callback
```

---

## Cross-Reference: Do the Calls Make Sense?

### Correct and Clean

| Call | Verdict |
|------|---------|
| `load_tool.fetch_document()` / `resolve_and_validate_document()` / `make_tool()` | Standard three-phase loading pipeline. Correct. |
| `process.fill_in_defaults()` | Standard API for applying CWL defaults. Correct. |
| `visit_class()` | Standard recursive visitor. Correct. |
| `Process.job()` → `next()` | Standard way to create a cwltool Job. Correct. |
| `Job.collect_outputs()` | Standard output collection for CommandLineTools. Correct. |
| `Job.run()` for ExpressionTools | Standard expression execution. Correct. |
| `process.stage_files()` + `PathMapper` | Standard file staging. Correct. |
| `relink_initialworkdir()` | Standard InitialWorkDirRequirement handling. Correct. |
| `ref_resolver.uri_file_path()` | Simple URI conversion. Correct. |
| `use_container=False` | Galaxy handles containers. Correct. |
| `strict_cwl_validation=False` at runtime | Avoid re-validating at execution time. Correct. |

### Workarounds / Hacks

| Call | Issue | Assessment |
|------|-------|------------|
| `_hack_cwl_requirements()` — move DockerRequirement to hints | cwltool would try to run Docker if it's a requirement | Necessary hack. Galaxy's container system is authoritative. |
| Format stripping from `inputs_record_schema` | cwltool validates input formats, Galaxy doesn't track CWL format URIs | Necessary hack. Without this, cwltool rejects inputs missing format. Could be solved by tracking format URIs on datasets. |
| `SENTINEL_GALAXY_SLOTS_VALUE` in `_select_resources` | Galaxy doesn't know slot count at job-preparation time | Fragile hack. Works in practice because the sentinel is unlikely to collide. Better solution would defer Job construction to the compute node. |
| Shallow copy of Process + deep copy of `inputs_record_schema` | `Process.job()` mutates `inputs_record_schema` in place | Necessary workaround for cwltool's lack of thread safety. |
| `rewrite_inputs_for_staging()` fallback | Manually symlinks when pathmapper isn't available (ExpressionTools) | Incomplete — the pathmapper-based path is commented out. Works for simple cases. |

### Unused / Potentially Dead

| Import | Status |
|--------|--------|
| `normalizeFilesDirs` | Imported in cwltool_deps.py, exported in `__all__`, but grep finds no usage in Galaxy code |
| `command_line_tool` | Imported but never referenced directly |

---

## Implications for the Migration

### What Changes

The migration to validated tool state changes **how input data reaches JobProxy**, not how JobProxy uses cwltool. Currently:

- **Legacy**: Galaxy param_dict → `to_cwl_job()` → CWL input dict → JobProxy
- **New path**: validated_tool_state.input_state → (needs runtimeify) → CWL input dict → JobProxy

JobProxy's cwltool API usage stays the same either way. The calls to `fill_in_defaults`, `Process.job()`, `stage_files`, and `collect_outputs` are unchanged.

### What Stays

All cwltool API calls in parser.py are correct for the migration. The proxy layer is well-designed — it isolates cwltool behind clean interfaces. The three areas that remain:

1. **Document loading** (schema.py) — Unchanged by migration
2. **Job execution** (JobProxy) — Input format changes, API calls stay the same
3. **Output collection** (runtime_actions.py via JobProxy) — Unchanged by migration

### What the Runtimeify Step Must Produce

For `_normalize_job()` and subsequently `Process.job()` to work, the input dict must contain:

- File inputs as `{"class": "File", "path": "/absolute/path", ...}` or `{"class": "File", "location": "file:///path", ...}` (the `pathToLoc` callback in `_normalize_job` converts `path` to `location`)
- Directory inputs similarly
- Scalar values as plain Python types
- Optional null inputs omitted or set to `None`
- `fill_in_defaults` will fill in any missing inputs that have CWL defaults

This is what the CWL-specific runtimeify must produce from `JobInternalToolState` (which has `{src: "hda", id: N}` references).

### Potential Simplification

`normalizeFilesDirs` is imported but unused — could be cleaned up. The `command_line_tool` import is also dead. Neither affects functionality.
