# Initial review: galaxyproject/galaxy#24817

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort low (coordinator-supplied context; static review)
- Reviewed commit: `5a70538cf56893f10d7e01c0b4a8b9d36a2be742`
- PR: "Reject control characters in sample sheet values and add regression coverage" (jaskirat17), base `dev`. Related: galaxyproject/foundry#191.

## Verdict

Approve after a format fix. The core change is right and minimal: since b5b6fbd979c ("Relax validation requirement for non-sample identifiers"), `validate_column_value` called `strip_control_characters(column_value)` and discarded the result, so string columns had no control-character check at all. Comparing the stripped value against the original turns that no-op into a real rejection. Because the check lives in `validate_column_value`, every entry path (collection create via `sample_sheet.py`, `dereference.py`, both `landing.py` paths) gets it. The error names the column rather than echoing the offending value, which is the right call for values containing control characters.

The one real problem is that the changed test files fail Galaxy's `black --check` format lint (P2 1). Everything else is optional test placement or tightening.

## Findings

### P2 1 — Test changes fail `black --check` (format lint)

`tox -e format` runs `black --check --diff .` with the pinned `black==26.10.1`. Running that black version on the changed files gives diffs in both test files:

```diff
--- lib/galaxy_test/api/test_dataset_collections.py
-        assert collection["elements"][0]["columns"] == [
-            "short;long", "--min=10 --max=50"
-        ]
-        assert collection["elements"][1]["columns"] == [
-            "long", "/data/reference.v2"
-        ]
+        assert collection["elements"][0]["columns"] == ["short;long", "--min=10 --max=50"]
+        assert collection["elements"][1]["columns"] == ["long", "/data/reference.v2"]
--- lib/galaxy_test/api/test_workflows.py
-                rows={"sample1": [1, "short;long"],"sample2": [2, "--min=10 --max=50"],},
+                rows={
+                    "sample1": [1, "short;long"],
+                    "sample2": [2, "--min=10 --max=50"],
+                },
```

Fix: run `make format` (or black on those two files).

### P3 1 — Rejection loop only asserts 400, not why

`for invalid_value in ("short\nlong", "short\tlong", "short\x00long")` asserts only `assert_status_code_is(response, 400)`. Any 400 passes, including one caused by an unrelated mistake in the payload. Pin it to the new check:

```diff
         for invalid_value in ("short\nlong", "short\tlong", "short\x00long"):
             payload["rows"]["sample1"][0] = invalid_value
             response = self._post("dataset_collections", payload, json=True)
             assert_status_code_is(response, 400)
+            assert "control characters" in response.json()["err_msg"]
```

### P3 2 — Restore unit coverage where the check was dropped

When b5b6fbd979c relaxed this validation, it also deleted the tab case from `test_sample_sheet_validation_string_type` in `test/unit/data/dataset_collections/test_sample_sheet_util.py`. That file is the natural home for the per-character matrix: it is fast, it already covers every other column-type rule, and it would have caught the discarded return value. The API test could then keep a single control-character case as an end-to-end check. Suggested addition:

```python
@pytest.mark.parametrize("value", ["a\nb", "a\tb", "a\rb", "a\x00b"])
def test_sample_sheet_validation_string_rejects_control_characters(value):
    with pytest.raises(RequestParameterInvalidException):
        validate_row([value], [{"type": "string", "name": "condition", "optional": False}])


def test_sample_sheet_validation_string_allows_punctuation():
    validate_row(["short;long --min=10 /data/ref.v2"], [{"type": "string", "name": "condition", "optional": False}])
```

Optional. The API coverage the PR adds is already a valid regression test.

### P3 3 — TSV-export assertion tucked into the job-cache test

`test_run_workflow_use_cached_job_with_sample_sheet` is about `use_cached_job`. The PR swaps its row values for nf-core-style strings and adds TSV-content assertions mid-test, so one test now checks two unrelated things. A failure in either now looks like a caching regression. There is already a workflow-framework case for this tool (`lib/galaxy_test/workflow/collection_semantics_cat_sample_sheet.gxwf.yml` / `-tests.yml`, using `rows:` and `has_text` asserts). Adding a case there with punctuation-heavy row values and `has_line` asserts would be cheaper and better isolated. Optional; the current assertions are correct (the output is named `output`, and with `include_headers` off the lines are `key\tcol1\tcol2`).

### P3 4 — Sibling string values in column definitions aren't checked

Row values are now rejected when they contain control characters. A `string` column's `default_value`, `restrictions` and `suggestions` (`SampleSheetColumnDefinitionModel`) are still accepted with them. The failure is loud rather than silent: a row filled from such a default is rejected at create time. But a definition carrying a value that can never pass is unsupported input that is cheaper to reject up front. A small `model_validator` beside `check_nature_of_default`, using the same `strip_control_characters(v) != v` test, would make the two sources consistent. Optional and arguably out of scope; mention only if cheap.

## Notes (not findings)

- `unicodedata` category `Cc` covers `\t \n \r \x00`, `\x7f` and C1 controls (including `\x85`). It does not cover U+2028/U+2029 (categories Zl/Zp), which `str.splitlines()` also treats as line breaks. Galaxy's tabular paths split on `\n`, so this is not a practical concern today.
- The PR description correctly notes that the punctuation restriction from foundry#191 was already gone on `dev`. The positive `short;long` assertions are regression locks, not a behavior change.
- No security-sensitive findings.
