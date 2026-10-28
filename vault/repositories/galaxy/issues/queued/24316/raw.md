# Filter (Filter1) fails with a Python traceback when the condition names a column the input doesn't have

Running **Filter** (`Filter1`, `tools/stats/filtering.py`, version 1.1.1) with a condition on a column past the end of the input (e.g. `c9>1` on a 2-column tabular) makes a red dataset whose only explanation is a traceback:

```
Traceback (most recent call last):
  File ".../tools/stats/filtering.py", line 269, in <module>
    col_type = in_column_types[col - 1]
               ~~~~~~~~~~~~~~~^^^^^^^^^
IndexError: list index out of range
```

That is what the user sees in the expanded history item, on the error page, and in the **Tool Standard Error** log on the details page. GTN's "Troubleshooting errors" FAQ asks users to read exactly those, and the error doesn't say which column or how many the input has. Filter is used heavily in GTN tutorials (data-manipulation-olympics etc.), where a wrong column number is an easy slip.

Found by the playwright FAQ loop (`faqs/galaxy/analysis_troubleshooting.md` run, `release_26.2`, `galaxy_ui_driver` `6379b83d12a`). Same code on dev.

## Cause

`tools/stats/filtering.py`:
- line ~223 reads `in_columns = int(sys.argv[4])` and `in_column_types = sys.argv[5].split(",")` from `${input.metadata.columns}` / `${input.metadata.column_types}`.
- line ~259 computes `used_cols` from `c(\d)+` matches and `largest_col_index = max(used_cols)`.
- line ~266 loops `for col in range(1, largest_col_index + 1)` and indexes `in_column_types[col - 1]` with no bounds check. `in_columns` is never compared to `largest_col_index`.

The script already has `stop_err(msg)` and uses it for illegal conditions ("Illegal/invalid in condition ..."), so the fix fits the existing style.

## Likely fix

After computing `largest_col_index`:

```python
if largest_col_index > in_columns:
    stop_err(
        "Column c%d does not exist: the input has %d column%s. Columns are numbered from c1."
        % (largest_col_index, in_columns, "" if in_columns == 1 else "s")
    )
```

Check the "variable number of columns" test in `tools/stats/filtering.xml` (metadata `columns` should be the max over lines, so it should still pass). Possibly bump the tool version (1.1.1 -> 1.1.2) since the behavior visible to users changes; the maintainers may prefer not to for an error message.

## Test

Add a tool test to `filtering.xml` with `expect_failure="true"` and `<assert_stderr><has_text text="does not exist"/></assert_stderr>`, e.g. `cond="c9>1"` on an existing small tabular in `test-data`. Run with `./run_tests.sh --main_tools -id Filter1`. Red today (stderr has the IndexError instead).
