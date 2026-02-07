---
type: research
subtype: design-spec
tags:
  - research/component
  - galaxy/tools/yaml
  - galaxy/tools/testing
  - galaxy/tools
component: Tool State Specification
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Galaxy Tool State Specification Infrastructure

## Overview

Galaxy represents tool parameter state in **12 different forms** (state representations) depending on context — API request, stored job, runtime evaluation, test case, workflow editor, etc. Each representation has its own Pydantic model generated dynamically from the tool's parameter definitions. A YAML-driven test suite validates that sample payloads are correctly accepted or rejected by each representation's model.

## Architecture

```
Tool XML/YAML
    |
    v  (factory.py: input_models_for_tool_source)
ToolParameterBundleModel  [list of typed parameter models]
    |
    v  (parameters.py: create_field_model)
    |  calls pydantic_template(state_representation) on each parameter
    |  collects DynamicModelInformation (name, type+default, validators)
    v
Dynamic Pydantic BaseModel  [extra="forbid", strict types]
    |
    v  (model_validation.py: validate_against_model)
Validation  [instantiate model(**state_dict), catch ValidationError]
```

## State Representations

Defined in `lib/galaxy/tool_util_models/parameters.py:82-95` as `StateRepresentationT`:

| Representation | Purpose | ID Type | Data Refs | All Required? |
|---|---|---|---|---|
| `relaxed_request` | Lenient API input (nulls→defaults) | string | `{src: hda, id: "abc"}` | No |
| `request` | Strict API request from client | string | `{src: hda, id: "abc"}` + batching | No |
| `request_internal` | Stored in DB after decode | int | `{src: hda, id: 5}` + URLs | No |
| `request_internal_dereferenced` | After URL resolution | int | `{src: hda, id: 5}` only | No |
| `landing_request` | Shared workflow landing page | string | All optional | No |
| `landing_request_internal` | Landing stored in DB | int | All optional | No |
| `job_internal` | Job record (all params filled) | int | `{src: hda, id: 5}` | Yes |
| `job_runtime` | CWL-style runtime JSON with file metadata | N/A | `DataInternalJson` (path, format, size) | Yes |
| `test_case_xml` | XML test case definitions | N/A | `{class: File, path: "foo.bed"}` | No |
| `test_case_json` | JSON test case definitions | N/A | Same but no string splitting | No |
| `workflow_step` | Workflow editor (unlinked params) | N/A | Always `None` for data | No |
| `workflow_step_linked` | Workflow editor (linked allowed) | N/A | `{__class__: ConnectedValue}` | No |

Key behavioral differences:
- **ID encoding**: `request` uses string IDs, `request_internal`/`job_internal` use int IDs
- **Batching**: `request`/`request_internal` allow `{__class__: "Batch", values: [...]}`; `job_internal` does not
- **URL sources**: `request_internal` allows `{src: "url", ...}`; `request_internal_dereferenced` does not
- **ConnectedValue**: Only `workflow_step_linked` allows `{__class__: "ConnectedValue"}`
- **Required**: `job_internal`/`job_runtime` require all params; others allow absent keys with defaults

## Conversions Between Representations

Functions in `lib/galaxy/tool_util/parameters/convert.py` use a visitor pattern (`visit_input_values`) to walk the parameter tree:

| Function | From → To | What it does |
|---|---|---|
| `decode()` | `request` → `request_internal` | String IDs → int IDs via `decode_id` |
| `encode()` | `request_internal` → `request` | Int IDs → string IDs via `encode_id` |
| `dereference()` | `request_internal` → `request_internal_dereferenced` | Resolves `{src: "url"}` to `{src: "hda"}` |
| `strictify()` | `relaxed_request` → `request` | Fills defaults (null text→"", absent bool→False) |
| `fill_static_defaults()` | any → any | Fills missing params with tool-defined defaults |
| `runtimeify()` | `job_internal` → `job_runtime` | HDA refs → file metadata dicts via `adapt_dataset`/`adapt_collection` |
| `encode_test()` | `test_case` → `request` | Test file defs → data requests via adapter callbacks |

## Key Files

### Model Definitions
| File | Key Contents |
|---|---|
| `lib/galaxy/tool_util_models/parameters.py` | All parameter model classes, `StateRepresentationT`, `DynamicModelInformation`, `create_field_model()`, `create_model_strict()`, factory functions |
| `lib/galaxy/tool_util_models/_types.py` | Type helpers: `optional_if_needed()`, `union_type()`, `list_type()` |

### Validation & State
| File | Key Contents |
|---|---|
| `lib/galaxy/tool_util/parameters/model_validation.py` | `validate_against_model()`, `validate_model_type_factory()`, all 11 concrete `validate_*` functions |
| `lib/galaxy/tool_util/parameters/state.py` | `ToolState` base class, 12 concrete subclasses (one per representation) |
| `lib/galaxy/tool_util/parameters/__init__.py` | Public API re-exports |

### Conversion & Visitor
| File | Key Contents |
|---|---|
| `lib/galaxy/tool_util/parameters/convert.py` | `decode()`, `encode()`, `dereference()`, `runtimeify()`, `strictify()`, `fill_static_defaults()`, `encode_test()` |
| `lib/galaxy/tool_util/parameters/visitor.py` | `visit_input_values()` — tree traversal dispatching on repeats, sections, conditionals |

### Factory (Tool Parsing)
| File | Key Contents |
|---|---|
| `lib/galaxy/tool_util/parameters/factory.py` | `input_models_for_tool_source()`, `_from_input_source_galaxy()` — converts XML/YAML `<param>` elements to typed parameter models |

### Test Infrastructure
| File | Key Contents |
|---|---|
| `test/unit/tool_util/test_parameter_specification.py` | Test runner: `test_specification()`, `test_framework_tool_checks()`, assertion factory |
| `test/unit/tool_util/parameter_specification.yml` | ~2245 lines, ~70 tool entries, valid/invalid payloads per representation |
| `test/unit/tool_util/framework_tool_checks.yml` | ~63 lines, 3 entries against existing framework tools |
| `lib/galaxy/tool_util/unittest_utils/parameters.py` | `parameter_bundle_for_file()`, `parameter_bundle_for_framework_tool()` |
| `test/functional/tools/parameters/` | ~104 targeted test tool files (XML, YAML, CWL) |

## How `pydantic_template` Works

Each parameter model class implements:

```python
def pydantic_template(self, state_representation: StateRepresentationT) -> DynamicModelInformation
```

Returns a `DynamicModelInformation` NamedTuple (`parameters.py:105-108`):
- **`name`**: Field name (safe-escaped if starts with "_")
- **`definition`**: `(py_type, Field(default=..., alias=...))` tuple
- **`validators`**: Dict of `{name: field_validator_callable}`

Example flow for `IntegerParameterModel` (`parameters.py:322-335`):
1. Gets `py_type` (e.g., `StrictInt` or `Optional[StrictInt]`)
2. Applies XML validators as Pydantic `AfterValidator` annotations (in_range, etc.)
3. For `workflow_step_linked`: wraps in `Union[type, ConnectedValue]`
4. Sets `requires_value=True` for `job_internal`/`job_runtime`; `False` for landing requests
5. Calls `dynamic_model_information_from_py_type()` which builds the field definition tuple

## How `create_field_model` Assembles Models

`create_field_model()` (`parameters.py:1966-1988`):
1. Iterates each parameter in the tool bundle
2. Calls `pydantic_template(state_representation)` on each
3. Collects field definitions (`kwd`) and validators
4. Calls `create_model_strict(name, __validators__=..., **kwd)` — creates a Pydantic model with `extra="forbid"`

For **conditionals** (`parameters.py:1523-1616`):
- Creates `When_<test>_<value>` submodels per branch
- Creates `When_<test>___absent` for default when (except `job_internal`)
- Uses Pydantic discriminated union with a custom discriminator function

For **repeats** (`parameters.py:1630-1657`):
- Creates inner instance model via `create_field_model()` for the repeat's parameters
- Wraps in `List[instance]` with `min_length`/`max_length`

For **sections** (`parameters.py:1676-1700`):
- Creates inner model, nests as single field (no list wrapping)

## Specification YAML Format

### `parameter_specification.yml`

Top-level keys are tool basenames matching files in `test/functional/tools/parameters/`:

```yaml
gx_int:
  request_valid:
   - parameter: 5
   - {}                     # absent = valid (has default)
  request_invalid:
   - parameter: "5"         # string not accepted (StrictInt)
   - parameter: null
  job_internal_valid:
   - parameter: 5
  job_internal_invalid:
   - {}                     # absent = invalid (job requires all)
   - parameter: "5"
```

The 22 possible keys per tool entry (11 representations × valid/invalid):
```
relaxed_request_valid, relaxed_request_invalid,
request_valid, request_invalid,
request_internal_valid, request_internal_invalid,
request_internal_dereferenced_valid, request_internal_dereferenced_invalid,
landing_request_valid, landing_request_invalid,
landing_request_internal_valid, landing_request_internal_invalid,
job_internal_valid, job_internal_invalid,
test_case_xml_valid, test_case_xml_invalid,
test_case_json_valid, test_case_json_invalid,
workflow_step_valid, workflow_step_invalid,
workflow_step_linked_valid, workflow_step_linked_invalid
```

Not every tool needs all 22 keys. The test runner auto-infers `request_internal_valid/invalid` from `request_valid/invalid` when not explicitly specified.

**Note**: There is currently no `job_runtime_valid`/`job_runtime_invalid` support — `job_runtime` is not wired into the test runner's assertion functions dict.

YAML anchors are used to share test data between representations with identical valid/invalid sets:
```yaml
gx_int:
  request_valid: &gx_int_request_valid
   - parameter: 5
  request_internal_valid: *gx_int_request_valid  # reuse
```

### `framework_tool_checks.yml`

Same format but references tools in `test/functional/tools/` (not `parameters/` subdirectory). Loaded via `parameter_bundle_for_framework_tool(f"{name}.xml")`. Tests complex real-world tools (dynamic options, nested conditionals, etc.).

### Test Tool Files

Located in `test/functional/tools/parameters/`. Each defines one tool with one or a few parameters isolating a specific type/configuration:

```xml
<!-- gx_int.xml -->
<tool id="gx_int" name="gx_int" version="1.0.0">
    <inputs>
        <param name="parameter" value="1" type="integer" />
    </inputs>
    ...
</tool>
```

```yaml
# gx_boolean_user.yml
class: GalaxyUserTool
id: gx_boolean_user
inputs:
  - name: parameter
    type: boolean
    truevalue: mytrue
    falsevalue: myfalse
```

## How the Test Runner Works

`test/unit/tool_util/test_parameter_specification.py`:

1. `test_specification()` loads `parameter_specification.yml`, iterates each tool key
2. For each tool, `_test_file()`:
   - Loads the tool via `parameter_bundle_for_file(name)` (finds XML/YML/CWL in `parameters/`)
   - Looks up each spec key (e.g., `request_valid`) in `assertion_functions` dict
   - Calls the matching assertion function with the parameter bundle and test data list
3. Assertion functions are built via `model_assertion_function_factory(validate_fn, label)`:
   - `_assert_validates`: calls `validate_fn(bundle, state_dict)`, fails if exception
   - `_assert_invalid`: calls `validate_fn(bundle, state_dict)`, fails if **no** exception
   - Wrapped with `partial(_for_each, ...)` to iterate test case lists

The `assertion_functions` dict maps 22 keys (11 representations × valid/invalid) to these assertion partials.

## How-To Guides

### Adding a New Parameter Type

1. **Define model** in `parameters.py`: Extend `BaseGalaxyToolParameterModelDefinition`, set `parameter_type`/`type` literals, implement `py_type` property and `pydantic_template()` for all relevant representations
2. **Add to `GalaxyParameterT`** union type (`parameters.py:1865`)
3. **Add factory parsing** in `factory.py`: `elif param_type == "newtype":` branch in `_from_input_source_galaxy()`
4. **Create test tool** in `test/functional/tools/parameters/gx_newtype.xml`
5. **Add spec entries** in `parameter_specification.yml`: `gx_newtype:` with valid/invalid entries
6. **Add conversion handling** in `convert.py` callbacks if needed (decode/encode/runtimeify)

### Adding Validation Specs for an Existing Tool/Representation

Just add the key to the tool's entry in `parameter_specification.yml`:

```yaml
gx_data_collection:
  # ... existing entries ...
  job_runtime_valid:
   - parameter:
      class: Collection
      name: test_paired
      collection_type: paired
      tags: []
      elements:
        forward: {class: File, element_identifier: forward, ...}
        reverse: {class: File, element_identifier: reverse, ...}
  job_runtime_invalid:
   - parameter: {src: hdca, id: 5}  # job_internal format, not runtime
```

**Important**: The test runner must also have the representation wired in its `assertion_functions` dict. Currently `job_runtime` is NOT wired — adding it requires:
1. Create `validate_job_runtime = validate_model_type_factory("job_runtime")` in `model_validation.py`
2. Export from `__init__.py`
3. Import in `test_parameter_specification.py`
4. Add `job_runtime_valid`/`job_runtime_invalid` entries to the `assertion_functions` dict

### Adding a New State Representation

1. **Add literal** to `StateRepresentationT` (`parameters.py:82`)
2. **Create factory** (`parameters.py:~1952`): `create_new_model = create_model_factory("new_representation")`
3. **Create ToolState subclass** (`state.py`): Delegate `_parameter_model_for` to new factory
4. **Create validation function** (`model_validation.py`): `validate_new = validate_model_type_factory("new_representation")`
5. **Handle in `pydantic_template()`**: Add `elif state_representation == "new_representation":` in each parameter model class
6. **Wire test runner** (`test_parameter_specification.py`): Add to `assertion_functions` dict
7. **Add spec entries** in `parameter_specification.yml`
8. **Export** from `__init__.py`

### Verifying a Specific Aspect of Existing Tool State

To test-drive a specific validation scenario:

```python
from galaxy.tool_util.unittest_utils.parameters import parameter_bundle_for_file
from galaxy.tool_util.parameters import validate_internal_job

bundle = parameter_bundle_for_file("gx_data_collection")
validate_internal_job(bundle, {"parameter": {"src": "hdca", "id": 5}})  # should pass
validate_internal_job(bundle, {})  # should raise RequestParameterInvalidException
```

Or use `test_single()` in `test_parameter_specification.py` (line 77) — uncomment the desired `_test_file("gx_...")` call and run:
```bash
PYTHONPATH=lib python -m pytest test/unit/tool_util/test_parameter_specification.py::test_single -xvs
```

## Design Patterns

- **Strict models**: All generated models use `extra="forbid"` — unexpected keys cause validation errors
- **Strict scalar types**: `StrictInt`, `StrictBool`, `StrictFloat`, `StrictStr` prevent Pydantic coercion (`"5"` won't become `5`)
- **Discriminated unions**: Conditionals use custom discriminator functions to select the correct `When_*` submodel
- **AfterValidator**: Galaxy XML validators (regex, in_range, length, expression, empty_field) become Pydantic `AfterValidator` annotations
- **Visitor pattern**: `visit_input_values()` abstracts tree traversal for all conversion functions
- **YAML anchors**: Spec file uses anchors to share test cases between representations with identical valid/invalid sets
- **Auto-inference**: Test runner infers `request_internal_valid/invalid` from `request_valid/invalid` when not explicitly specified

## Current Gaps

- **`job_runtime` not in test runner**: No `validate_job_runtime` function exists in `model_validation.py`. The `assertion_functions` dict in `test_parameter_specification.py` has no `job_runtime_valid`/`job_runtime_invalid` entries. No tool in `parameter_specification.yml` has `job_runtime` test cases.
- **`gx_data_collection` has no runtime specs**: Only `job_internal_valid`/`invalid` exist; no coverage for the new `DataCollectionPairedRuntime`/`DataCollectionListRuntime`/`DataCollectionNestedRuntime` models.
- **`gx_data` has no runtime specs**: Same gap — `job_runtime` validation of `DataInternalJson` is untested via the spec system.
