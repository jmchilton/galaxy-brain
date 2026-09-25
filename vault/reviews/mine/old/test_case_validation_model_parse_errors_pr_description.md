Report tool-model and test-parse failures in test-case validation

---

Fixes #23003.

Replays and supersedes #23004 by @richard-burhans on current code, preserving the original commit authorship.

This depends on the replacement PR for #23002, branch [`test_case_validation_state_errors`](https://github.com/jmchilton/galaxy/tree/test_case_validation_state_errors). The [branch comparison](https://github.com/jmchilton/galaxy/compare/test_case_validation_state_errors...test_case_validation_model_parse_errors) isolates this follow-up's additional commit; a PR against `dev` opened before the base lands will also include its commits, so rebase this branch onto `dev` after the base merges.

The base PR reports errors encountered while building an individual test's state. This follow-up covers the earlier stages: building the tool parameter model and parsing the tool's test definitions currently happen outside the reporting exception handler, so either failure can still abort the whole validation call.

This change:

- Captures parameter-model construction and test-parsing failures as a single `TestCaseStateValidationResult` containing `validation_error`, an empty tool state, and an empty parameter bundle.
- Makes numeric validator-bound detection case-insensitive so values such as `Infinity`, `Inf`, and `1E5` are parsed with `float()` rather than incorrectly falling through to `int()`.
- Adds regressions for an unmodelable parameter type and an `in_range` bound spelled `Infinity`.

This does not catch failures in `get_tool_source()` before this function is called, and does not change tool execution or parameter validation semantics for valid tools.

## Testing

After rebasing onto the updated base branch at `262e080dfe`, all 26 tests in `test/unit/tool_util/test_parameter_test_cases.py` passed on Python 3.13, including both new regressions and the base branch's tests.

The test results above are local; check current fork CI before marking this ready for review.
