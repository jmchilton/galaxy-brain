# CWL Nullable Union Validation for job_internal State

## Problem

`CwlUnionParameterModel` validation accepts `{}` (empty dict / missing parameter) for `job_internal` state when it should reject it. Failing test case: `cwl_int_optional` in `parameter_specification.yml`.

## Background

CWL has a distinction between **nullable** and **optional**:

- **Nullable** (`["null", "int"]`): The parameter accepts null as a valid value. A job submission with `{parameter: null}` is valid.
- **Optional** (`has_default=True`): The parameter has a default value. A job submission with `{}` (parameter absent) is valid — the runtime fills in the default.

These are orthogonal. A parameter can be nullable but not optional (it MUST be provided, but null is an acceptable value). This is common in CWL — `["null", "int"]` without a default means "you must explicitly say this is null or give me an integer."

## Current Behavior

`CwlUnionParameterModel` conflates these two concepts:

```python
# parameters.py:2156-2159
@property
def request_requires_value(self) -> bool:
    if self.has_default:
        return False
    return not any(p.parameter_type == "cwl_null" for p in self.parameters)
```

For a `["null", "int"]` union with no default:
- `has_default` = False
- `any(cwl_null)` = True
- `request_requires_value` = `not True` = **False**

Then in `pydantic_template`:
```python
if state_representation == "job_internal":
    requires_value = self.request_requires_value and not self.has_default
    # False and True = False
```

Result: `requires_value = False`, so `{}` passes validation.

## Why This Matters for job_internal

`job_internal` represents the state of a job as it's being submitted internally within Galaxy. At this point, all parameters must have concrete values — the parameter resolution is complete. A missing parameter key means something went wrong in the pipeline, not that the user chose "no value."

The distinction:
- `{parameter: null}` → valid: explicitly null, `cwl_null` union member matches
- `{parameter: 5}` → valid: integer value, `cwl_integer` union member matches
- `{}` → **invalid**: no value was provided at all; this is a bug, not a choice

## Proposed Fix

For `job_internal`, require a value whenever there's no default, regardless of whether the union contains `cwl_null`:

```python
if state_representation == "job_internal":
    requires_value = not self.has_default
```

`request_requires_value` (which incorporates the cwl_null check) remains correct for request-level validation (`"request"`, `"workflow_step"`) where the HTTP API needs to know if a parameter can be omitted.

## Scope

- **File**: `lib/galaxy/tool_util_models/parameters.py:2143-2147`
- **Test case**: `cwl_int_optional` `job_internal_invalid` entry `{}` in `parameter_specification.yml`
