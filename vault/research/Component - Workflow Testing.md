---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/testing
status: draft
created: 2026-02-08
revised: 2026-02-08
revision: 1
ai_generated: true
component: workflow_testing
galaxy_areas:
  - workflows
  - testing
---

# Galaxy Workflow Testing: A Comprehensive Guide

## Table of Contents

1. [Overview](#overview)
2. [YAML-Based Workflow Framework Tests](#yaml-based-workflow-framework-tests)
3. [Procedural API Workflow Tests](#procedural-api-workflow-tests)
4. [Shared Infrastructure: Populators and Fixtures](#shared-infrastructure)
5. [Integration Workflow Tests](#integration-workflow-tests)
6. [Additional Workflow Test Suites](#additional-workflow-test-suites)
7. [How to Run Tests](#how-to-run-tests)
8. [Comparison of Approaches](#comparison-of-approaches)
9. [Key Files and Directories](#key-files-and-directories)

---

## Overview

Galaxy has two primary approaches to testing workflow execution correctness, plus several
supplementary test suites. The two core approaches are:

1. **YAML-based workflow framework tests** -- Declarative test definitions pairing workflow
   files (`.gxwf.yml`) with test specifications (`.gxwf-tests.yml`). These live in
   `lib/galaxy_test/workflow/` and are the workflow analogue of Galaxy's tool framework
   tests in `test/functional/tools/`.

2. **Procedural API tests** -- Python test methods in `lib/galaxy_test/api/test_workflows.py`
   (and related files) that use the Galaxy API to imperatively create workflows, upload data,
   invoke workflows, and assert on results.

Both approaches ultimately drive a running Galaxy test server through its API, using a shared
populator infrastructure (`WorkflowPopulator`, `DatasetPopulator`, `DatasetCollectionPopulator`)
to abstract common operations. The intent documented in `lib/galaxy_test/workflow/__init__.py`
is explicit:

> This is meant to grow into the workflow based mirror of what the framework tests are for
> tools. `api/test_workflows.py` is still the place to test exceptional conditions, errors,
> etc... but tests of normal operation where semantics can be verified with simple inputs and
> outputs can now be placed in here.

---

## YAML-Based Workflow Framework Tests

### Architecture

The framework test system consists of three layers:

1. **Workflow definitions** -- Standard Galaxy Format2 YAML workflow files with `.gxwf.yml`
   extension.
2. **Test specifications** -- Companion YAML files with `.gxwf-tests.yml` extension that
   define inputs (jobs) and expected outputs.
3. **Test runner** -- A single Python module `test_framework_workflows.py` that uses pytest
   parametrization to discover and execute all workflow/test pairs.

### File Convention

For a workflow named `flatten_collection`, the files are:

```
lib/galaxy_test/workflow/
  flatten_collection.gxwf.yml           # The workflow definition
  flatten_collection.gxwf-tests.yml     # One or more test cases
```

The naming convention is strict -- the test runner uses `glob.glob("*.gxwf.yml")` to discover
workflows and derives the test file name by replacing `.gxwf.yml` with `.gxwf-tests.yml`.

### Current Workflow Test Files (24 workflows)

```
default_values                          directory_index
default_values_optional                 empty_collection_sort
filter_null                             flatten_collection
flatten_collection_over_execution       integer_into_data_column
map_over_expression                     multi_select_mapping
multiple_integer_into_data_column       multiple_text
multiple_versions                       optional_conditional_inputs_to_build_list
optional_text_param_rescheduling        output_parameter
rename_based_on_input_collection        replacement_parameters_legacy
replacement_parameters_nested           replacement_parameters_text
subcollection_rank_sorting              subcollection_rank_sorting_paired
triply_nested_list_mapping              zip_collection
```

### Workflow Definition Format

Workflow files use Galaxy's Format2 YAML workflow syntax:

```yaml
class: GalaxyWorkflow
inputs:
  required_int_with_default:
    type: int
    default: 1
outputs:
  out:
    outputSource: integer_default/out_file1
steps:
  integer_default:
    tool_id: integer_default
    tool_state:
      input1: 0
      input2: 0
    in:
      input3:
        source: required_int_with_default
```

Key elements:
- `class: GalaxyWorkflow` identifies Format2 workflows
- `inputs` defines workflow inputs with types (`data`, `int`, `text`, `boolean`, `collection`)
- `outputs` names workflow outputs with `outputSource` referencing step/output pairs
- `steps` defines tool invocations with `tool_id`, `state`/`tool_state`, and `in` connections
- Step connections use `step_label/output_name` syntax or positional `$link` references

### Test Specification Format

Test files contain a YAML list of test cases. Each test case has:

```yaml
- doc: |
    Human-readable description of what this test verifies.
  job:                          # Inputs to the workflow
    input_name:
      type: File                # File, raw, or collection
      value: test_file.bed      # Reference to test-data file
      content: "inline content" # Or inline content
  outputs:                      # Expected outputs
    output_name:
      class: File               # File or Collection
      asserts:
        - that: has_text
          text: "expected content"
  expect_failure: true          # Optional: test expects workflow to fail
```

#### Job Input Types

**Simple string values** -- Uploaded as a dataset with the string as content:
```yaml
job:
  my_input: "hello world"
```

**File references** -- Reference files from Galaxy's `test-data/` directory:
```yaml
job:
  my_input:
    type: File
    value: 1.bed
    file_type: bed
```

**Raw parameter values** -- Non-dataset parameters (text, integer, boolean):
```yaml
job:
  my_param:
    type: raw
    value: 42
```

**Null values**:
```yaml
job:
  my_param:
    type: raw
    value: null
```

**Collection inputs**:
```yaml
job:
  my_collection:
    type: collection
    collection_type: list
    elements:
      - identifier: el1
        content: "data1"
      - identifier: el2
        content: "data2"
```

**Collections with specific extensions**:
```yaml
job:
  my_collection:
    type: collection
    collection_type: list
    elements:
      - identifier: item1
        content: '"ex2"'
        ext: 'expression.json'
```

**Empty jobs** -- For workflows that need no external inputs:
```yaml
job: {}
```

#### Output Assertions

**Simple file content checks**:
```yaml
outputs:
  out:
    class: File
    asserts:
      - that: has_text
        text: "expected"
      - that: has_line
        line: "exact line match"
```

**Metadata checks**:
```yaml
outputs:
  out:
    class: File
    metadata:
      name: 'expected_name'
```

**Exact parameter output values**:
```yaml
outputs:
  out_int: 43
```

**Collection outputs** with element-level assertions:
```yaml
outputs:
  out:
    class: Collection
    collection_type: list
    elements:
      'element_id_1':
        asserts:
          - that: has_text
            text: "A"
      'element_id_2':
        asserts:
          - that: has_text
            text: "B"
```

**Nested collection outputs**:
```yaml
outputs:
  out:
    class: Collection
    collection_type: list:list
    elements:
      outer1:
        elements:
          inner1:
            asserts:
              - that: has_text
                text: "content"
```

**Expected failure** -- Test that a workflow invocation fails:
```yaml
- doc: Test that bad input causes failure
  expect_failure: true
  job:
    my_input:
      type: raw
      value: null
  outputs: {}
```

### Test Discovery and Execution

The test runner in `lib/galaxy_test/workflow/test_framework_workflows.py` works as follows:

1. **Discovery via `pytest_generate_tests`**: A pytest hook function globs for `*.gxwf.yml`
   files in the script directory, parses each companion `.gxwf-tests.yml` file, and generates
   parametrized test cases. Each test gets an ID like `flatten_collection_0`,
   `default_values_1`, etc.

2. **Server setup via `conftest.py`**: A session-scoped fixture creates a `GalaxyTestDriver`
   that starts a Galaxy server with `framework_tool_and_types = True` (loading the sample tool
   configuration so test tools like `cat1`, `random_lines1`, `collection_creates_pair`, etc.
   are available).

3. **Test execution in `TestWorkflow.test_workflow`**: Each parametrized test case:
   - Loads the workflow YAML via `gxformat2`'s `ordered_load`
   - Creates a test history via `dataset_populator.test_history()`
   - Calls `workflow_populator.run_workflow()` with the workflow content and test job inputs
   - Verifies each declared output using `_verify_output()`, which handles both dataset and
     collection outputs
   - Supports `expect_failure: true` tests that assert the workflow fails

4. **Rerun testing**: The environment variable `GALAXY_TEST_WORKFLOW_AFTER_RERUN` (set to `1`
   in CI) causes each workflow to be rerun after initial execution, verifying that rerun
   produces the same results. This is accomplished via `workflow_populator.rerun()`.

### Verification Mechanism

Output verification in `_verify_output` delegates to Galaxy's tool test verification
infrastructure:

- **Dataset outputs**: Downloads the output content and calls
  `verify_file_contents_against_dict()` from `galaxy.tool_util.verify`, plus
  `compare_expected_metadata_to_api_response()` for metadata assertions.
- **Collection outputs**: Uses `verify_collection()` from
  `galaxy.tool_util.verify.interactor`, which recursively walks collection elements and
  applies per-element assertions.

This reuse of the tool verification layer means workflow framework tests support the same
assertion vocabulary as tool tests (`has_text`, `has_line`, `has_n_lines`,
`has_text_matching`, metadata checks, etc.).

---

## Procedural API Workflow Tests

### Architecture

The procedural API tests live in `lib/galaxy_test/api/test_workflows.py` -- an ~8,850 line
file containing approximately 290 test methods organized into several classes.

### Class Hierarchy

```
FunctionalTestCase (lib/galaxy_test/base/testcase.py)
  -> ApiTestCase (lib/galaxy_test/api/_framework.py)
       -> BaseWorkflowsApiTestCase (test_workflows.py)
            -> TestWorkflowsApi (test_workflows.py) -- the main test class
```

Plus mixin classes:
- `RunsWorkflowFixtures` -- reusable methods for running specific workflow patterns
- `ChangeDatatypeTests` -- tests for datatype-related PJAs
- `SharingApiTests` -- tests for workflow sharing via `TestWorkflowSharingApi`

### Key Base Class: `BaseWorkflowsApiTestCase`

This class (defined in `test_workflows.py` at line 178) sets up the three core populators:

```python
class BaseWorkflowsApiTestCase(ApiTestCase, RunsWorkflowFixtures):
    def setUp(self):
        super().setUp()
        self.workflow_populator = WorkflowPopulator(self.galaxy_interactor)
        self.dataset_populator = DatasetPopulator(self.galaxy_interactor)
        self.dataset_collection_populator = DatasetCollectionPopulator(self.galaxy_interactor)
```

And provides convenience wrappers:
- `_upload_yaml_workflow()` -- uploads a Format2 YAML workflow string
- `_run_jobs()` / `_run_workflow()` -- high-level workflow invocation + wait
- `_setup_workflow_run()` -- creates workflow, datasets, and builds a request dict
- `_invocation_details()` -- fetches invocation details
- `_download_workflow()` -- downloads workflow in various formats
- `import_workflow()` -- imports a native (.ga) format workflow

### Test Patterns

The procedural tests use several common patterns:

#### Pattern 1: Inline YAML workflow + test_data string

The most common pattern. Workflows are defined as inline YAML strings (often imported from
`workflow_fixtures.py`) and test data is passed as a YAML string or dict:

```python
def test_run_subworkflow_simple(self) -> None:
    with self.dataset_populator.test_history() as history_id:
        summary = self._run_workflow(
            WORKFLOW_NESTED_SIMPLE,
            test_data="""
outer_input:
  value: 1.bed
  type: File
""",
            history_id=history_id,
        )
        content = self.dataset_populator.get_history_dataset_content(history_id)
        assert content == "expected..."
```

#### Pattern 2: Load native .ga workflow + manual setup

For testing native format workflow features:

```python
def test_run_workflow(self):
    workflow = self.workflow_populator.load_workflow(name="test_for_run")
    workflow_request, history_id, workflow_id = self._setup_workflow_run(workflow)
    # ... invoke and assert
```

#### Pattern 3: Upload workflow then invoke separately

When testing invocation-specific behavior (pausing, canceling, scheduling):

```python
def test_workflow_pause(self):
    workflow_id = self._upload_yaml_workflow("""
class: GalaxyWorkflow
steps:
  the_pause:
    type: pause
    ...
""")
    with self.dataset_populator.test_history() as history_id:
        invocation_id = self.__invoke_workflow(workflow_id, history_id=history_id)
        self._wait_for_invocation_non_new(workflow_id, invocation_id)
        # ... interact with pause step, verify state
```

#### Pattern 4: Testing error conditions and API responses

```python
def test_cannot_run_inaccessible_workflow(self):
    workflow_id = self.workflow_populator.simple_workflow("test_for_run")
    with self._different_user():
        # Expect 403 when trying to invoke another user's workflow
        ...
```

#### Pattern 5: skip_without_tool decorator

Many tests depend on specific Galaxy tools being available:

```python
@skip_without_tool("cat1")
def test_run_workflow(self):
    ...
```

This decorator checks the Galaxy server's tool registry and skips the test if the required
tool is not installed.

### Categories of Tests in test_workflows.py

The ~290 tests cover these categories:

1. **Workflow CRUD** (~30 tests): show, delete, undelete, index, search, filtering,
   ordering, tagging, publishing, sharing

2. **Import/Export** (~25 tests): upload native/.ga format, Format2, URL import, TRS
   import (Dockstore, WorkflowHub), base64 import, export in various styles, round-trip
   format conversion

3. **Basic Execution** (~15 tests): run by step_id, step_index, UUID, name; URL inputs;
   deferred inputs; cached jobs; hash validation

4. **Collection Handling** (~40 tests): output collections, mapped output collections,
   dynamic collections, map-over, list:paired, subcollection mapping, empty lists, cross
   products, nested collections, collection type sources

5. **Subworkflows** (~25 tests): simple subworkflow execution, runtime parameters in
   subworkflows, replacement parameters, auto labels, mapping recovery, subworkflow
   outputs as workflow outputs

6. **Conditional Steps** (~20 tests): `when` expressions, boolean conditional steps,
   conditional subworkflows, map-over with conditionals, skipped steps with collection
   outputs

7. **Pausing and Cancellation** (~10 tests): pause steps, cancel invocations, resume
   from failed steps, job deletion on cancel

8. **Post-Job Actions (PJAs)** (~30 tests): rename, hide, delete intermediates, change
   datatype, add/remove tags, runtime PJAs, PJA import/export

9. **Parameter Handling** (~20 tests): integer parameters, text connections, numeric
   connections, validated parameters, default values, replacement parameters, runtime
   parameters, step parameters

10. **Invocation Features** (~20 tests): invocation reports, BioCompute Objects, RO-Crate
    export, invocation filtering, job metrics, invocation from store

11. **Error Handling** (~15 tests): inaccessible workflows, invalid IDs, immutable
    histories, tool state validation, missing tools, workflow output not found

12. **Advanced Features** (~20 tests): batch execution, stability tests, data column
    parameters, implicit conversion, dynamic tools, cached job reuse, deferred datasets

### Related API Test Files

- `lib/galaxy_test/api/test_workflows_from_yaml.py` -- Tests focused on Format2 YAML
  workflow upload/download round-tripping and execution. Extends `BaseWorkflowsApiTestCase`.

- `lib/galaxy_test/api/test_workflows_cwl.py` -- CWL (Common Workflow Language) workflow
  tests. Uses `CwlPopulator` for CWL-specific workflow/tool loading and execution.

- `lib/galaxy_test/api/test_workflow_extraction.py` -- Tests for extracting workflows from
  history (the "Extract Workflow" feature). Uses `BaseWorkflowsApiTestCase`.

- `lib/galaxy_test/api/test_workflow_build_module.py` -- Tests for the workflow editor's
  module building API.

---

## Shared Infrastructure

### WorkflowPopulator

Defined in `lib/galaxy_test/base/populators.py`, `WorkflowPopulator` is the central utility
class. It extends `BaseWorkflowPopulator` and provides:

**Workflow Lifecycle:**
- `upload_yaml_workflow(yaml_content)` -- Converts Format2 YAML to native format and uploads
- `create_workflow(workflow_dict)` -- Uploads a native format workflow dict
- `import_workflow(workflow)` -- Imports via the workflows API
- `import_workflow_from_path(from_path)` -- Imports from a server-side path
- `download_workflow(workflow_id, style)` -- Downloads in various formats

**Invocation:**
- `run_workflow(has_workflow, test_data, history_id, ...)` -- High-level: upload + populate
  data + invoke + wait. Returns `RunJobsSummary`.
- `invoke_workflow_raw(workflow_id, request)` -- Low-level invocation
- `invoke_workflow_and_assert_ok(workflow_id, ...)` -- Invoke and assert 200

**Waiting:**
- `wait_for_workflow(workflow_id, invocation_id, history_id)` -- Wait for invocation to
  schedule fully and all history jobs to complete
- `wait_for_invocation(workflow_id, invocation_id)` -- Wait for invocation state
- `wait_for_history_workflows(history_id)` -- Wait for all invocations in a history

**Inspection:**
- `get_invocation(invocation_id)` -- Fetch invocation details
- `workflow_invocations(workflow_id)` -- List invocations for a workflow
- `download_invocation_to_store()` -- Export invocation as model store
- `get_ro_crate()` -- Export as RO-Crate

**The `run_workflow` method** is the most important. Its flow:
1. Upload the Format2 YAML workflow via `upload_yaml_workflow()`
2. Parse `test_data` to extract `step_parameters`, `replacement_parameters`, and input data
3. Call `load_data_dict()` to upload test datasets/collections into the history
4. Build the invocation request with inputs mapped by name
5. Invoke the workflow and optionally wait for completion
6. Return a `RunJobsSummary` named tuple

### RunJobsSummary

A `NamedTuple` returned by `run_workflow()`:

```python
class RunJobsSummary(NamedTuple):
    history_id: str
    workflow_id: str
    invocation_id: str
    inputs: dict
    jobs: list
    invocation: dict
    workflow_request: dict
```

### DatasetPopulator and DatasetCollectionPopulator

These companion classes handle dataset and collection creation, waiting, and inspection.
Key methods used in workflow tests:
- `new_dataset()`, `new_history()`, `test_history()` (context manager)
- `get_history_dataset_content()`, `get_history_dataset_details()`
- `get_history_collection_details()`
- `wait_for_history()`, `wait_for_history_jobs()`

### Workflow Fixtures

`lib/galaxy_test/base/workflow_fixtures.py` contains ~50 reusable Format2 YAML workflow
definitions as Python string constants. These are imported by both the API tests and
integration tests. Examples include:

- `WORKFLOW_SIMPLE_CAT_AND_RANDOM_LINES` -- Basic multi-step workflow
- `WORKFLOW_NESTED_SIMPLE` -- Subworkflow example
- `WORKFLOW_WITH_OUTPUT_COLLECTION` -- Collection output workflow
- `WORKFLOW_WITH_RULES_1` -- Apply rules workflow
- `WORKFLOW_OPTIONAL_TRUE_INPUT_DATA` -- Optional input handling
- `WORKFLOW_FLAT_CROSS_PRODUCT` -- Cross product operations
- `WORKFLOW_KEEP_SUCCESSFUL_DATASETS` -- Error filtering
- `WORKFLOW_WITH_CUSTOM_REPORT_1` -- Custom invocation reports

Some fixtures include embedded `test_data` sections:
```python
WORKFLOW_WITH_OUTPUT_COLLECTION = """
class: GalaxyWorkflow
...
test_data:
  text_input: |
    a
    b
    c
    d
"""
```

### Test Data Loading (`load_data_dict`)

The `load_data_dict()` function in `populators.py` translates test data dictionaries into
actual Galaxy history contents. It handles:

- **String values** -> uploaded as new datasets
- **File references** (`type: File`, `value: filename`) -> uploaded from `test-data/` directory
- **Raw values** (`type: raw`) -> passed as literal parameter values
- **Collections** (`collection_type` + `elements`) -> created via the collections API
- **URL references** (`type: url`) -> fetched and uploaded

---

## Integration Workflow Tests

Integration tests in `test/integration/` can access Galaxy internals and customize server
configuration. Several are workflow-focused:

- `test/integration/test_workflow_refactoring.py` -- Tests workflow refactoring operations
  with direct database model access. Uses `IntegrationTestCase` to inspect
  `WorkflowStep`, `WorkflowStepConnection`, and `PostJobAction` models.

- `test/integration/test_workflow_handler_configuration.py` -- Tests workflow handler
  assignment with custom job configurations.

- `test/integration/test_workflow_scheduling_options.py` -- Tests workflow scheduling
  configuration options.

- `test/integration/test_workflow_tasks.py` -- Tests Celery-based workflow task processing.

- `test/integration/test_workflow_sync.py` -- Tests workflow synchronization behavior.

- `test/integration/test_workflow_invocation.py` -- Tests invocation-specific features
  requiring custom Galaxy configuration.

Integration tests extend `IntegrationTestCase` and override
`handle_galaxy_config_kwds(cls, config)` to customize the Galaxy server. They can also use
all the same populators as API tests.

---

## Additional Workflow Test Suites

### Selenium Workflow Tests

Located in `lib/galaxy_test/selenium/`, these test the workflow UI:

- `test_workflow_editor.py` -- Workflow editor interactions
- `test_workflow_run.py` -- Running workflows through the UI
- `test_workflow_management.py` -- Workflow listing, organizing
- `test_workflow_sharing.py` -- Sharing workflows via UI
- `test_workflow_landing.py` -- Workflow landing pages
- `test_workflow_invocation_details.py` -- Invocation details page
- `test_workflow_rerun.py` -- Rerunning workflows
- `test_published_workflows.py` -- Published workflow browsing

### Performance Tests

`lib/galaxy_test/performance/test_workflow_framework_performance.py` benchmarks workflow
execution with configurable collection sizes and workflow depths. Uses
`WorkflowPopulator.scaling_workflow_yaml()` to generate workflows of varying complexity.

### Native Format Test Workflows (.ga files)

`lib/galaxy_test/base/data/` contains `.ga` format test workflows used by tests that
exercise native format import/export and specific legacy features:

```
test_workflow_1.ga                    test_workflow_2.ga
test_workflow_batch.ga                test_workflow_map_reduce_pause.ga
test_workflow_matching_lists.ga       test_workflow_missing_tool.ga
test_workflow_pause.ga                test_workflow_randomlines_legacy_params.ga
test_workflow_topoambigouity.ga       test_workflow_two_random_lines.ga
test_workflow_validation_1.ga         test_workflow_with_input_tags.ga
test_workflow_with_runtime_input.ga   test_subworkflow_with_integer_input.ga
test_subworkflow_with_tags.ga
```

---

## How to Run Tests

### Framework Workflow Tests

```bash
# Run all workflow framework tests
./run_tests.sh --framework-workflows

# Run a specific workflow test by name
./run_tests.sh --framework-workflows -id flatten_collection

# Direct pytest invocation
pytest lib/galaxy_test/workflow/test_framework_workflows.py

# Run a specific test
pytest lib/galaxy_test/workflow/test_framework_workflows.py -k flatten_collection_0
```

The CI workflow (`.github/workflows/framework_workflows.yaml`) runs these with:
- PostgreSQL database
- `GALAXY_TEST_WORKFLOW_AFTER_RERUN=1` to verify rerun correctness
- Scheduled nightly runs additionally test `extended` metadata strategy

### API Workflow Tests

```bash
# Run all API tests (includes workflow tests among others)
./run_tests.sh -api

# Run only workflow API tests
pytest lib/galaxy_test/api/test_workflows.py

# Run a specific test method
pytest lib/galaxy_test/api/test_workflows.py::TestWorkflowsApi::test_run_workflow

# Run related workflow API test files
pytest lib/galaxy_test/api/test_workflows_from_yaml.py
pytest lib/galaxy_test/api/test_workflows_cwl.py
pytest lib/galaxy_test/api/test_workflow_extraction.py
```

### Integration Workflow Tests

```bash
# Run all integration tests
./run_tests.sh -integration

# Run a specific integration test file
pytest test/integration/test_workflow_refactoring.py
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `GALAXY_TEST_WORKFLOW_AFTER_RERUN` | Set to `1` to re-execute each framework workflow test after first run |
| `GALAXY_TEST_DBURI` | Database connection string (PostgreSQL recommended for CI) |
| `GALAXY_TEST_ENVIRONMENT_CONFIGURED` | Skip driver setup when pointing at external Galaxy |
| `GALAXY_TEST_PERFORMANCE_TIMEOUT` | Timeout for performance tests (default 5000ms) |
| `GALAXY_TEST_PERFORMANCE_COLLECTION_SIZE` | Collection size for performance tests (default 4) |
| `GALAXY_TEST_PERFORMANCE_WORKFLOW_DEPTH` | Workflow depth for performance tests (default 3) |

---

## Comparison of Approaches

### When to Use YAML-Based Framework Tests

Use the declarative framework tests when:

- Testing **normal workflow execution semantics** -- correct outputs given correct inputs
- The test can be expressed as **simple input/output pairs** without complex assertions
- Testing **collection operations** (flatten, zip, filter, sort, cross product, etc.)
- Testing **parameter handling** (defaults, optional inputs, replacement parameters)
- Testing **mapping behavior** (how collections flow through tools and subworkflows)
- You want the test to automatically participate in **rerun verification**
- The test does not need to inspect intermediate states, invocation scheduling, or error
  responses

**Advantages:**
- Minimal boilerplate -- just two YAML files
- Automatically discovered and parametrized
- Rerun testing is built in
- Assertions reuse Galaxy's tool verification infrastructure
- Easy to read and review
- Multiple test cases per workflow (the test file is a list)

**Limitations:**
- Cannot test error conditions or API error responses
- Cannot inspect intermediate workflow states (paused steps, scheduling)
- Cannot test workflow CRUD operations (import, export, share, delete)
- Cannot test interactions between multiple users
- Cannot customize Galaxy server configuration

### When to Use Procedural API Tests

Use the procedural API tests when:

- Testing **error conditions** and **API responses** (403, 400, validation errors)
- Testing **workflow lifecycle operations** (CRUD, import/export, sharing, publishing)
- Testing **invocation state management** (pausing, resuming, canceling)
- Testing **interaction between multiple users** (`with self._different_user()`)
- Testing **complex scenarios** requiring multiple sequential API calls
- Testing **edge cases** that need fine-grained control over invocation setup
- The test needs to inspect **intermediate states** during workflow execution
- Testing **batch execution** or **cached job** behavior

**Advantages:**
- Full control over every API interaction
- Can test error paths and exceptional conditions
- Can test multi-user scenarios
- Can inspect intermediate states during execution
- Can test any workflow API feature

**Limitations:**
- Significant boilerplate per test
- Tests are harder to read for someone unfamiliar with the populator API
- No automatic rerun verification
- Inline workflow YAML can become hard to maintain in large test files

### Summary Decision Matrix

| Aspect | Framework Tests | API Tests |
|---|---|---|
| Normal execution correctness | Preferred | Possible |
| Error/edge case handling | Not supported | Preferred |
| Collection semantics | Preferred | Possible |
| Workflow CRUD | Not supported | Preferred |
| Multi-user scenarios | Not supported | Preferred |
| Invocation state management | Not supported | Preferred |
| Boilerplate | Minimal | Significant |
| Readability | High (YAML) | Moderate (Python) |
| Rerun verification | Automatic | Manual |
| CI workflow | `framework_workflows.yaml` | `api.yaml` |

---

## Key Files and Directories

### Framework Workflow Tests
| Path | Description |
|---|---|
| `lib/galaxy_test/workflow/` | Directory containing all framework workflow tests |
| `lib/galaxy_test/workflow/__init__.py` | Module docstring explaining the framework's purpose |
| `lib/galaxy_test/workflow/conftest.py` | Pytest session fixture for Galaxy test driver |
| `lib/galaxy_test/workflow/test_framework_workflows.py` | Test runner with pytest parametrization |
| `lib/galaxy_test/workflow/*.gxwf.yml` | Workflow definitions (24 files) |
| `lib/galaxy_test/workflow/*.gxwf-tests.yml` | Test specifications (24 files) |

### Procedural API Tests
| Path | Description |
|---|---|
| `lib/galaxy_test/api/test_workflows.py` | Main procedural test file (~8850 lines, ~290 tests) |
| `lib/galaxy_test/api/test_workflows_from_yaml.py` | Format2 YAML round-trip tests |
| `lib/galaxy_test/api/test_workflows_cwl.py` | CWL workflow tests |
| `lib/galaxy_test/api/test_workflow_extraction.py` | Workflow extraction from history tests |
| `lib/galaxy_test/api/test_workflow_build_module.py` | Workflow editor module building tests |
| `lib/galaxy_test/api/_framework.py` | `ApiTestCase` base class |

### Shared Infrastructure
| Path | Description |
|---|---|
| `lib/galaxy_test/base/populators.py` | `WorkflowPopulator`, `DatasetPopulator`, `DatasetCollectionPopulator`, `BaseWorkflowPopulator`, `RunJobsSummary`, `load_data_dict()` |
| `lib/galaxy_test/base/workflow_fixtures.py` | ~50 reusable Format2 YAML workflow string constants |
| `lib/galaxy_test/base/testcase.py` | `FunctionalTestCase` base class |
| `lib/galaxy_test/base/api.py` | `UsesApiTestCaseMixin` |
| `lib/galaxy_test/base/data/*.ga` | Native format test workflow files |

### Integration Tests
| Path | Description |
|---|---|
| `test/integration/test_workflow_refactoring.py` | Workflow refactoring with DB access |
| `test/integration/test_workflow_handler_configuration.py` | Handler configuration |
| `test/integration/test_workflow_scheduling_options.py` | Scheduling options |
| `test/integration/test_workflow_tasks.py` | Celery workflow tasks |
| `test/integration/test_workflow_sync.py` | Workflow synchronization |
| `test/integration/test_workflow_invocation.py` | Invocation features |

### CI Workflows
| Path | Description |
|---|---|
| `.github/workflows/framework_workflows.yaml` | CI for YAML-based framework tests |
| `.github/workflows/api.yaml` | CI for API tests (includes workflow API tests) |
| `.github/workflows/integration.yaml` | CI for integration tests |

### Other
| Path | Description |
|---|---|
| `lib/galaxy_test/selenium/test_workflow_*.py` | Selenium UI workflow tests |
| `lib/galaxy_test/performance/test_workflow_framework_performance.py` | Performance benchmarks |
| `run_tests.sh` | Test runner script (`--framework-workflows` flag) |
| `doc/source/dev/writing_tests.md` | General testing documentation |
