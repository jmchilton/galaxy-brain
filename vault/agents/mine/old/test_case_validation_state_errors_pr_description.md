Report test-case state-building errors instead of raising

---

Fixes #23001.

Replays and supersedes the work in #23002 by @richard-burhans on current `dev`, including the subsequent collection-error handling and validation refactor; the original commit authorship is preserved.

`validate_test_cases_for_tool_source()` should return a validation result for each test, but building the test-case state currently happens outside the exception handler that populates `validation_error`. Malformed numeric values or an invalid conditional selection can therefore abort validation of the whole tool instead of being reported as an invalid test case.

This change:

- Captures state-building failures as a per-test `validation_error`, using an empty state when construction fails.
- Shares the state/model and unhandled-input validation sequence through `TestCaseStateAndWarnings.validate()` so the request-parsing and reporting paths stay aligned.
- Reports a missing collection definition and invalid conditional/input selections with `RequestParameterInvalidException`.
- Gives conditionals with no `when` branches a clear model-construction error rather than failing while constructing an empty union.

This PR covers the per-test state-building layer; the companion branch `test_case_validation_model_parse_errors` handles failures while building the tool parameter model or parsing tests, plus case-insensitive numeric validator bounds.

## Testing

After rebasing onto `dev` at `c6c3b6df49f`, all 24 tests in `test/unit/tool_util/test_parameter_test_cases.py` passed on Python 3.13, including the regression for malformed integer/float values and unmatched conditional selections.

The test results above are local; check current fork CI before marking this ready for review.
