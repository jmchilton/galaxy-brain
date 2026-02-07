---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools/testing
  - galaxy/tools
  - galaxy/api
component: Tool Testing Infrastructure
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Galaxy Tool Testing Infrastructure Overview

## Table of Contents
1. [Introduction](#introduction)
2. [Test Definition Parsing](#test-definition-parsing)
3. [Test Loading at Runtime](#test-loading-at-runtime)
4. [Test Verification/Execution](#test-verificationexecution)
5. [Test Execution API Paths](#test-execution-api-paths)
6. [Test Data Handling](#test-data-handling)
7. [Advanced Features](#advanced-features)
8. [Integration Points](#integration-points)

---

## Introduction

Galaxy's tool testing infrastructure is a comprehensive framework for defining, parsing, loading, and executing tests for Galaxy tools. Tests can be defined in both XML (traditional Galaxy format) and YAML (newer format) tool files, and are executed through the `planemo` tool or Galaxy's internal test framework.

### Key Components
- **lib/galaxy/tool_util/parser/** - Parsing engine for tool sources
- **lib/galaxy/tool_util/verify/** - Verification and execution engine for tests
- **lib/galaxy/tools/__init__.py** - Tool class with test integration
- **lib/galaxy/tool_util/verify/asserts/** - Assertion plugins for output verification

---

## Test Definition Parsing

### XML Test Definition Format

Tests are defined in the `<tests>` element of a Galaxy tool XML file with `<test>` children:

```xml
<tests>
  <test>
    <param name="input">input.txt</param>
    <output name="output" file="output.txt" compare="diff" />
  </test>
</tests>
```

### Test Structure (ToolSourceTest)

Defined in `lib/galaxy/tool_util/parser/interface.py`, a ToolSourceTest TypedDict contains:

```python
class ToolSourceTest(TypedDict):
    inputs: ToolSourceTestInputs                    # List of test inputs
    outputs: ToolSourceTestOutputs                  # List of test outputs
    output_collections: List[...]                   # Output collections
    stdout: AssertionList                           # Stdout assertions
    stderr: AssertionList                           # Stderr assertions
    expect_exit_code: Optional[XmlInt]             # Expected exit code
    expect_failure: bool                            # Expect tool to fail
    expect_test_failure: bool                       # Expect test assertion to fail
    maxseconds: Optional[XmlInt]                    # Timeout in seconds
    expect_num_outputs: Optional[XmlInt]            # Expected output count
    command: AssertionList                          # Command line assertions
    command_version: AssertionList                  # Tool version assertions
    value_state_representation: Literal[...]        # "test_case_xml" or "test_case_json"
```

### Test Input Parsing (ToolSourceTestInput)

Test inputs are parsed from `<param>` elements within `<test>` blocks:

```python
class ToolSourceTestInput(TypedDict):
    name: str                                       # Parameter name
    value: Optional[Any]                            # Parameter value
    attributes: ToolSourceTestInputAttributes       # Metadata
```

Input attributes support:
- Simple values: `value="text"` or `values="val1,val2"` for repeats
- JSON values: `value_json='{"key": "value"}'`
- File references: `location="http://..."` (downloads remote files)
- File paths: `value="filename.txt"`
- Composite data with child elements
- Collection definitions via nested `<collection>` elements

**Collection Definition Structure (TestCollectionDef):**
Nested collections are defined inline within test inputs:

```xml
<param name="collection_input">
  <collection type="list">
    <element name="elem1" value="file1.txt" />
    <element name="elem2" value="file2.txt" />
  </collection>
</param>
```

Collections support:
- `type` attribute: collection structure (e.g., "list", "paired")
- Nested collections for hierarchical structures
- Field definitions for ordered collection types (JSON)
- Metadata per element

### Test Output Parsing (ToolSourceTestOutput)

Test outputs are parsed from `<output>` elements:

```python
class ToolSourceTestOutput(TypedDict):
    name: str                                       # Output name
    value: Optional[str]                            # Expected file to compare against
    attributes: ToolSourceTestOutputAttributes      # Comparison settings
```

#### Output Attributes (ToolSourceTestOutputAttributes)

Comprehensive verification options:

```python
class ToolSourceTestOutputAttributes(TypedDict):
    compare: OutputCompareType                      # Comparison method
    lines_diff: int                                 # Lines allowed to differ
    delta: int                                      # Size diff bytes (sim_size)
    delta_frac: Optional[float]                    # Fractional size diff
    sort: bool                                      # Sort before compare
    decompress: bool                                # Decompress before compare
    ftype: Optional[str]                           # Expected file type
    eps: float                                      # Epsilon for numeric comparisons
    metric: str                                     # Image comparison metric
    pin_labels: Optional[Any]                      # Image label pinning
    count: Optional[int]                            # Expected dataset count
    min: Optional[int]                              # Min dataset count
    max: Optional[int]                              # Max dataset count
    metadata: Dict[str, Any]                        # Expected metadata
    md5: Optional[str]                              # Expected MD5 checksum
    checksum: Optional[str]                         # Checksum in "type$hash" format
    primary_datasets: Dict[str, Any]               # Discovered datasets
    elements: Dict[str, Any]                        # Collection element tests
    assert_list: AssertionList                      # Content assertions
    extra_files: List[Dict[str, Any]]              # Extra file definitions
```

### Comparison Methods

Supported comparison types (compare attribute):

1. **diff** (default) - Line-by-line diff with optional sorting/decompression
   - `lines_diff` attribute: number of differing lines allowed
   - `sort` attribute: sort lines before comparison
   - PDF-aware comparison (ignores dates, IDs)

2. **sim_size** - File size comparison
   - `delta`: absolute byte difference allowed
   - `delta_frac`: relative fractional difference (0.0-1.0)

3. **re_match** - Regular expression matching per line
4. **re_match_multiline** - Multiline regex matching
5. **contains** - File containment check
6. **image_diff** - Image comparison
   - `metric`: comparison algorithm (ssim, euclidean, etc.)
   - `eps`: tolerance for numeric comparisons
   - Requires PIL and tifffile libraries

### Collection Output Testing

Tested via `<output_collection>` elements:

```xml
<output_collection name="output_coll" type="list">
  <element name="elem1">
    <assert_contents>
      <has_text text="expected" />
    </assert_contents>
  </element>
</output_collection>
```

**TestCollectionOutputDef:**
- `name`: collection output name
- `collection_type`: type (list, pair, nested_list, etc.)
- `count`/`min`/`max`: expected element counts
- `element_tests`: dict mapping element identifiers to assertions

### Output Assertions (AssertionList)

Assertions are hierarchical XML structures converted to dictionaries:

```xml
<output name="result">
  <assert_contents>
    <has_text text="success" />
    <has_n_lines n="5" delta="1" />
    <has_element_with_path path="root/item" />
  </assert_contents>
</output>
```

**AssertionDict structure:**
```python
class AssertionDict(TypedDict):
    tag: str                                        # Assertion type (e.g., "has_text")
    attributes: Dict[str, Any]                      # Assertion attributes
    children: Optional[List[AssertionDict]]        # Nested assertions
```

### YAML Test Definition Format

YAML tools define tests using native YAML structures:

```yaml
tests:
  - name: "Test 1"
    inputs:
      input_file: "test_data/input.txt"
    outputs:
      output_file:
        file: "expected_output.txt"
        asserts:
          - has_text:
              text: "success"
              n: 1
```

**Key differences from XML:**
- Tests use `name` field for identification
- Inputs/outputs can use dict form (name -> value)
- Assertions use YAML-native format
- Converted to same internal ToolSourceTest structure via `to_test_assert_list()`

### Parsing Functions (lib/galaxy/tool_util/parser/xml.py)

Key parsing functions:

1. **parse_tests_to_dict()** - Entry point for parsing all tests
   - Returns ToolSourceTests dict with "tests" key

2. **_test_elem_to_dict(test_elem, i, profile)** - Parse single test
   - Parses inputs, outputs, output_collections
   - Parses assertions (command, stdout, stderr)
   - Extracts metadata (expect_failure, maxseconds, etc.)

3. **__parse_input_elems()** - Parse test input parameters
   - Handles repeats, conditionals, sections
   - Supports complex nested structures

4. **__parse_output_elem()** - Parse single output
   - Extracts comparison method and parameters
   - Parses assertions and metadata

5. **__parse_test_attributes()** - Extract output attributes
   - Comprehensive parsing of all verification options
   - Handles extra files, discovered datasets, collections

6. **__parse_assert_list_from_elem()** - Convert assertion XML to dict
   - Recursive structure preserving

7. **_test_collection_def_dict()** - Parse collection definitions
   - Handles nested collections
   - Extracts collection type and fields

8. **__parse_param_elem()** - Parse input parameter
   - Supports multiple value types
   - Handles metadata and composites
   - Processes collection definitions

### Profile-Based Behavior

The `profile` attribute on the `<tool>` element affects test parsing:

- **Profile < 20.09**: Element sort order not enforced
- **Profile >= 20.09**: Element order tracked via `expected_sort_order`
- **Profile >= 24.2**: Test validation enabled on load

---

## Test Loading at Runtime

### Tool Class Integration (lib/galaxy/tools/__init__.py)

The `Tool` class loads tests during initialization:

**Loading Flow:**
1. Tool XML/YAML parsed via `get_tool_source()`
2. `parse_tests()` called in `Tool.__init__()`
3. Tests converted via `parse_tool_test_descriptions()`
4. Serialized to JSON and cached in `self.__tests`
5. Lazy-loaded via `self.tests` property

**Code:**
```python
def parse_tests(self):
    if self.tool_source:
        test_descriptions = parse_tool_test_descriptions(
            self.tool_source, self.id, getattr(self, "parameters", None)
        )
        try:
            self.__tests = json.dumps([t.to_dict() for t in test_descriptions], indent=None)
        except Exception:
            self.__tests = None
            log.exception("Failed to parse tool tests for tool '%s'", self.id)

@property
def tests(self):
    if self.__tests:
        return [ToolTestDescription(d) for d in json.loads(self.__tests)]
    return None
```

### Test Description Conversion (lib/galaxy/tool_util/verify/parse.py)

**parse_tool_test_descriptions()** - Entry point:
- Calls `tool_source.parse_tests_to_dict()`
- Creates ToolTestDescription objects for each test
- Validates tests (if profile >= 24.2)
- Returns iterable of ToolTestDescription instances

**Validation Process (if profile >= 24.2):**
- Loads tool parameter models
- Validates each test case against parameters
- Creates RequestAndSchema for each test
- Captures validation exceptions

### ToolTestDescription Class

Defined in `lib/galaxy/tool_util/verify/interactor.py`:

```python
class ToolTestDescription:
    # Identity
    name: str
    tool_id: str
    tool_version: Optional[str]
    test_index: int

    # Test inputs
    inputs: ExpandedToolInputs                      # Flattened input values
    request: Optional[Dict[str, Any]]               # Raw request
    request_schema: Optional[Dict[str, Any]]        # Request schema

    # Expected outputs
    outputs: ToolSourceTestOutputs                  # Output definitions
    output_collections: List[TestCollectionOutputDef]
    num_outputs: Optional[int]

    # Assertions
    stdout: Optional[AssertionList]
    stderr: Optional[AssertionList]
    command_line: Optional[AssertionList]
    command_version: Optional[AssertionList]

    # Expectations
    expect_exit_code: Optional[int]
    expect_failure: bool
    expect_test_failure: bool

    # Metadata
    required_files: RequiredFilesT                  # Test data files
    required_data_tables: RequiredDataTablesT
    required_loc_files: RequiredLocFileT
    maxseconds: Optional[int]

    # Error tracking
    exception: Optional[str]
    value_state_representation: ValueStateRepresentationT
```

### API Exposure

Tests are exposed through Galaxy's REST API:
- **GET /api/tools/{tool_id}/test_data** - Returns ToolTestDescriptionDict list
- Optional `tool_version` parameter for version-specific tests
- Full ToolTestDescription serialization

---

## Test Verification/Execution

### Test Execution Flow (lib/galaxy/tool_util/verify/interactor.py)

**GalaxyInteractorApi** - Main test runner:

1. **Upload test data** (`stage_data_in_history()`)
   - Stages input files to Galaxy history
   - Creates DatasetHistoryAssociations
   - Handles collections

2. **Run tool** (`run_tool()`)
   - Submits tool execution request
   - Waits for job completion
   - Returns RunToolResponse with outputs

3. **Verify outputs**
   - `verify_output()` - Verify single output
   - `verify_output_collection()` - Verify collection
   - `verify_output_dataset()` - Verify dataset content
   - `_verify_metadata()` - Verify metadata attributes

### Output Verification (lib/galaxy/tool_util/verify/__init__.py)

**verify()** - Main verification function:

Performs staged checks:

1. **Assertion verification** (if assert_list present)
   - Calls `verify_assertions()`
   - Checks output content against XML assertions

2. **Checksum verification** (if md5 or checksum present)
   - MD5, SHA1, SHA256, SHA512 supported
   - CWLTest format: "type$hash"

3. **JSON object verification** (if value_json present)
   - JSON parsing and type checking
   - Deep equality comparison

4. **File content comparison** (if file present)
   - Compares actual output to expected file
   - Uses comparison method specified in attributes

### Comparison Implementations

Located in `lib/galaxy/tool_util/verify/__init__.py`:

1. **files_diff()** - Line-by-line comparison
   - Uses difflib.unified_diff
   - Allows sorting
   - Supports decompression
   - PDF-aware (ignores metadata)
   - `lines_diff` tolerance

2. **files_delta()** - File size comparison
   - Absolute byte difference (delta)
   - Relative difference (delta_frac)

3. **files_re_match()** - Per-line regex matching
   - Regex applied to each line

4. **files_re_match_multiline()** - Multiline regex

5. **files_contains()** - File containment

6. **files_image_diff()** - Image comparison
   - Uses PIL and numpy
   - Multiple metrics (ssim, euclidean, etc.)
   - Handles TIFF files

### Assertion Verification (lib/galaxy/tool_util/verify/asserts/)

**verify_assertions()** - Main assertion processor:

1. Optional decompression of output
2. Iterates through assertion list
3. Calls `verify_assertion()` for each

**verify_assertion()** - Single assertion:

1. Maps assertion tag to function
2. Extracts function arguments from XML attributes
3. Handles special arguments:
   - `output` - Unicodified text content
   - `output_bytes` - Raw bytes
   - `verify_assertions_function` - Recursive checking
   - `children` - Nested assertions

**Assertion Modules** (assertion_module_names):
- **text.py** - Text content assertions
  - `assert_has_text(text, n, delta, min, max, negate)`
  - `assert_has_line(line, n, delta, min, max, negate)`
  - `assert_has_n_lines(n, delta, min, max, negate)`
  - `assert_has_text_matching(expression, n, delta, min, max, negate)`
  - `assert_has_line_matching(expression, n, delta, min, max, negate)`
  - `assert_not_has_text(text)`

- **xml.py** - XML assertions
  - `assert_is_valid_xml()`
  - `assert_has_element_with_path(path, negate)`
  - `assert_has_n_elements_with_path(path, n, delta, min, max, negate)`
  - Element text/attribute matching

- **json.py** - JSON assertions
- **tabular.py** - Tabular data assertions
- **hdf5.py** - HDF5 file assertions
- **archive.py** - Archive assertions
- **size.py** - File size assertions
- **image.py** - Image assertions

### Metadata Verification

**_verify_metadata()** - Metadata validation:

Checked against API response for dataset:
- `file_ext` (maps from ftype attribute)
- `name`, `info`, `dbkey`, `tags` - Direct mapping
- Datatype-specific metadata - Prefixed with `metadata_`

Comparison via `compare_expected_metadata_to_api_response()`:
- String comparison with type coercion
- List comparison (tags, etc.)
- Detailed error messages

---

## Test Execution API Paths

Galaxy tool tests can be executed through two different API endpoints, depending on tool configuration and test validation state.

### The Two API Paths

#### 1. Legacy Path: POST `/api/tools`
- **Endpoint**: `POST /api/tools`
- **Format**: Tool inputs serialized as JSON string in `inputs` field
- **Code location**: `lib/galaxy/tool_util/verify/interactor.py:1003` (legacy case in `__submit_tool()`)
- **Used for**:
  - Traditional XML-format tools
  - Tools without validation (profile < 24.2)
  - When `request` field is None in test description
  - When explicitly requested via `use_legacy_api="always"` parameter

#### 2. Modern Path: POST `/api/jobs`
- **Endpoint**: `POST /api/jobs`
- **Format**: Tool inputs as native dict (JSON-compatible), sent with `json=True`
- **Code location**: `lib/galaxy/tool_util/verify/interactor.py:1009` (modern case in `__submit_tool()`)
- **Used for**:
  - YAML-format tools (always forces modern path)
  - Tools with profile >= 24.2 when validation succeeds
  - When `request` field is populated in test description
  - Structured tool state representation

### Conditions for API Path Selection

**Decision logic** (`lib/galaxy/tool_util/verify/interactor.py:703-706`):

```python
submit_with_legacy_api = use_legacy_api == "always" or (use_legacy_api == "if_needed" and request is None)
if testdef.value_state_representation == "test_case_json":
    # Don't submit user / YAML tools to the old endpoint.
    submit_with_legacy_api = False
```

**Modern path (POST /api/jobs) is selected when:**
1. `request` field is not None AND `use_legacy_api != "always"`, OR
2. `value_state_representation == "test_case_json"` (YAML tools always use modern path)

**Legacy path (POST /api/tools) is selected when:**
1. `use_legacy_api == "always"`, OR
2. `use_legacy_api == "if_needed"` AND `request is None` AND `value_state_representation != "test_case_json"`

### Request and Request_Schema Fields

These fields in `ToolTestDescription` control modern API path usage:

#### Request Field
- **Type**: `Optional[Dict[str, Any]]` (contains `input_state`)
- **Populated**: Only when validation succeeds during test load
- **Purpose**: Contains the structured tool state in modern format
- **Code location**: `lib/galaxy/tool_util/verify/parse.py:139` - extracted from `TestCaseToolState.input_state`

#### Request_Schema Field
- **Type**: `Optional[Dict[str, Any]]` (contains tool parameter schema)
- **Populated**: Only when validation succeeds during test load
- **Purpose**: Contains tool parameter definitions needed to encode test inputs
- **Code location**: `lib/galaxy/tool_util/verify/parse.py:140` - converted from `ToolParameterBundleModel.dict()`

**Population condition** (`lib/galaxy/tool_util/verify/parse.py:136-140`):
```python
request: Optional[Dict[str, Any]] = None
request_schema: Optional[Dict[str, Any]] = None
if request_and_schema:
    request = request_and_schema.request.input_state
    request_schema = request_and_schema.request_schema.dict()
```

### Value_State_Representation Field

This field determines how test inputs are represented:

| Value | Tool Format | Set By | Location |
|-------|------------|--------|----------|
| `"test_case_xml"` | Traditional XML tools | XML parser | `lib/galaxy/tool_util/parser/xml.py:821` |
| `"test_case_json"` | YAML format tools | YAML parser | `lib/galaxy/tool_util/parser/yaml.py:429` |

**Role in API selection:**
- When `"test_case_json"`, FORCES use of modern `/api/jobs` path regardless of `request` field
- When `"test_case_xml"`, follows normal decision logic based on `request` and `use_legacy_api`

**Associated StateClass** (`lib/galaxy/tool_util/parameters/state.py`):
- `"test_case_xml"` → uses `TestCaseToolState` class
- `"test_case_json"` → uses `TestCaseJsonToolState` class
- Different validation models based on representation type

### Test Validation and Request Population

Test validation is the mechanism that populates `request` and `request_schema` fields.

**When validation occurs** (`lib/galaxy/tool_util/verify/parse.py:69`):
```python
validate_on_load = Version(tool_source.parse_profile()) >= Version("24.2")
```

**Validation flow** (`lib/galaxy/tool_util/verify/parse.py:78-87`):
1. Load tool parameter models via `input_models_for_tool_source()`
2. Call `test_case_state(raw_test_dict, parameters, profile, validate=True)`
3. Create `TestRequestAndSchema` dataclass with:
   - `request`: The validated `TestCaseToolState.input_state`
   - `request_schema`: The `ToolParameterBundleModel` with tool schema
4. If validation fails, exception is caught and stored in test description

**TestRequestAndSchema** (`lib/galaxy/tool_util/verify/parse.py:112-115`):
```python
@dataclass
class TestRequestAndSchema:
    request: TestCaseToolState
    request_schema: ToolParameterBundleModel
```

### Input Encoding for Modern API Path

When using POST `/api/jobs` with `request` populated:

**Encoding process** (`lib/galaxy/tool_util/verify/interactor.py:732-746`):
1. Adapt datasets: Convert file paths to `DataRequestHda` objects
2. Adapt collections: Convert collection definitions to `DataCollectionRequest` objects
3. Encode test state: Use `encode_test()` with schema-aware models
4. Result: Properly structured inputs compatible with modern jobs API

**Function signature** (`lib/galaxy/tool_util/verify/interactor.py:744-746`):
```python
inputs_tree = encode_test(
    test_case_state,
    input_models_from_json(parameters),
    adapt_datasets,
    adapt_collections
).input_state
```

### Summary of API Path Selection

| Condition | API Used | Notes |
|-----------|----------|-------|
| YAML tool | `/api/jobs` | Always, regardless of other settings |
| Profile >= 24.2 + validation passes | `/api/jobs` | `request` populated |
| Profile < 24.2 | `/api/tools` | Legacy path, `request` is None |
| Profile >= 24.2 + validation fails | `/api/tools` | Exception stored, `request` is None |
| `use_legacy_api="always"` | `/api/tools` | Explicit override |

---

## Test Data Handling

### Test Data Files (RequiredFilesT)

Tests reference external files for:
- Input data
- Expected outputs
- Collections

Files are located via:
1. Tool directory: `{tool_dir}/test-data/{filename}`
2. Repository directory: `{repo_dir}/test-data/{filename}`
3. Galaxy test data: app.test_data_resolver (fallback)

**RequiredFilesT structure:**
```python
RequiredFilesT = List[Tuple[str, Dict[str, Any]]]  # (filename, metadata)
```

Each entry contains:
- `fname`: filename
- `class`: "File" or "Directory"
- `metadata`: dict of metadata
- `composite_data`: list of composite files
- `ftype`: file type (auto, txt, fasta, etc.)
- `dbkey`: database key
- `location`: URL for download
- `tags`: list of tags
- `edit_attributes`: transformations (rename, etc.)

### Collection Test Data

Collections are built from nested test data definitions:

```python
class TestCollectionDef:
    elements: List[TestCollectionDefElementInternal]
    collection_type: Optional[str]                  # "list", "paired", etc.
    fields: Optional[List[FieldDict]]              # For ordered collections
    name: str
    attrib: Dict[str, Any]
```

Supports:
- Nested collections (arbitrary depth)
- Lazy element instantiation
- Conversion between XML and JSON formats

### Test Data Resolution (lib/galaxy/tool_util/verify/test_data.py)

**TestDataResolver**:
- Resolves test data filenames to actual paths
- Checks multiple locations
- Handles remote downloads
- Caches resolved paths

---

## Advanced Features

### Conditional Tests

Tests can include conditional inputs that affect execution:

```xml
<param name="conditional_param">
  <conditional>
    <param name="select" value="option1" />
    <when value="option1">
      <param name="nested" value="data.txt" />
    </when>
  </conditional>
</param>
```

**Handling (lib/galaxy/tool_util/verify/parse.py):**
- Parameter flattening converts nested structure to flat keys
- Prefixes used: `param|select|option1|nested` format
- Validation ensures correct conditional branch selected

### Repeat Handling

Tests support repeat blocks:

```xml
<param name="repeat_param">
  <repeat>
    <param name="item" value="file1.txt" />
  </repeat>
  <repeat>
    <param name="item" value="file2.txt" />
  </repeat>
</param>
```

**Handling:**
- Prefixed with repeat name and index: `repeat_param_0|item`
- Validation ensures minimum repeats met

### Expect Failure Tests

Tests can verify tool failures:

```xml
<test expect_failure="true">
  <param name="input">invalid.txt</param>
</test>
```

Attributes:
- `expect_failure="true"` - Tool should fail
- `expect_test_failure="true"` - Test assertions should fail
- `expect_exit_code="1"` - Specific exit code expected

### Timeout Control

**maxseconds** attribute:
- Limits test execution time
- Default: 86400 seconds (24 hours)
- Environment: GALAXY_TEST_DEFAULT_WAIT

### Discovered Datasets

Tests can verify discovered output datasets:

```xml
<output name="output">
  <discovered_dataset designation="log" file="output.log" />
</output>
```

Handled via `primary_datasets` in attributes:
- Maps designation to expected output
- Compared with `__new_primary_file_{name}|{designation}__`

### Test Element Sorting

Profile >= 20.09 enforces element order:

```xml
<output_collection name="coll" type="list">
  <element name="first">...</element>
  <element name="second">...</element>
</output_collection>
```

Attribute `expected_sort_order` set during parsing to track position.

### Dynamic Test Generation

Tests can be generated from templates or parametrized:

**Mechanisms:**
- Macro expansion (XML)
- Parameter-driven generation (future)
- Tool-specific test registration

### Test Validation (Profile >= 24.2)

Automatic validation on load:

```python
if validate_on_load:
    try:
        validated_test_case = case_state(raw_test_dict, parameters, profile, validate=True)
        request_and_schema = TestRequestAndSchema(
            validated_test_case.tool_state,
            tool_parameter_bundle
        )
    except Exception as e:
        validation_exception = e
```

Captures exceptions and creates InvalidToolTestDict with error info.

---

## Integration Points

### Planemo Integration

**Planemo** (tool development framework) integrates via:

1. **Test Format Compatibility**
   - Uses same ToolTestDescription format
   - Imports `to_test_assert_list` from galaxy.tool_util.parser.yaml
   - Respects `value_state_representation` field

2. **Test Data Updates**
   - `--update_test_data` flag regenerates expected outputs
   - Uses `keep_outputs_dir` to save actual outputs
   - Environment variable: GALAXY_TEST_SAVE

3. **Custom Assertions**
   - Can register additional assertion modules
   - Expected in galaxy.tool_util.verify.asserts
   - Auto-discovered by introspection

### Galaxy Test Framework

**Galaxy Internal Testing:**

1. **Test Execution**
   - API endpoint: GET /api/tools/{tool_id}/test_data
   - Used by Galaxy UI for test discovery
   - Tool test runner built-in

2. **History-based Execution**
   - Tests create temporary histories
   - Environment: GALAXY_TEST_NO_CLEANUP to preserve
   - Environment: GALAXY_TEST_HISTORY_ID for reuse

3. **Async Upload Support**
   - Environment: GALAXY_TEST_UPLOAD_ASYNC (default: true)
   - Staging interface handles async file uploads
   - Job waiting built-in

### Environment Variables

Test behavior controlled via:

- **GALAXY_TEST_DEFAULT_WAIT** - Timeout (86400s default)
- **GALAXY_TEST_DEFAULT_DBKEY** - Database key ("?" default)
- **GALAXY_TEST_NO_CLEANUP** - Skip history cleanup
- **GALAXY_TEST_HISTORY_ID** - Reuse history
- **GALAXY_TEST_UPLOAD_ASYNC** - Async uploads (true default)
- **GALAXY_TEST_VERBOSE_ERRORS** - Detailed errors
- **GALAXY_TEST_SAVE** - Save outputs to directory
- **GALAXY_TEST_RAW_DIFF** - Full diff output (no truncation)

### Test Data Resolution

Test data located in priority order:

1. Tool repository: `{repo_dir}/test-data/{filename}`
2. Tool directory: `{tool_dir}/test-data/{filename}`
3. Galaxy test data: `{galaxy_root}/test-data/{filename}`
4. Remote location: Download from `location` attribute URL

### API Integration

**Tools API Test Endpoint:**

```
GET /api/tools/{tool_id}/test_data[?tool_version=X.Y.Z]
Returns: ToolTestDescriptionDict[]
```

**Response includes:**
- Complete test definition
- Input state representation
- Expected outputs
- Assertions and metadata

### Parameter Model Integration

Tests validated against tool parameter models:

**ValidationException flow:**
1. Test dict + parameters passed to `case_state()`
2. Parameters validated against tool schema
3. Exceptions captured as InvalidToolTestDict
4. Reported via error field in test description

---

## Summary

Galaxy's tool testing infrastructure provides:

- **Flexible test definition** - XML or YAML formats
- **Rich assertions** - Content, metadata, structure, images
- **Flexible verification** - Multiple comparison methods
- **Collection testing** - Nested structure support
- **Metadata validation** - Datatype-specific checks
- **Error handling** - Failure expectations, timeout control
- **Integration** - Planemo, Galaxy UI, REST API
- **Extensibility** - Custom assertion modules
- **Validation** - Profile-aware parameter checking

The system is designed to support both simple file comparisons and complex content assertions, with special handling for collections, discovered datasets, and various data formats.

---

## Key File Locations

| Component | Location |
|-----------|----------|
| Test Parsing (XML) | `lib/galaxy/tool_util/parser/xml.py` |
| Test Parsing (YAML) | `lib/galaxy/tool_util/parser/yaml.py` |
| Interface Types | `lib/galaxy/tool_util/parser/interface.py` |
| Tool Class | `lib/galaxy/tools/__init__.py` |
| Test Description + Interactor | `lib/galaxy/tool_util/verify/interactor.py` |
| Test Verification | `lib/galaxy/tool_util/verify/__init__.py` |
| Assertion Modules | `lib/galaxy/tool_util/verify/asserts/` |
| Test Data Resolution | `lib/galaxy/tool_util/verify/test_data.py` |
| Test Parsing Entry | `lib/galaxy/tool_util/verify/parse.py` |
| Tool State Classes | `lib/galaxy/tool_util/parameters/state.py` |
| Test Case State | `lib/galaxy/tool_util/parameters/case.py` |
