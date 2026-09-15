# Debugging CWL Conformance Tests

## Running a Single Test

```bash
. .venv/bin/activate; VIRTUAL_ENV=$(pwd)/.venv GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES="true" \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS="true"  GALAXY_TEST_DISABLE_ACCESS_LOG=1 \
GALAXY_TEST_LOG_LEVEL=WARN \
GALAXY_SKIP_CLIENT_BUILD=1 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_OVERRIDE_TOOL_CONFIG_FILE="test/functional/tools/sample_tool_conf.xml" \
pytest -s -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py::TestCwlConformance::test_conformance_v1_2_<test_suffix>
```

All env vars required. `GALAXY_SKIP_CLIENT_BUILD=1` saves ~30s. Tests take ~3-4 minutes each (Galaxy server startup dominates).

## Test Name Mapping

Test method names like `test_conformance_v1_2_js_input_record` map to entries in `test/functional/tools/cwl_tools/v1.2/conformance_tests.yaml` via the `id` field (dashes become underscores, prefixed with `test_conformance_v1_2_`).

The test YAML entry has `tool` (or `workflow`), `job`, and `output` fields pointing to files relative to `test/functional/tools/cwl_tools/v1.2/`.

## Data Flow: CWL CommandLineTool Tests

```
conformance_tests.yaml entry
    |
    v
CwlPopulator.run_conformance_test()          [populators.py:3167]
    |
    v
stage_inputs() - uploads job inputs           [staging.py:80]
  - Files -> FileUploadTarget -> HDA
  - Scalars -> ObjectUploadTarget -> expression.json HDA (json.dumps'd)
  - Records -> collection of HDAs (each field an element)
  - Arrays -> collection of HDAs (each item an element)
    |
    v
_run_cwl_tool_job() - POST /api/tool_requests  [populators.py:3043]
    |
    v
ToolAction.execute() - creates Job              [actions/__init__.py]
  - _collect_cwl_inputs() walks {src, id} refs -> inp_data, inp_dataset_collections
    |
    v
CwlToolEvaluator.build_param_dict()            [evaluation.py:1126]
  - runtimeify() converts validated state -> CWL native input dict
  - adapt_cwl_collection() expands HDCAs -> CWL records/arrays
  - _parse_scalar() reads HDA file content -> native Python values
    |
    v
CwlToolEvaluator._build_command_line()         [evaluation.py:1206]
  - Passes input_json to cwltool via JobProxy
  - cwltool generates command line from CWL inputBindings
  - Saves job representation to cwl_job.json
    |
    v
[Job runs on compute]
    |
    v
handle_outputs() - collects CWL outputs         [runtime_actions.py:69]
  - Loads JobProxy from cwl_job.json
  - cwltool's collect_outputs() evaluates outputBindings + outputEval
  - Scalar outputs -> json.dumps() -> expression.json HDA
  - File outputs -> moved to output path
    |
    v
CwlRun.get_output_as_object()                  [populators.py:400]
  - output_to_cwl_json() reads expression.json -> json.loads()
  - cwltest.compare.compare(expected, actual)
```

## Data Flow: CWL Workflow Tests

Same staging, but instead of tool_requests:

```
_run_cwl_workflow_job() -> invoke_workflow_and_assert_ok()
    |
    v
WorkflowModule.execute() in modules.py
  - build_cwl_input_dict() - builds CWL inputs from step connections
  - _ref_to_cwl() - converts {src, id} Galaxy refs to CWL values
  - do_eval() - evaluates when/valueFrom expressions
  - Filters param_combinations to tool_input_names before validation
```

## Key Files

| File | Role |
|------|------|
| `lib/galaxy_test/base/populators.py` | Test framework: staging, running, output comparison |
| `lib/galaxy/tool_util/cwl/util.py` | Input staging: replacement_record, replacement_list, upload_object |
| `lib/galaxy/tool_util/client/staging.py` | Upload targets: ObjectUploadTarget -> json.dumps -> expression.json |
| `lib/galaxy/tools/evaluation.py` | CwlToolEvaluator: builds param_dict, command line via cwltool |
| `lib/galaxy/tools/cwl_runtime.py` | Runtime input adaptation: _parse_scalar, adapt_cwl_collection |
| `lib/galaxy/tool_util/cwl/runtime_actions.py` | Output collection: handle_outputs, handle_known_output_json |
| `lib/galaxy/tool_util/cwl/parser.py` | JobProxy: wraps cwltool for command gen and output collection |
| `lib/galaxy/workflow/modules.py` | Workflow execution: when expressions, _ref_to_cwl, param filtering |
| `lib/galaxy/tools/actions/__init__.py` | Job creation: _collect_cwl_inputs walks {src, id} refs |

## Local Test Environment

### Populating Conformance Test Files

Conformance test files (CWL tools, job inputs, test data) are **not committed** — they're gitignored and downloaded on demand. If `test/functional/tools/cwl_tools/v1.1/` doesn't exist, tests can't run. See `DEPENDENCIES_CWL_CONFORMANCE_TESTS.md` for full details.

```bash
# Download all versions + generate pytest files:
make generate-cwl-conformance-tests

# Or just the shell script:
bash scripts/update_cwl_conformance_tests.sh
```

This downloads from upstream CWL repos and populates:
- `test/functional/tools/cwl_tools/v1.{0,1,2}/` — conformance YAML + test files
- `lib/galaxy_test/api/cwl/test_cwl_conformance_v1_?.py` — generated pytest files

Both dirs are gitignored, so each worktree needs its own copy.

## Docker-Required Tests

Some CWL conformance tests require Docker (e.g. `docker_entrypoint`, `dockeroutputdir`, `networkaccess_disabled`, `iwd-container-entryname1`). These are **not** in the API conformance suite — they're skipped there and run separately via an integration test harness.

### How It Works

- `scripts/cwl_conformance_to_test_cases.py` has a `DOCKER_REQUIRED` dict listing test IDs per CWL version
- Docker-required tests get a `@pytest.mark.skip` in the generated API test files
- A separate file `test/integration/test_containerized_cwl_conformance.py` is generated with these tests, using `IntegrationTestCase` that configures Galaxy with `docker_enabled: True`
- Tests are marked `@pytest.mark.cwl_docker_required`
- The integration file is gitignored — generated at test time

### Running Docker Tests Locally

Requires Docker on PATH. Generate the test file first, then run:

```bash
# Generate conformance tests (including the integration file):
make generate-cwl-conformance-tests

# Run all docker-required tests:
. .venv/bin/activate
pytest -s -v test/integration/test_containerized_cwl_conformance.py -m cwl_docker_required

# Or via run_tests.sh (handles venv + generation):
./run_tests.sh --generate-cwl -integration test/integration/test_containerized_cwl_conformance.py -- -m cwl_docker_required
```

### CI

Docker tests run in `.github/workflows/integration_cwl_docker.yaml`. This workflow:
- Pulls required images (`bash:4.4.12`, `debian:stable-slim`, `python:3-slim`)
- Uses `--generate-cwl` flag on `run_tests.sh` to generate test files inside the venv (system Python lacks PyYAML)
- Runs with `-m cwl_docker_required` marker

### Adding a New Docker-Required Test

Add the test ID to the `DOCKER_REQUIRED` dict in `scripts/cwl_conformance_to_test_cases.py` under the appropriate version. Remove it from `RED_TESTS` if present. Regenerate.

### VIRTUAL_ENV must be set

Galaxy's job script template uses `$VIRTUAL_ENV` to activate the venv inside job scripts. Without it, `python` may resolve to a system shim (e.g. rye) and the CWL relocate script silently fails — outputs are empty. **This is the #1 cause of mysterious CWL test failures locally.**

The relocate script (`relocate_dynamic_outputs.py`) is invoked as `python '...'` inside the job script. If `VIRTUAL_ENV` isn't set, `_galaxy_setup_environment` can't activate the venv, so `python` resolves to rye's shim which errors with `Target Python binary 'python' not found`. The job still reports "ok" (exit code was captured before the relocate step), but all CWL outputs processed by `handle_outputs()` are missing:
- **File outputs**: 0-byte datasets (file never moved to output path)
- **Expression.json outputs**: empty content → `JSONDecodeError`
- **ExpressionTool outputs**: expression never evaluated (it runs inside `handle_outputs`)

```bash
# Either activate the venv:
source .venv/bin/activate
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false pytest ...

# Or export it explicitly:
VIRTUAL_ENV=$(pwd)/.venv GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false pytest ...
```

**Also set `GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false`** — without it, Galaxy may attempt conda initialization on first run, adding significant startup time and potential hangs.

**Symptom**: `JSONDecodeError: Expecting value: line 1 column 1` on expression.json outputs. The dataset exists in "ok" state but content is `b''`. Job stderr contains `error: Target Python binary 'python' not found`. This will pass in CI where the venv is properly activated.

## Debugging Techniques

### Use log.warning

Galaxy has very verbose test output so we disable a lot of the debugging with GALAXY_TEST_LOG_LEVEL=WARN - so use log.warning to write debug statements.

### Narrowing by Error Type

| Error                                       | Stage                      | Where to look                                                                                                                                                                    |
| ------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NotImplementedError` in `from_cwl`         | Workflow expression eval   | `modules.py` `_ref_to_cwl` - missing src type?                                                                                                                                   |
| Pydantic `Extra inputs are not permitted`   | Tool state validation      | `modules.py` - when-only inputs leaking to validation? Or CWL job JSON has keys not in tool inputs (shared job files) — stripped server-side in `jobs.py:create()` for CWL tools |
| `KeyError('id')` in `_collect_cwl_inputs`   | Job creation               | Non-HDA refs (e.g. `{src: "json"}`) reaching input collection                                                                                                                    |
| `CompareFail: expected X got Y`             | Output comparison          | Trace from output collection backward                                                                                                                                            |
| `CompareFail` with extra quotes/escaping    | JSON round-trip            | Double-encoding: check staging vs read-back                                                                                                                                      |
| `JSONDecodeError` on empty expression.json  | Relocate script didn't run | Check `VIRTUAL_ENV` is set; check job stderr for "python not found"                                                                                                              |
| `CompareFail: expected N got 0` (exit code) | Exit code not passed       | Check exit code file path in `runtime_actions.py`                                                                                                                                |

### Common Bug Patterns

**Relocate script silent failure**: If `python` isn't found (missing venv activation), the relocate script fails silently. The job still "succeeds" (exit code is captured separately) but all CWL outputs are empty. File outputs appear as 0-byte datasets; expression.json outputs cause `JSONDecodeError`.

**Directory HDA path vs content**: Galaxy directory-type HDAs store their content in `hda.dataset.extra_files_path`, not the primary `.dat` file. Any code passing a directory HDA path to cwltool (or anything expecting a real filesystem directory) must use the extra files path. Symptom: `NotADirectoryError` from cwltool during `bind_input` / `get_listing`.

**macOS vs Linux `wc` output**: macOS `wc -l` pads output with leading spaces (e.g. `"      16\n"` = 9 bytes) while Linux produces `"16\n"` (3 bytes). Several CWL conformance tests use `wc -l` and expect Linux output. A `CompareFail` with correct line count but wrong checksum/size on macOS is likely this — not a real bug. These tests will pass in CI (Linux).

## Expression.json Round-Trip

This is a recurring source of bugs. The full cycle:

```
Python value -> json.dumps() -> expression.json HDA file -> read content -> json.loads() -> Python value
```

- **Write** (staging.py:163): `json.dumps(upload_target.object)`
- **Write** (runtime_actions.py:183): `json.dumps(output)` for tool outputs
- **Read** (cwl_runtime.py:148-150): `_parse_scalar(content, param)` - must handle JSON-encoded content
- **Read** (util.py:548-553): `json.loads(dataset_dict["content"])` for output comparison

For int/bool/float, the JSON encoding happens to be compatible with direct parsing (`int("42")`, `"true" in ...`). For strings, `json.dumps("hello")` produces `"hello"` (with quotes) which must be `json.loads()`'d back.
