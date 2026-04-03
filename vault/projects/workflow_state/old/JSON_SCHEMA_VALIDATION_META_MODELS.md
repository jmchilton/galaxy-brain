# JSON Schema Validation of parameter_specification.yml

## Goal

Validate `parameter_specification.yml` test cases against JSON Schema generated from Pydantic models (not just the Pydantic models directly). This proves the JSON Schemas are usable from non-Python toolkits (TypeScript, Go, etc.) for tool state validation.

## Status: Implemented

All steps completed. Test suite green (8 Pydantic tests + 1 JSON Schema test + 308 workflow state tests).

## Background

Currently `test_parameter_specification.py` validates each tool's valid/invalid payloads against dynamically-generated Pydantic models. The system can also generate JSON Schema from those models via `to_json_schema()` in `lib/galaxy/tool_util/parameters/json.py`. But there were no tests that validated the spec YAML entries against the exported JSON Schemas.

### The Fidelity Gap

Pydantic models use `AfterValidator` callbacks for Galaxy's static validators (regex, expression, in_range, length, empty_field). These are **Python-only runtime checks** — they do not emit any JSON Schema keywords. So:

| Validator | Pydantic catches it | JSON Schema catches it |
|-----------|-------------------|----------------------|
| Type mismatch (str vs int) | Yes | Yes |
| `extra="forbid"` (unknown keys) | Yes | Yes (`additionalProperties: false`) |
| `StrictInt`/`StrictBool` (no coercion) | Yes | Yes (strict types) |
| Discriminated unions (conditionals) | Yes | Yes (after fix) |
| `regex` validator | Yes (AfterValidator) | **No** |
| `expression` validator | Yes (AfterValidator) | **No** |
| `in_range` validator | Yes (AfterValidator) | **No** |
| `length` validator | Yes (AfterValidator) | **No** |
| `empty_field` validator | Yes (AfterValidator) | **No** |
| `no_options` validator | Yes (AfterValidator) | **No** |

## What Was Done

### Step 1: Built JSON Schema validation harness

New test module: `test/unit/tool_util/test_parameter_specification_json_schema.py`

For each tool in `parameter_specification.yml`, for each `*_valid`/`*_invalid` entry across all 12 state representations, validates against Draft 2020-12 JSON Schema generated from the Pydantic models.

### Step 2: Identified and categorized divergences

Initial scan found **25 Category B bugs** (valid entries wrongly rejected) and **44 Category A expected skips** (invalid entries JSON Schema can't reject).

### Step 3: Fixed Category B bugs

Three classes of bugs fixed:

#### 3a. Conditional `oneOf` ambiguity (8 entries fixed)

**Root cause**: Pydantic's custom callable discriminator (`model_x_discriminator`) doesn't translate to JSON Schema. The generated `oneOf` had overlapping branches — explicit `When_<test>_<value>` branches had the test parameter as optional (with `default: null`), so `{}` or inputs without the test parameter matched multiple branches, causing `oneOf` to fail.

**Fix**: Post-processing in `_fix_conditional_oneofs()` in `json.py` — for every explicit When branch (not `__absent__`), adds the test parameter to `required` and removes its `default`. This makes `oneOf` branches mutually exclusive:
- Inputs with test_parameter → match exactly one explicit branch (by const value)
- Inputs without test_parameter → match only the `__absent__` branch

Also fixed 3 Category A entries that were wrongly accepted due to the same overlap.

#### 3b. URL field alias (11 entries fixed)

**Root cause**: `BaseDataRequest.url` had `alias="location"` — JSON Schema used the alias as the property name, but test data (and Pydantic validation via `**kwargs`) used the field name `url`.

**Fix**: Added `validation_alias=AliasChoices("url", "location")` to the field. JSON Schema in validation mode now uses `url` (from validation_alias) while serialization still uses `location` (from alias).

#### 3c. Comma-separated multi-select strings (3 entries fixed)

**Root cause**: `SelectParameterModel` and `DataColumnParameterModel` use `mode="before"` field validators to split comma-separated strings into lists for `test_case_xml`. JSON Schema only saw the `List[...]` type, rejecting the string input.

**Fix**: Wrapped the type in `Union[str, List[...]]` for `test_case_xml` with `multiple=True`, so JSON Schema accepts both strings and arrays.

### Step 4: Added skip annotations

Two annotation types in `parameter_specification.yml`:

- `json_schema_skip`: Invalid entries that JSON Schema correctly can't reject (AfterValidator loss). 41 entries across 13 tools.
- `json_schema_valid_skip`: Valid entries that JSON Schema wrongly rejects due to complex discriminator overlap. 3 entries in 2 collection tools.

### Step 5: Remaining known issues

**Collection runtime `oneOf` overlap** (3 entries, skipped via `json_schema_valid_skip`):
- `DataCollectionNestedRecordRuntime` has non-const `collection_type` (accepts any string), overlapping with typed variants like `DataCollectionPairedRuntime` (const `"paired"`). Both match the same input, causing `oneOf` to fail.
- Fix would require converting to `anyOf` or implementing a JSON Schema `discriminator` with fallback, deferred.

## File Changes

| File | Change |
|------|--------|
| `test/unit/tool_util/test_parameter_specification_json_schema.py` | **New** — JSON Schema validation harness |
| `test/unit/tool_util/test_parameter_specification.py` | Skip unknown keys (`json_schema_skip`, `json_schema_valid_skip`) |
| `test/unit/tool_util/parameter_specification.yml` | Added `json_schema_skip` and `json_schema_valid_skip` annotations |
| `lib/galaxy/tool_util/parameters/json.py` | Added `_fix_conditional_oneofs()` post-processing |
| `lib/galaxy/tool_util_models/parameters.py` | URL validation_alias fix, comma-string Union type for multi-selects |

## Future Work

### Enrich JSON Schema output (would reduce skips)

For validators that **can** be represented in JSON Schema:
- `regex` → `"pattern": "^[actg]*$"`
- `in_range` → `"minimum"` / `"maximum"` / `"exclusiveMinimum"` / `"exclusiveMaximum"`
- `length` → `"minLength"` / `"maxLength"`

This would remove entries from `json_schema_skip` as the JSON Schema becomes more expressive.

`expression` and `empty_field` with `negate` cannot be represented and would remain skipped.

### Fix collection runtime discriminator

Convert collection runtime `oneOf` to use JSON Schema `discriminator` with `propertyName: "collection_type"` and handle nested types as a fallback. Would remove the 3 `json_schema_valid_skip` entries.
