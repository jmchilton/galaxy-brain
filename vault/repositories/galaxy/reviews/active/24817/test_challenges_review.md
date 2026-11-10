# Test challenges review - PR #24817

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort low
- Reviewed commit: `5a70538cf56893f10d7e01c0b4a8b9d36a2be742`
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: tests are at the right layer (API) and the rejection loop is properly red-to-green. Two cheap fixes; rest optional.

## P2 1 - Rejection loop only asserts status 400

`test_sample_sheet_validating_against_column_definition` asserts `400` for `\n`, `\t`, `\x00` values, but the same
test already expects 400s for other reasons, and any other validation failure would satisfy it. Assert the cause:

```python
for invalid_value in ("short\nlong", "short\tlong", "short\x00long"):
    payload["rows"]["sample1"][0] = invalid_value
    response = self._post("dataset_collections", payload, json=True)
    assert_status_code_is(response, 400)
    assert_error_message_contains(response, "control characters")
```

(`assert_error_message_contains` is in `galaxy_test.base.api_asserts`.)

## P2 2 - Edited tests fail `black --check`

tox `format` env runs `black --check --diff .`; both test files would be reformatted:
- `lib/galaxy_test/api/test_dataset_collections.py`: the two wrapped `assert ... == [...]` lists fit on one line.
- `lib/galaxy_test/api/test_workflows.py`: `rows={"sample1": [1, "short;long"],"sample2": [2, "--min=10 --max=50"],}`
  (missing space, magic trailing comma).

Run `black` on both files.

## P3 1 - Workflow TSV assertion piggybacks on the cached-job test (optional)

The `test_workflows.py` change rewrites fixture values in `test_run_workflow_use_cached_job_with_sample_sheet` and adds
TSV export assertions. It passes on `dev` and tests `__SAMPLE_SHEET_TO_TABULAR__` output, not job caching or the fix.
Either drop it or move it to its own test so a failure points at the right feature.

## P3 2 - New cases appended to an already heavily mutated payload (optional)

The preservation and rejection blocks reuse a payload mutated three times above. A dedicated
`test_sample_sheet_string_column_rejects_control_characters` would read better and name the regression.
