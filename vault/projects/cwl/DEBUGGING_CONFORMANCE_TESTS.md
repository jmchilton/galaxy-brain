# Debugging CWL Conformance Tests

## Running a Single Test

```bash
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES="true" \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS="true" \
GALAXY_SKIP_CLIENT_BUILD=1 \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_OVERRIDE_TOOL_CONFIG_FILE="test/functional/tools/sample_tool_conf.xml" \
pytest -v lib/galaxy_test/api/cwl/test_cwl_conformance_v1_2.py::TestCwlConformance::test_conformance_v1_2_<test_suffix>
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

### VIRTUAL_ENV must be set

Galaxy's job script template uses `$VIRTUAL_ENV` to activate the venv inside job scripts. Without it, `python` may resolve to a system shim (e.g. rye) and the CWL relocate script silently fails — outputs are empty.

```bash
# Either activate the venv:
source .venv/bin/activate
pytest ...

# Or export it explicitly:
VIRTUAL_ENV=$(pwd)/.venv pytest ...
```

Symptom: `JSONDecodeError: Expecting value: line 1 column 1` on expression.json outputs. The dataset exists but content is `b''`.

## Debugging Techniques

### Use log.info, not log.debug

Galaxy test output suppresses debug-level logs. Always use `log.info()` for temporary debugging output so it actually appears in test output.

### Narrowing by Error Type

| Error | Stage | Where to look |
|-------|-------|---------------|
| `NotImplementedError` in `from_cwl` | Workflow expression eval | `modules.py` `_ref_to_cwl` - missing src type? |
| Pydantic `Extra inputs are not permitted` | Tool state validation | `modules.py` - when-only inputs leaking to validation? |
| `KeyError('id')` in `_collect_cwl_inputs` | Job creation | Non-HDA refs (e.g. `{src: "json"}`) reaching input collection |
| `CompareFail: expected X got Y` | Output comparison | Trace from output collection backward |
| `CompareFail` with extra quotes/escaping | JSON round-trip | Double-encoding: check staging vs read-back |
| `JSONDecodeError` on empty expression.json | Relocate script didn't run | Check `VIRTUAL_ENV` is set; check job stderr for "python not found" |
| `CompareFail: expected N got 0` (exit code) | Exit code not passed | Check exit code file path in `runtime_actions.py` |

### Common Bug Patterns

**Double JSON encoding**: Values stored via `ObjectUploadTarget` are `json.dumps()`'d into `expression.json` HDAs. When reading back, must `json.loads()` the content. If any step in the read-back path returns raw file content for strings, you get extra quotes and escaped newlines.

**Missing src type in _ref_to_cwl**: Galaxy parameter refs use `{src: "hda", id: N}`, `{src: "hdca", id: N}`, or `{src: "json", value: V}`. If `_ref_to_cwl` doesn't handle a src type, the raw dict leaks through to expression evaluation.

**When-only inputs leaking**: CWL workflow steps can have inputs used only in `when` expressions that aren't actual tool inputs. These must be filtered before tool validation and before passing to `_collect_cwl_inputs`.

**Relocate script silent failure**: If `python` isn't found (missing venv activation), the relocate script fails silently. The job still "succeeds" (exit code is captured separately) but all CWL outputs are empty. File outputs appear as 0-byte datasets; expression.json outputs cause `JSONDecodeError`.

### Adding Debug Logging

Useful spots for temporary `log.info()`:

```python
# In modules.py, when expression evaluation (~line 2687):
log.info(f"step_state for when eval: {step_state}")
log.info(f"when result: {when_value}")

# In evaluation.py, input_json before passing to cwltool (~line 1238):
log.info(f"CWL input_json: {input_json}")

# In runtime_actions.py, output values (~line 189):
log.info(f"CWL output {output_name}: {output!r} (type={type(output).__name__})")

# In cwl_runtime.py, _parse_scalar:
log.info(f"_parse_scalar content={content!r} type={type(item_type_param).__name__}")
```

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
