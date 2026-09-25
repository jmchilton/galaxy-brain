Targets `release_26.1` — this is a bug fix for the tool execution API.

## What

Fixes #23555. When a validator rejects a populated data input, Galaxy now
returns the intended JSON 400 response instead of an HTML error page that
Planemo can only report as "invalid JSON content returned from Galaxy server."

## Why it happened

The validator failure is wrapped in `ParameterValueError` after the data input
has been resolved, so its `parameter_value` is a live
`HistoryDatasetAssociation`. `ParameterValueError.to_dict()` copied that model
object into `param_errors`, and the API error handler then failed while
serializing its own `RequestParameterInvalidException` response:

```
TypeError: Object of type HistoryDatasetAssociation is not JSON serializable
when serializing dict item 'parameter_value'
when serializing dict item 'param_errors'
```

The original 400 status survived, but the response body fell through to the
legacy HTML error renderer. The same path is used by expression, empty-dataset,
metadata, and other validators on data inputs; this is not specific to the
reporter's expression.

## How

`ParameterValueError.to_dict()` now includes `parameter_value` only when it can
be serialized by Galaxy's JSON encoder. JSON-safe values are unchanged — in
particular, Planemo's special handling of invalid dbkeys still receives the
submitted dbkey — while populated model objects are omitted. The error message,
message suffix, parameter name, and dynamic-parameter marker are unchanged.

This keeps the fix at the boundary that constructs the structured API error
instead of teaching the global JSON encoder how to represent arbitrary ORM
objects or leaking a dataset representation without an ID-encoding context.

## Testing

The existing `test_validation_empty_dataset` API test now parses the response
as JSON and asserts the complete `err_msg` and structured `param_errors` entry.
It reproduced the issue before the fix with the same
`HistoryDatasetAssociation is not JSON serializable` traceback, then passed
afterward.

| Check | Result |
|---|---|
| `TestToolsApi::test_validation_empty_dataset` | 1 passed (red with invalid JSON first) |
| `test/unit/app/tools/test_parameter_validation.py` | 17 passed |
| commit hooks (black, ruff, flake8, prettier, repository checks) | passed |

## Tool-author note

The expression in the issue compares the `column_names` list to one string, so
it is expected to reject the input. Testing membership would be appropriate,
for example `"MissCleavages" in value.metadata.column_names`. That tool issue is
separate from Galaxy returning an invalid response when any validator rejects a
data input.
