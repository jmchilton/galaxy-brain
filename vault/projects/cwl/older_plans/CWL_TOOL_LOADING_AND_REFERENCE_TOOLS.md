# CWL Tool Loading and Reference Test Infrastructure

Research document covering how Galaxy loads CWL tools from `.cwl` files into executable `Tool` objects, how the CWL reference/conformance test infrastructure works, and how loaded CWL tools interact with the tool request API.

Branch: `cwl_on_tool_request_api_2`

---

## Table of Contents

1. [Topic 1: How Galaxy Loads CWL Tools](#topic-1-how-galaxy-loads-cwl-tools)
2. [Topic 2: CWL Reference Test Infrastructure](#topic-2-cwl-reference-test-infrastructure)
3. [Topic 3: Tool Loading and the Tool Request API](#topic-3-tool-loading-and-the-tool-request-api)

---

## Topic 1: How Galaxy Loads CWL Tools

### Overview

The CWL tool loading pipeline transforms a `.cwl` file into a fully usable Galaxy `Tool` object through a multi-layered chain:

```
.cwl file
  -> get_tool_source() (factory.py:105-111)
    -> CwlToolSource (parser/cwl.py:72)
      -> tool_proxy() (cwl/parser.py:761)
        -> SchemaLoader.tool() (cwl/schema.py:94)
          -> cwltool loads & validates CWL document
        -> _cwl_tool_object_to_proxy() (cwl/parser.py:858)
          -> CommandLineToolProxy or ExpressionToolProxy
    -> CwlToolSource.parse_tool_type() returns "cwl" or "galactic_cwl"
  -> create_tool_from_source() (__init__.py:450)
    -> tool_types["cwl"] -> CwlTool class
    -> Tool.__init__() calls tool.parse(tool_source)
      -> CwlCommandBindingTool.parse() stores _cwl_tool_proxy
      -> Tool.parse_inputs() -> input_models_for_pages() -> CWL parameter models
```

### Step 1: File Detection and ToolSource Creation

**Entry point**: `get_tool_source()` in `lib/galaxy/tool_util/parser/factory.py:64-114`

When Galaxy encounters a `.cwl` (or `.json`) file, it is identified as a CWL tool:

```python
# factory.py:105-111
elif config_file.endswith(".json") or config_file.endswith(".cwl"):
    uuid = uuid or uuid4()
    return CwlToolSource(config_file, strict_cwl_validation=strict_cwl_validation,
                         tool_id=tool_id, uuid=uuid)
```

For CWL tools to be recognized by the directory loader, `enable_beta_formats` must be `True`:

- `lib/galaxy/tool_util/loader_directory.py:119-150` - `looks_like_a_tool()` only checks CWL files when `enable_beta_formats=True`
- `lib/galaxy/tool_util/loader_directory.py:253-277` - `_find_tool_files()` only searches non-XML files when `enable_beta_formats=True`
- `lib/galaxy/config/__init__.py:960` - Galaxy config: `enable_beta_tool_formats` (default: `False`)
- Test driver sets `enable_beta_tool_formats=True` at `lib/galaxy_test/driver/driver_util.py:212`

### Step 2: CwlToolSource and the ToolProxy

**File**: `lib/galaxy/tool_util/parser/cwl.py:72-346`

`CwlToolSource` extends `ToolSource` (the abstract interface all tool formats implement). It lazily creates a `ToolProxy` on first access:

```python
# cwl.py:93-116
@property
def tool_proxy(self) -> "ToolProxy":
    if self._tool_proxy is None:
        if self._source_path is not None:
            self._tool_proxy = tool_proxy(
                self._source_path,
                strict_cwl_validation=self._strict_cwl_validation,
                tool_directory=self._tool_directory,
                tool_id=self._tool_id,
                uuid=self._uuid,
            )
        else:
            # From persistent representation (Celery deserialization)
            self._tool_proxy = tool_proxy_from_persistent_representation(
                self._source_object, ...)
    return self._tool_proxy
```

Key parse methods on `CwlToolSource`:

| Method | Returns | Notes |
|--------|---------|-------|
| `parse_tool_type()` (line 125) | `"cwl"` or `"galactic_cwl"` | Checks for `gx:Interface` hint |
| `parse_command()` (line 137) | `"$__cwl_command"` | Placeholder; real command built by cwltool at exec time |
| `parse_input_pages()` (line 223) | `PagesSource([CwlPageSource], inputs_style="cwl")` | Creates CWL-style input page |
| `parse_outputs()` (line 228) | `(outputs, output_collections)` | Delegates to ToolProxy.output_instances() |
| `parse_requirements()` (line 305) | containers, software reqs | Extracts DockerRequirement, SoftwareRequirement, etc. |
| `parse_profile()` (line 322) | `"17.09"` | Hardcoded CWL profile |
| `to_string()` (line 344) | JSON string | For Celery serialization; calls `tool_proxy.to_persistent_representation()` |

The `gx:Interface` hint determines tool type:
- With `gx:Interface` (e.g., `galactic_cat.cwl`): `tool_type = "galactic_cwl"` -> `GalacticCwlTool` class
- Without `gx:Interface`: `tool_type = "cwl"` -> `CwlTool` class

### Step 3: Schema Loading Pipeline

**File**: `lib/galaxy/tool_util/cwl/schema.py:1-111`

The `SchemaLoader` class wraps cwltool's document loading pipeline:

```python
# schema.py:32-110
class SchemaLoader:
    def __init__(self, strict=True, validate=True):
        self._strict = strict
        self._validate = validate

    def loading_context(self):
        # Creates cwltool LoadingContext with:
        loading_context.strict = self._strict
        loading_context.do_validate = self._validate
        loading_context.enable_dev = True    # allows dev CWL versions
        loading_context.do_update = True
        loading_context.relax_path_checks = True

    def raw_process_reference(self, path):
        # Step 1: Normalize path, create file:// URI
        # Step 2: load_tool.fetch_document(uri, loadingContext)
        # Returns: RawProcessReference(loading_context, process_object, uri)

    def process_definition(self, raw_process_reference):
        # Step 3: resolve_and_validate_document() - full CWL validation
        # Returns: ResolvedProcessDefinition

    def tool(self, **kwds):
        # Step 4: load_tool.make_tool() - creates cwltool Process object
        # Returns: cwltool Process (CommandLineTool or ExpressionTool)
```

Two singleton instances:
- `schema_loader = SchemaLoader()` - strict, validating (line 109)
- `non_strict_non_validating_schema_loader = SchemaLoader(strict=False, validate=False)` (line 110)

### Step 4: ToolProxy Construction

**File**: `lib/galaxy/tool_util/cwl/parser.py:127-256, 761-879`

The `tool_proxy()` function (line 761) calls `_to_cwl_tool_object()` (line 811):

```python
# parser.py:811-855
def _to_cwl_tool_object(tool_path=None, tool_object=None, ...):
    schema_loader = _schema_loader(strict_cwl_validation)

    if tool_path is not None:
        # Load from file path
        raw_process_reference = schema_loader.raw_process_reference(tool_path)
        cwl_tool = schema_loader.tool(raw_process_reference=raw_process_reference)
    elif tool_object is not None:
        # Load from dict/YAML object (for persistent representations)
        tool_object = yaml_no_ts().load(json.dumps(tool_object))
        raw_process_reference = schema_loader.raw_process_reference_for_object(tool_object)
        cwl_tool = schema_loader.tool(raw_process_reference=raw_process_reference)

    _hack_cwl_requirements(cwl_tool)  # Galaxy-specific requirement adjustments
    check_requirements(raw_tool)       # Validate supported requirements

    return _cwl_tool_object_to_proxy(cwl_tool, tool_id, uuid, ...)
```

`_cwl_tool_object_to_proxy()` (line 858) selects the proxy class based on `class`:

```python
# parser.py:858-879
def _cwl_tool_object_to_proxy(cwl_tool, tool_id, uuid, ...):
    process_class = raw_tool["class"]
    if process_class == "CommandLineTool":
        proxy_class = CommandLineToolProxy
    elif process_class == "ExpressionTool":
        proxy_class = ExpressionToolProxy
    else:
        raise Exception("File not a CWL CommandLineTool.")
    return proxy_class(cwl_tool, tool_id, uuid, raw_process_reference, tool_path)
```

**ToolProxy base class** (line 127-256) provides:

- `job_proxy(input_dict, output_dict, job_directory)` (line 150) - creates a `JobProxy` for execution
- `galaxy_id()` (line 162) - derives Galaxy tool ID from CWL `id` field or UUID
- `to_persistent_representation()` (line 199) - serializes for Celery/database storage
- `from_persistent_representation()` (line 215) - deserializes
- `requirements` / `hints_or_requirements_of_class()` - CWL requirement access

**Constructor** (line 130-148) strips `format` from input fields to prevent cwltool validation errors:

```python
for input_field in self._tool.inputs_record_schema["fields"]:
    if "format" in input_field:
        del input_field["format"]
```

**CommandLineToolProxy** (line 258-322) adds:

- `input_fields()` (line 278) - reads `inputs_record_schema["fields"]`, resolves `schemaDefs`
- `input_instances()` (line 305) - converts fields to `InputInstance` objects
- `output_instances()` (line 308) - reads `outputs_record_schema["fields"]`
- `docker_identifier()` (line 315) - extracts DockerRequirement

**ExpressionToolProxy** (line 325) - subclass of `CommandLineToolProxy`, only changes `_class = "ExpressionTool"`.

### Step 5: Input Parameters - From CWL Schema to Galaxy Parameter Models

CWL inputs flow through two parallel systems:

#### A. Galaxy Legacy Parameters (`parse_inputs` in `__init__.py`)

`Tool.parse_inputs()` at `lib/galaxy/tools/__init__.py:1718-1757`:

```python
def parse_inputs(self, tool_source):
    self.has_galaxy_inputs = False
    pages = tool_source.parse_input_pages()
    # CwlToolSource returns PagesSource with inputs_style="cwl"
    # PagesSource.inputs_defined returns True (style != "none")
    try:
        parameters = input_models_for_pages(pages, self.profile)
        self.parameters = parameters
    except Exception:
        pass
    if pages.inputs_defined:
        self.has_galaxy_inputs = True  # <-- WAS True for CWL
        # BUT the new branch bypasses this for CWL
```

**Key change on this branch**: `has_galaxy_inputs` is set `True` because `inputs_style="cwl"` is not `"none"`. However, the `expand_incoming_async()` method at line 2183-2191 checks `self.has_galaxy_inputs` to decide whether to run Galaxy's parameter expansion machinery. When `has_galaxy_inputs=False` (forced for CWL in the new path), the raw state passes through.

#### B. CWL Parameter Models (New typed system)

`CwlPageSource` (parser/cwl.py:366) creates `CwlInputSource` objects from the tool proxy's `input_instances()`.

These flow into `input_models_for_pages()` at `lib/galaxy/tool_util/parameters/factory.py:453`:

```python
def from_input_source(input_source, profile):
    if input_source.input_class == "cwl":   # CwlInputSource.input_class returns "cwl"
        tool_parameter = _from_input_source_cwl(input_source)
    else:
        tool_parameter = _from_input_source_galaxy(input_source, profile)
```

`_from_input_source_cwl()` (factory.py:421-436) maps CWL schema-salad types to parameter models:

| CWL Type | Galaxy Parameter Model | `parameter_type` |
|----------|----------------------|-------------------|
| `int` | `CwlIntegerParameterModel` | `"cwl_integer"` |
| `float` | `CwlFloatParameterModel` | `"cwl_float"` |
| `string` | `CwlStringParameterModel` | `"cwl_string"` |
| `boolean` | `CwlBooleanParameterModel` | `"cwl_boolean"` |
| `null` | `CwlNullParameterModel` | `"cwl_null"` |
| `org.w3id.cwl.cwl.File` | `CwlFileParameterModel` | `"cwl_file"` |
| `org.w3id.cwl.cwl.Directory` | `CwlDirectoryParameterModel` | `"cwl_directory"` |
| `[type1, type2, ...]` (union) | `CwlUnionParameterModel` | `"cwl_union"` |

These models live in `lib/galaxy/tool_util_models/parameters.py:1943-2100`.

**CwlFileParameterModel** and **CwlDirectoryParameterModel** (lines 2061-2088) both use `DataRequest` as their `py_type`, meaning the API expects `{src: "hda", id: <encoded_id>}` for dataset inputs.

### Step 6: Tool Class Instantiation

**File**: `lib/galaxy/tools/__init__.py:450-472, 5085-5103`

```python
# Line 460-466
elif tool_type := tool_source.parse_tool_type():
    ToolClass = tool_types.get(tool_type)
    if ToolClass is None:
        if tool_type == "cwl":
            raise ToolLoadError("Runtime support for CWL tools is not implemented currently")

# Line 5085-5103 - TOOL_CLASSES list includes:
#   CwlTool,            # tool_type = "cwl"
#   GalacticCwlTool,    # tool_type = "galactic_cwl"
tool_types = {tool_class.tool_type: tool_class for tool_class in TOOL_CLASSES}
```

Note: The error at line 463-464 fires only if `CwlTool` is not in `TOOL_CLASSES` (i.e., on mainline Galaxy without CWL support). On this CWL branch, `CwlTool` IS in the list.

### CWL Tool Class Hierarchy

```
Tool  (lib/galaxy/tools/__init__.py)
  └── CwlCommandBindingTool  (line 3754)
        ├── GalacticCwlTool   (line 3843, tool_type="galactic_cwl")
        └── CwlTool           (line 3855, tool_type="cwl")
```

**CwlCommandBindingTool** (line 3754-3840):
- `exec_before_job()` - Creates `JobProxy`, pre-computes command via cwltool, stages files
- `parse()` (line 3831) - Stores `_cwl_tool_proxy` from `tool_source.tool_proxy`
- `param_dict_to_cwl_inputs()` - Abstract, raises `NotImplementedError`

**CwlTool** (line 3855-3873):
- `tool_type = "cwl"`
- `may_use_container_entry_point = True`
- `param_dict_to_cwl_inputs()` - Legacy path via `to_cwl_job()` (not used in new path)
- `inputs_from_dict()` (line 3866) - Translates API payloads between `galaxy` and `cwl` representations

**GalacticCwlTool** (line 3843-3852):
- `tool_type = "galactic_cwl"`
- `param_dict_to_cwl_inputs()` - Uses `galactic_flavored_to_cwl_job()` (legacy)

### Serialization for Celery

CWL tools serialize/deserialize for Celery task processing:

1. **Serialize**: `Tool.to_raw_tool_source()` (__init__.py:1799) calls `CwlToolSource.to_string()` (parser/cwl.py:344), which calls `ToolProxy.to_persistent_representation()` (cwl/parser.py:199). Returns JSON containing `class`, `raw_process_reference` (the raw CWL doc), `tool_id`, and `uuid`.

2. **Deserialize**: `create_tool_from_representation()` (__init__.py:475) calls `get_tool_source(tool_source_class="CwlToolSource", raw_tool_source=json_string)`, which calls `build_cwl_tool_source()` (factory.py:48), which calls `tool_proxy_from_persistent_representation()`.

3. The `tool_source_class` is persisted as `"CwlToolSource"` (it's `type(self.tool_source).__name__`).

### Supported CWL Requirements

From `lib/galaxy/tool_util/cwl/parser.py:82-96`:

```python
SUPPORTED_TOOL_REQUIREMENTS = [
    "CreateFileRequirement",
    "DockerRequirement",
    "EnvVarRequirement",
    "InitialWorkDirRequirement",
    "InlineJavascriptRequirement",
    "LoadListingRequirement",
    "ResourceRequirement",
    "ShellCommandRequirement",
    "ScatterFeatureRequirement",
    "SchemaDefRequirement",
    "SubworkflowFeatureRequirement",
    "StepInputExpressionRequirement",
    "MultipleInputFeatureRequirement",
    "CredentialsRequirement",
]
```

---

## Topic 2: CWL Reference Test Infrastructure

### Conformance Test Provisioning: `update_cwl_conformance_tests.sh`

The CWL conformance test tools are **not vendored or submoduled**. They are downloaded on-demand by `scripts/update_cwl_conformance_tests.sh` and not committed to git. This is a two-stage process:

#### Stage 1: Shell Script Downloads Tools

**File**: `scripts/update_cwl_conformance_tests.sh`

For each CWL version (1.0, 1.1, 1.2):

1. **Downloads** the official CWL spec repo as a zip from GitHub:
   - v1.0: `common-workflow-language/common-workflow-language` repo
   - v1.1: `common-workflow-language/cwl-v1.1` repo
   - v1.2: `common-workflow-language/cwl-v1.2` repo

2. **Extracts** into `test/functional/tools/cwl_tools/v{version}/`:
   - `conformance_tests.yaml` — the test manifest (different source paths per version: v1.0 uses `v1.0/conformance_test_v1.0.yaml`, others use root `conformance_tests.yaml`)
   - The test tools directory — v1.0 copies `v1.0/v1.0/` (creating the `cwl_tools/v1.0/v1.0/` path that `sample_tool_conf.xml` references), others copy `tests/`

3. **Runs** `scripts/cwl_conformance_to_test_cases.py` to generate Python test files

Result directory structure after running:
```
test/functional/tools/cwl_tools/
├── v1.0/
│   ├── conformance_tests.yaml
│   └── v1.0/                    # actual test tools (cat1-testcli.cwl, bwa-mem-tool.cwl, etc.)
├── v1.0_custom/                 # committed Galaxy-specific CWL test tools
├── v1.1/
│   ├── conformance_tests.yaml
│   └── tests/                   # CWL v1.1 test tools
└── v1.2/
    ├── conformance_tests.yaml
    └── tests/                   # CWL v1.2 test tools
```

#### Stage 2: Python Script Generates Test Cases

**File**: `scripts/cwl_conformance_to_test_cases.py`

1. **Reads** `conformance_tests.yaml` recursively (following `$import` references via its own `conformance_tests_gen()`)
2. For each conformance test entry, **generates a pytest method** in a `TestCwlConformance` class:
   ```python
   @pytest.mark.cwl_conformance
   @pytest.mark.cwl_conformance_v1_0
   @pytest.mark.command_line_tool  # from CWL test tags
   @pytest.mark.green             # or @pytest.mark.red
   def test_conformance_v1_0_cat1(self):
       """Test doc string..."""
       self.cwl_populator.run_conformance_test("v1.0", "Test doc string...")
   ```
3. Tests are marked **red** (known-failing in Galaxy) or **green** based on a hardcoded `RED_TESTS` dict:
   - v1.0: ~30 red tests (mostly scatter/valuefrom/subworkflow/secondary files)
   - v1.1: ~50 red tests (adds timelimit, networkaccess, inplace_update, etc.)
   - v1.2: ~100+ red tests (adds conditionals, v1.2-specific features)
4. **Writes** generated test file to `lib/galaxy_test/api/cwl/test_cwl_conformance_v{version_simple}.py`
5. The generated test class extends `BaseCwlWorkflowsApiTestCase` and each method calls `self.cwl_populator.run_conformance_test(version, doc)` — which looks up the test by `doc` string in `conformance_tests.yaml`, stages inputs, runs the tool/workflow, and compares outputs

The generated test files ARE committed; the downloaded tool files are NOT.

#### Conformance Test Lookup at Runtime

`CwlPopulator.run_conformance_test(version, doc)` (populators.py:3150):
1. Calls `get_conformance_test(version, doc)` which iterates `conformance_tests.yaml` entries matching by `doc` field
2. Each entry has `tool` (relative .cwl path), `job` (input JSON), and `output` (expected output) fields
3. Resolves tool path relative to the conformance test directory
4. Stages inputs via `stage_inputs()` (uploads files referenced in the job JSON)
5. Runs via `_run_cwl_tool_job()` (POST /api/jobs) or `_run_cwl_workflow_job()`
6. Compares outputs using `cwltest.compare.compare()`

### Test Tool Locations

| Location | Committed? | Purpose |
|----------|-----------|---------|
| `test/functional/tools/parameters/cwl_*.cwl` | Yes | CWL parameter type testing (10 files) |
| `test/functional/tools/cwl_tools/v1.0_custom/` | Yes | Galaxy-specific CWL test tools (11 files) |
| `test/functional/tools/cwl_tools/v1.0/v1.0/` | **No** — downloaded | CWL v1.0 conformance tools |
| `test/functional/tools/cwl_tools/v1.1/tests/` | **No** — downloaded | CWL v1.1 conformance tools |
| `test/functional/tools/cwl_tools/v1.2/tests/` | **No** — downloaded | CWL v1.2 conformance tools |
| `test/functional/tools/galactic_cat.cwl` | Yes | Galactic (gx:Interface) CWL tool |
| `test/functional/tools/galactic_record_input.cwl` | Yes | Galactic CWL with record inputs |
| `lib/galaxy_test/api/cwl/test_cwl_conformance_v*.py` | Yes — generated | Generated pytest conformance test cases |

Unit tests in `test/unit/tool_util/test_cwl.py` reference paths like `v1.0/v1.0/cat1-testcli.cwl` — these require `update_cwl_conformance_tests.sh` to have been run first.

### Tool Configuration for Tests

**File**: `test/functional/tools/sample_tool_conf.xml`

All test tools are registered in this file. The CWL section (lines 268-287):

```xml
<!-- CWL Testing -->
<tool file="parameters/cwl_int.cwl" />
<tool file="cwl_tools/v1.0/v1.0/cat3-tool.cwl" />
<tool file="cwl_tools/v1.0/v1.0/env-tool1.cwl" />
<tool file="cwl_tools/v1.0/v1.0/null-expression1-tool.cwl" />
<tool file="cwl_tools/v1.0/v1.0/null-expression2-tool.cwl" />
<tool file="cwl_tools/v1.0/v1.0/optional-output.cwl" />
<tool file="cwl_tools/v1.0/v1.0/parseInt-tool.cwl" />
<tool file="cwl_tools/v1.0/v1.0/record-output.cwl" />
<tool file="cwl_tools/v1.0/v1.0/sorttool.cwl" />
<tool file="cwl_tools/v1.0_custom/any1.cwl" />
<tool file="cwl_tools/v1.0_custom/cat1-tool.cwl" />
<tool file="cwl_tools/v1.0_custom/cat2-tool.cwl" />
<tool file="cwl_tools/v1.0_custom/cat-default.cwl" />
<tool file="cwl_tools/v1.0_custom/default_path_custom_1.cwl" />
<tool file="cwl_tools/v1.0_custom/index1.cwl" />
<tool file="cwl_tools/v1.0_custom/optional-output2.cwl" />
<tool file="cwl_tools/v1.0_custom/showindex1.cwl" />
<tool file="galactic_cat.cwl" />
<tool file="galactic_record_input.cwl" />
```

**Note**: Several entries reference `cwl_tools/v1.0/v1.0/*.cwl` which do not exist on this branch. These tools would fail to load. Only `parameters/cwl_int.cwl`, the `v1.0_custom/` tools, and the root-level galactic tools exist.

### Test Framework Configuration

**File**: `lib/galaxy_test/driver/driver_util.py`

Key constants:
- `FRAMEWORK_TOOLS_DIR = os.path.join(GALAXY_TEST_DIRECTORY, "functional", "tools")` (line 60)
- `FRAMEWORK_SAMPLE_TOOLS_CONF = os.path.join(FRAMEWORK_TOOLS_DIR, "sample_tool_conf.xml")` (line 62)
- `enable_beta_tool_formats=True` (line 212) - required for `.cwl` file loading

Tool conf is resolved at line 177:
```python
tool_conf = os.environ.get("GALAXY_TEST_TOOL_CONF", default_tool_conf)
```

### CWL Parameter Specification Tests

**File**: `test/unit/tool_util/parameter_specification.yml` (lines 3946-4196)

Defines validation test cases for CWL parameter types. These test the `CwlParameterModel` pydantic models:

```yaml
cwl_int:
  request_valid:
    - parameter: 5
  request_invalid:
    - parameter: "5"   # must be strict int
    - {}               # required
    - parameter: null

cwl_file:
  request_valid:
   - parameter: {src: hda, id: abcdabcd}
  request_invalid:
   - parameter: {src: hda, id: 7}        # id must be encoded
   - parameter: {src: hdca, id: abcdabcd} # hdca not valid for File
   - parameter: null
```

These are tested by `test/unit/tool_util/test_parameter_specification.py`.

### API Test Infrastructure

**File**: `lib/galaxy_test/api/test_tools_cwl.py`

`TestCwlTools` class runs CWL tools via Galaxy's API. Two execution paths:

1. **Galaxy representation** (`_run` method, line 374): Uses `run_tool_payload()` which posts to `/api/tools` with Galaxy-format inputs (`{src: "hda", id: ...}`)

2. **CWL representation** (line 54-64): Same endpoint but with `inputs_representation="cwl"`, sending native CWL inputs

3. **CWL job files** (via `CwlPopulator.run_cwl_job()`, line 67-73): Uses tool request API (`POST /api/jobs`) with CWL job JSON

### CwlPopulator

**File**: `lib/galaxy_test/base/populators.py:3019-3178`

Key constant:
```python
CWL_TOOL_DIRECTORY = os.path.join(galaxy_root_path, "test", "functional", "tools", "cwl_tools")
# => test/functional/tools/cwl_tools
```

Methods:

- `run_cwl_job(artifact, job_path, ...)` (line 3084): Main entry point. Determines if artifact is tool or workflow, stages inputs via `stage_inputs()`, then dispatches to `_run_cwl_tool_job()` or `_run_cwl_workflow_job()`.

- `_run_cwl_tool_job(tool_id, job, history_id)` (line 3030): Posts to tool request API via `tool_request_raw()`. If tool doesn't exist in Galaxy, creates it as a dynamic tool via `create_tool_from_path()`.

- `run_conformance_test(version, doc)` (line 3150): Loads conformance test spec, runs the CWL job, and compares outputs using `cwltest.compare.compare()`.

- `get_conformance_test(version, doc)` (line 3024): Looks up a test by its `doc` field from `conformance_tests.yaml` in the test directory.

### Conformance Test Discovery

**File**: `lib/galaxy_test/base/populators.py:320-331`

```python
def conformance_tests_gen(directory, filename="conformance_tests.yaml"):
    conformance_tests_path = os.path.join(directory, filename)
    with open(conformance_tests_path) as f:
        conformance_tests = yaml.safe_load(f)
    for conformance_test in conformance_tests:
        if "$import" in conformance_test:
            import_dir, import_filename = os.path.split(conformance_test["$import"])
            yield from conformance_tests_gen(os.path.join(directory, import_dir), import_filename)
        else:
            conformance_test["directory"] = directory
            yield conformance_test
```

This expects `conformance_tests.yaml` in each CWL version directory (e.g., `test/functional/tools/cwl_tools/v1.0/conformance_tests.yaml`). Each test entry has `tool`, `job`, `output`, and `doc` fields.

### Test Categories

| Test Type | Location | Runs Against | Requires v1.0/v1.0? |
|-----------|----------|-------------|---------------------|
| Unit: ToolProxy creation | `test/unit/tool_util/test_cwl.py` | cwltool directly | Yes |
| Unit: Parameter validation | `test/unit/tool_util/test_parameter_specification.py` | Pydantic models | No (uses parameters/ tools) |
| Unit: Runtime model | `test/unit/tool_util/test_parameter_cwl_runtime_model.py` | Galaxy parameter models | No (uses Galaxy tools) |
| API: Tool execution | `lib/galaxy_test/api/test_tools_cwl.py` | Running Galaxy server | Yes (mostly), some use v1.0_custom |
| Conformance: CWL spec | Via `CwlPopulator.run_conformance_test()` | Running Galaxy server | Yes |

### CWL Test Tool Examples

**ExpressionTool** (parameters/cwl_int.cwl):
```yaml
class: ExpressionTool
requirements:
  - class: InlineJavascriptRequirement
cwlVersion: v1.2
inputs:
  parameter:
    type: int
outputs:
  output: int
expression: "$({'output': inputs.parameter})"
```

**CommandLineTool** (v1.0_custom/cat1-tool.cwl):
```yaml
class: CommandLineTool
cwlVersion: v1.0
inputs:
  file1:
    type: File
    inputBinding: {position: 1}
  numbering:
    type: boolean?
    inputBinding: {position: 0, prefix: -n}
baseCommand: cat
outputs: {}
```

**Galactic CWL Tool** (galactic_cat.cwl) - with `gx:Interface`:
```yaml
class: CommandLineTool
$namespaces:
  gx: "http://galaxyproject.org/cwl#"
hints:
  gx:interface:
    gx:inputs:
      - gx:name: input1
        gx:type: data
        gx:format: 'txt'
```

---

## Topic 3: Tool Loading and the Tool Request API

### How CWL Tools Enter the Tool Request API

CWL tools now use the tool request API (`POST /api/jobs`) instead of the legacy `POST /api/tools` path. The flow:

```
POST /api/jobs (CwlPopulator._run_cwl_tool_job)
  -> lib/galaxy/webapps/galaxy/services/jobs.py
    -> creates ToolRequest model
    -> dispatches Celery task: queue_jobs
      -> JobCreationManager.queue_jobs() (lib/galaxy/managers/jobs.py:2174)
        -> dereference() - converts URIs to HDAs
        -> tool.handle_input_async() - creates Job
```

### Dereference Step

**File**: `lib/galaxy/managers/jobs.py:2129-2172`

Before `handle_input_async()`, the dereferencer converts raw data requests to internal HDA references:

```python
tool_state = RequestInternalToolState(tool_request.request)
return dereference(tool_state, tool, dereference_callback, dereference_collection_callback), new_hdas
```

For CWL tools, `CwlFileParameterModel` and `CwlDirectoryParameterModel` have `py_type = DataRequest` (which expects `{src: "hda", id: <encoded_id>}`). The dereference step converts URI-based requests to internal HDA IDs.

### handle_input_async for CWL

**File**: `lib/galaxy/tools/__init__.py:2377`

After dereference, `queue_jobs()` calls:

```python
tool.handle_input_async(
    request_context,
    tool_request,
    tool_state,       # RequestInternalDereferencedToolState
    history=target_history,
    use_cached_job=use_cached_jobs,
    rerun_remap_job_id=rerun_remap_job_id,
)
```

Inside `handle_input_async`, `expand_incoming_async()` is called:

```python
# __init__.py:2183-2191
if self.has_galaxy_inputs:
    expanded_incomings, job_tool_states, collection_info = expand_meta_parameters_async(...)
else:
    # CWL tools: pass state through as-is
    expanded_incomings = [deepcopy(tool_request_internal_state.input_state)]
    job_tool_states = [deepcopy(tool_request_internal_state.input_state)]
    collection_info = None
```

Since CWL tools bypass Galaxy's parameter expansion, the input state passes through unchanged. A `JobInternalToolState` is created and validated against the tool's CWL parameter models:

```python
internal_tool_state = JobInternalToolState(job_tool_state)
internal_tool_state.validate(self, f"{self.id} (job internal model)")
```

### Job Persistence

**File**: `lib/galaxy/tools/execute.py:254-256`

```python
if execution_slice.validated_param_combination:
    tool_state = execution_slice.validated_param_combination.input_state
    job.tool_state = tool_state
```

The `JobInternalToolState.input_state` dict is persisted as JSON on the Job model. For CWL tools, this contains the raw CWL-compatible inputs with dataset references as `{src: "hda", id: <int>}`.

### Celery Serialization of CWL Tools

The tool request API dispatches jobs via Celery. The tool itself must be serializable:

**File**: `lib/galaxy/tools/execute.py:326-345`

```python
raw_tool_source, tool_source_class = tool.to_raw_tool_source()
# For CWL: tool_source_class = "CwlToolSource"
# raw_tool_source = JSON string of ToolProxy.to_persistent_representation()
```

On the Celery worker:

```python
# lib/galaxy/celery/tasks.py:83-92
def queue_jobs(tool_id, raw_tool_source, tool_source_class, ...):
    tool = create_tool_from_representation(
        app=app, raw_tool_source=raw_tool_source,
        tool_source_class=tool_source_class  # "CwlToolSource"
    )
```

This reconstructs the full CWL tool from its persistent representation. Fixed in commit `d4d68d2a9b`.

### Job Preparation and Evaluation

When the job is ready to execute:

1. **Evaluator selection** (`jobs/__init__.py:1402-1415`):
   ```python
   if self.tool.base_command or self.tool.shell_command:
       klass = UserToolEvaluator   # YAML tools
   else:
       klass = ToolEvaluator       # CWL tools get this
   ```

2. **State reconstruction** (`evaluation.py:217-220`):
   ```python
   if job.tool_state:
       internal_tool_state = JobInternalToolState(job.tool_state)
       internal_tool_state.validate(self.tool, ...)
   ```

3. **param_dict construction** (`evaluation.py:263-276`):
   ```python
   if self.tool.tool_type == "cwl":
       param_dict = self.param_dict  # plain dict, not TreeDict
       # ...
       # Skip output wrapping, sanitization
       param_dict["__local_working_directory__"] = self.local_working_directory
       return param_dict
   ```

4. **Hook execution** - calls `exec_before_job(validated_tool_state=internal_tool_state)`

5. **exec_before_job** (`__init__.py:3757-3829`): Takes `validated_tool_state.input_state`, creates `JobProxy`, pre-computes command via cwltool, stores in `param_dict["__cwl_command"]`.

### The Input State Gap

Currently there is a structural gap in the new path: `validated_tool_state.input_state` at `exec_before_job` time still contains dataset references (`{src: "hda", id: N}`) rather than CWL File objects with paths. The `JobProxy._normalize_job()` expects File objects with `path` or `location` keys.

This conversion (dataset reference -> CWL File object with filesystem path) is the key missing piece. In the YAML tool path, `runtimeify()` + `setup_for_runtimeify()` handles this. For CWL, it needs to happen somewhere between state reconstruction and `JobProxy` creation, enriched with CWL-specific data (secondaryFiles, format URIs, etc.).

### Dynamic Tool Loading (Test Infrastructure)

When a CWL tool is not pre-loaded in the toolbox, tests create it dynamically:

```python
# populators.py:3040-3050
if os.path.exists(tool_id):
    tool_versions = self.dataset_populator._get("tools", data=dict(tool_id=raw_tool_id)).json()
    if tool_versions:
        galaxy_tool_id = raw_tool_id
    else:
        dynamic_tool = self.dataset_populator.create_tool_from_path(tool_id)
        galaxy_tool_id = None
        tool_uuid = dynamic_tool["uuid"]
```

`create_tool_from_path()` (line 1057) posts to Galaxy's dynamic tool creation API with `src="from_path"`. This uses `lib/galaxy/managers/tools.py` which requires `enable_beta_tool_formats` config.

### Test API Paths

| Test Method | API Endpoint | Input Format | Notes |
|------------|--------------|-------------|-------|
| `_run()` in test_tools_cwl.py | `POST /api/tools` | Galaxy (`{src: "hda", id: ...}`) or CWL | Legacy path |
| `CwlPopulator._run_cwl_tool_job()` | `POST /api/jobs` | CWL-native | New tool request API |
| `CwlPopulator.run_cwl_job()` | Routes to above | CWL job JSON file | Stages inputs first |

### Summary of Loading -> Execution Path

```
1. Tool Loading (startup or dynamic):
   .cwl file -> CwlToolSource -> ToolProxy -> CwlTool/GalacticCwlTool

2. API Request:
   POST /api/jobs {tool_id, inputs: {param: {src: "hda", id: ...}}}

3. Request Processing:
   -> ToolRequest created -> Celery task dispatched
   -> Tool deserialized from CwlToolSource persistent representation
   -> dereference() resolves data references to HDAs

4. Job Creation:
   -> expand_incoming_async() bypasses Galaxy parameter expansion (has_galaxy_inputs=False)
   -> JobInternalToolState validated against CWL parameter models
   -> Job persisted with tool_state = input_state dict

5. Job Execution:
   -> ToolEvaluator (not UserToolEvaluator)
   -> JobInternalToolState reconstructed from job.tool_state
   -> exec_before_job():
      -> input_json = validated_tool_state.input_state
      -> [GAP: needs dataset ref -> File object conversion]
      -> JobProxy(input_json, output_dict, job_dir)
      -> cwltool generates command, stages files
      -> param_dict["__cwl_command"] = command_line
   -> build() uses __cwl_command verbatim

6. Output Collection:
   -> relocate_dynamic_outputs.py (appended to job script)
   -> Reconstructs JobProxy from .cwl_job.json
   -> cwltool's collect_outputs() evaluates output globs
```

---

## Unresolved Questions

1. Only `parameters/cwl_int.cwl` is in `sample_tool_conf.xml` from the parameters directory — should other CWL parameter tools (`cwl_float.cwl`, `cwl_string.cwl`, `cwl_file.cwl`, etc.) be added?

2. The `has_galaxy_inputs` flag for CWL is `True` because `inputs_style="cwl"` satisfies `inputs_defined`. How is this being overridden to `False` in the new path? Is there a separate mechanism?

3. How are CWL `array` and `record` input types handled by the new parameter model system? `_from_input_source_cwl()` only handles simple types and unions — no array/record support yet.

4. `CwlUnionParameterModel` has `request_requires_value = False` (with TODO comment) — is this correct for all unions, or only unions containing `null`?
