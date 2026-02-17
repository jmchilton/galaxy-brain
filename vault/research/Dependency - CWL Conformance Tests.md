---
type: research
subtype: dependency
tags: [research/dependency, galaxy/workflows, galaxy/testing]
status: draft
created: 2026-02-13
revised: 2026-02-13
revision: 1
ai_generated: true
---

# CWL Conformance Tests in Galaxy

How Galaxy downloads, structures, and uses the official CWL conformance test suites
for validating its CWL runtime.

---

## What Are CWL Conformance Tests?

The Common Workflow Language project maintains official conformance test suites for
each CWL spec version. These suites are the canonical way for CWL implementations
(cwltool, Toil, Arvados, Galaxy, etc.) to prove spec compliance. Each suite lives
in its own GitHub repository:

| Version | Repository | Branch |
|---------|-----------|--------|
| v1.0 | `common-workflow-language/common-workflow-language` | `main` |
| v1.1 | `common-workflow-language/cwl-v1.1` | `main` |
| v1.2 | `common-workflow-language/cwl-v1.2` | `main` |

A conformance suite consists of:
- **`conformance_tests.yaml`** — the test manifest describing every test case
- **A `tests/` directory** — CWL tool/workflow files, input job JSON, and test data
  referenced by the manifest

Galaxy tests against all three versions.

---

## How Galaxy Downloads the Tests

### Shell Script: `scripts/update_cwl_conformance_tests.sh`

The conformance suites are **not vendored or submoduled**. They are downloaded
on-demand and excluded from git via `.gitignore`:

```gitignore
# CWL conformance tests
lib/galaxy_test/api/cwl/test_cwl_conformance_v1_?.py
test/functional/tools/cwl_tools/v1.?/
```

The shell script downloads each version as a zip from GitHub:

```
wget https://github.com/common-workflow-language/${repo}/archive/main.zip
```

For each version it:
1. Extracts the zip
2. Copies `conformance_tests.yaml` into `test/functional/tools/cwl_tools/v${version}/`
3. Copies the test tools/data directory alongside it
4. Runs `scripts/cwl_conformance_to_test_cases.py` to generate Python test files

The v1.0 layout is slightly different from v1.1/v1.2 due to the older repo structure:

| Version | Conformance YAML source path | Tests dir source | Local tests dir |
|---------|------------------------------|------------------|-----------------|
| v1.0 | `v1.0/conformance_test_v1.0.yaml` | `v1.0/v1.0/` | `cwl_tools/v1.0/v1.0/` |
| v1.1 | `conformance_tests.yaml` | `tests/` | `cwl_tools/v1.1/tests/` |
| v1.2 | `conformance_tests.yaml` | `tests/` | `cwl_tools/v1.2/tests/` |

### Resulting Directory Structure

```
test/functional/tools/cwl_tools/
├── v1.0_custom/                    # committed — Galaxy-specific CWL test tools
├── v1.0/                           # gitignored — downloaded
│   ├── conformance_tests.yaml
│   └── v1.0/                       # tool/workflow files + test data
│       ├── bwa-mem-tool.cwl
│       ├── cat1-testcli.cwl
│       ├── bwa-mem-job.json
│       └── ...
├── v1.1/                           # gitignored — downloaded
│   ├── conformance_tests.yaml
│   └── tests/
│       ├── bwa-mem-tool.cwl
│       └── ...
└── v1.2/                           # gitignored — downloaded
    ├── conformance_tests.yaml
    └── tests/
        ├── bwa-mem-tool.cwl
        ├── mixed-versions/
        │   └── test-index.yaml     # sub-index, referenced via $import
        ├── string-interpolation/
        │   └── test-index.yaml
        └── ...
```

### Makefile Targets

```
make generate-cwl-conformance-tests   # download + generate
make update-cwl-conformance-tests     # clean + download + generate
make clean-cwl-conformance-tests      # remove downloaded dirs
```

---

## Structure of `conformance_tests.yaml`

Each `conformance_tests.yaml` is a YAML list of test entries. Every entry describes
one test case — a tool or workflow to run with specific inputs and expected outputs.

### Entry Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique identifier (no spaces), e.g. `cl_basic_generation` |
| `doc` | yes | Unique human-readable description, used as lookup key at runtime |
| `tool` | yes | Relative path to the `.cwl` tool or workflow file |
| `job` | yes | Relative path to the input JSON file (or `null` / `tests/empty.json`) |
| `output` | yes | Expected output values for comparison |
| `tags` | yes | List of classification tags (see below) |
| `should_fail` | no | When `true`, the test expects the runner to report failure |

### Example Entries

A standard passing test:

```yaml
- id: cl_basic_generation
  doc: General test of command line generation
  tool: tests/bwa-mem-tool.cwl
  job: tests/bwa-mem-job.json
  output:
    args: [bwa, mem, -t, '2', -I, '1,2,3,4', -m, '3',
      chr20.fa,
      example_human_Illumina.pe_1.fastq,
      example_human_Illumina.pe_2.fastq]
  tags: [ required, command_line_tool ]
```

A `should_fail` test (runtime failure expected):

```yaml
- job: tests/empty.json
  tool: tests/echo-tool.cwl
  should_fail: true
  id: any_without_defaults_unspecified_fails
  doc: Test Any without defaults, unspecified, should fail.
  tags: [ command_line_tool, required ]
```

An intentionally invalid tool (schema-level invalid CWL):

```yaml
- job: null
  tool: invalid-tool-v10.cwl
  id: invalid_syntax_v10_uses_v12_tool
  doc: test tool with v1.2 syntax marked as v1.0 (should fail)
  should_fail: true
  tags: [ command_line_tool, json_schema_invalid ]
```

### `$import` Directives

v1.2's `conformance_tests.yaml` uses `$import` to pull in sub-index files from
subdirectories. These are standard CWL schema-salad `$import` references:

```yaml
# In conformance_tests.yaml:
- $import: tests/string-interpolation/test-index.yaml
- $import: tests/conditionals/test-index.yaml
- $import: tests/secondaryfiles/test-index.yaml
- $import: tests/mixed-versions/test-index.yaml
- $import: tests/loadContents/test-index.yaml
- $import: tests/iwd/test-index.yaml
- $import: tests/scatter/test-index.yaml
```

Each `test-index.yaml` has the same structure as the top-level file. Tool paths
within imported indexes are relative to that sub-directory.

v1.0 and v1.1 do not use `$import` at the top level.

### Tags

Tags classify tests by feature area. Galaxy uses them for pytest markers and
CI matrix filtering. Complete tag inventory (across all 3 versions, 828 total entries):

| Tag | Count | Meaning |
|-----|-------|---------|
| `command_line_tool` | 428 | Tests a CommandLineTool |
| `workflow` | 369 | Tests a Workflow |
| `inline_javascript` | 302 | Requires InlineJavascriptRequirement |
| `required` | 192 | Required for minimal conformance |
| `scatter` | 82 | Tests scatter patterns |
| `expression_tool` | 81 | Tests an ExpressionTool |
| `initial_work_dir` | 69 | Tests InitialWorkDirRequirement |
| `shell_command` | 64 | Tests ShellCommandRequirement |
| `step_input` | 53 | Tests workflow step input features |
| `multiple_input` | 51 | Tests MultipleInputFeatureRequirement |
| `conditional` | 46 | Tests conditional workflow steps (v1.2) |
| `inputs_should_parse` | 33 | Tool definition is valid CWL even though test should fail |
| `subworkflow` | 31 | Tests SubworkflowFeatureRequirement |
| `docker` | 30 | Requires DockerRequirement |
| `resource` | 27 | Tests ResourceRequirement |
| `schema_def` | 18 | Tests SchemaDefRequirement |
| `timelimit` | 18 | Tests ToolTimeLimit requirement |
| `env_var` | 12 | Tests EnvVarRequirement |
| `format_checking` | 8 | Tests format validation |
| `input_object_requirements` | 6 | Tests input object requirements |
| `work_reuse` | 5 | Tests WorkReuse requirement |
| `networkaccess` | 4 | Tests NetworkAccess requirement |
| `inplace_update` | 4 | Tests InplaceUpdateRequirement |
| `json_schema_invalid` | 4 | Tool is intentionally invalid CWL schema |
| `load_listing` | 3 | Tests LoadListingRequirement |
| `secondary_files` | 2 | Tests secondaryFiles handling |

Key semantic tags:
- **`required`** vs absent: whether the test is needed for minimal spec conformance
- **`json_schema_invalid`**: the `.cwl` file itself is intentionally malformed — the
  test verifies runners reject it. These should NOT be loaded as valid tools.
- **`inputs_should_parse`** (v1.2 only): the tool definition is parseable CWL, but
  the test fails at runtime (bad inputs, time exceeded, etc.)
- **`should_fail`** (entry field, not a tag): the test expects execution failure —
  but the tool may still be valid CWL

### Suite Sizes

| Version | Total Entries | `should_fail` | `json_schema_invalid` | Unique Tools | Unique Workflows |
|---------|--------------|---------------|----------------------|-------------|-----------------|
| v1.0 | 197 | 5 | 0 | 85 | 76 |
| v1.1 | 253 | 18 | 0 | 122 | 88 |
| v1.2 | 378 | 41 | 4 | 178 | 138 |

---

## How Galaxy Uses the Conformance Tests

### 1. API Conformance Tests (Runtime Execution)

The primary use. Galaxy actually runs each conformance test against a live Galaxy server.

**Generation**: `scripts/cwl_conformance_to_test_cases.py` reads `conformance_tests.yaml`
and generates a Python test class per version:

```
lib/galaxy_test/api/cwl/test_cwl_conformance_v1_0.py  (generated, gitignored)
lib/galaxy_test/api/cwl/test_cwl_conformance_v1_1.py  (generated, gitignored)
lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py  (generated, gitignored)
```

Each generated test method looks like:

```python
@pytest.mark.cwl_conformance
@pytest.mark.cwl_conformance_v1_0
@pytest.mark.required
@pytest.mark.command_line_tool
@pytest.mark.green
def test_conformance_v1_0_cl_basic_generation(self):
    """General test of command line generation"""
    self.cwl_populator.run_conformance_test("v1.0",
        "General test of command line generation")
```

**Red/Green classification**: The script maintains a hardcoded `RED_TESTS` dict mapping
version -> list of test IDs known to fail in Galaxy. Tests not in the list get
`@pytest.mark.green`; those in the list get `@pytest.mark.red`. Each red test is also
annotated with `# required` or `# not required` comments.

**Runtime**: `CwlPopulator.run_conformance_test(version, doc)` in
`lib/galaxy_test/base/populators.py`:
1. Looks up the test entry by matching `doc` string against `conformance_tests.yaml`
2. Resolves tool path and job input path relative to the conformance directory
3. Stages input files (uploads to Galaxy via the API)
4. If tool — dynamically creates it via `create_tool_from_path()` if not already loaded
5. If workflow — imports via `import_workflow_from_path()`
6. Executes via tool request API (`POST /api/jobs`) or workflow invocation
7. Compares outputs using `cwltest.compare.compare()` from the `cwltest` package

### 2. CI Pipeline

**File**: `.github/workflows/cwl_conformance.yaml`

Runs as a GitHub Actions matrix:

```yaml
matrix:
  marker: ['green', 'red and required', 'red and not required']
  conformance-version: [cwl_conformance_v1_0, cwl_conformance_v1_1, cwl_conformance_v1_2]
  exclude:
    - marker: red and required
      conformance-version: cwl_conformance_v1_0
```

- **Green tests**: must pass — CI failure blocks merge
- **Red and required**: `continue-on-error: true` — tracked but non-blocking
- **Red and not required**: `continue-on-error: true` — optional spec features

The CI command:

```bash
./run_tests.sh --coverage --skip_flakey_fails -cwl lib/galaxy_test/api/cwl \
  -- -m "${{ matrix.marker }} and ${{ matrix.conformance-version }}"
```

This starts a Galaxy test server, downloads conformance tools on first run, and
executes the filtered subset of generated tests.

### 3. Tool Specification Loading Tests (Unit Tests)

**File**: `test/unit/tool_util/test_cwl_tool_specification_loading.py`

Tests that CWL tool files can be parsed into `ToolParameterBundleModel` objects —
validating the type-mapping pipeline without running a Galaxy server.

Uses `conformance_tests.yaml` to discover tool files (rather than filesystem walking).
This YAML-driven approach naturally excludes `json_schema_invalid` tools that are
intentionally unparseable. See `_conformance_cwl_tools()` which iterates entries via
`conformance_tests_gen()`, skips `json_schema_invalid` tags, deduplicates tool paths,
and filters out workflows/`$graph` documents.

### 4. CWL Unit Tests

**File**: `test/unit/tool_util/test_cwl.py`

Lower-level tests that exercise the ToolProxy creation pipeline directly (cwltool
loading, schema validation, proxy construction). These reference specific conformance
tool files by path (e.g. `v1.0/v1.0/cat1-testcli.cwl`) and require the conformance
tests to have been downloaded.

---

## `conformance_tests_gen()` — The Shared Parser

Both the test generation script and runtime test infrastructure need to iterate
conformance test entries, following `$import` directives. This is handled by
`conformance_tests_gen()` in `lib/galaxy/tool_util/unittest_utils/cwl_data.py`:

```python
def conformance_tests_gen(directory, filename="conformance_tests.yaml"):
    conformance_tests_path = os.path.join(directory, filename)
    with open(conformance_tests_path) as f:
        conformance_tests = yaml.safe_load(f)

    for conformance_test in conformance_tests:
        if "$import" in conformance_test:
            import_dir, import_filename = os.path.split(conformance_test["$import"])
            yield from conformance_tests_gen(
                os.path.join(directory, import_dir), import_filename)
        else:
            conformance_test["directory"] = directory
            yield conformance_test
```

Imported by:
- `lib/galaxy_test/base/populators.py` — runtime conformance test execution
- `scripts/cwl_conformance_to_test_cases.py` — pytest code generation
- `test/unit/tool_util/test_cwl_tool_specification_loading.py` — tool loading tests

---

## Relationship Between Conformance Entries and Tool Files

A single `.cwl` tool file may appear in multiple conformance entries (different input
jobs testing different behaviors). Conversely, some `.cwl` files on disk may not be
referenced by any entry (helper files, schema definitions, etc.).

The `should_fail` field and `json_schema_invalid` tag create important distinctions:

| Category | `should_fail` | `json_schema_invalid` | Tool file valid? | Should load? |
|----------|:------------:|:--------------------:|:----------------:|:------------:|
| Normal test | no | no | yes | yes |
| Runtime failure test | yes | no | yes | yes |
| Schema-invalid test | yes | yes | **no** | **no** |

Most `should_fail` tests use valid tool files with bad inputs — the tool itself is
parseable. Only `json_schema_invalid` entries have intentionally broken `.cwl` files.

---

## Galaxy-Specific Test Tools (Not From Conformance)

In addition to the downloaded conformance suites, Galaxy maintains its own CWL test
tools that are committed to the repository:

| Location | Count | Purpose |
|----------|-------|---------|
| `test/functional/tools/parameters/cwl_*.cwl` | ~10 | CWL parameter type testing |
| `test/functional/tools/cwl_tools/v1.0_custom/` | ~18 | Galaxy-specific CWL features |
| `test/functional/tools/galactic_*.cwl` | 2 | `gx:Interface` hint testing |

These are always available regardless of whether conformance tests have been downloaded.
