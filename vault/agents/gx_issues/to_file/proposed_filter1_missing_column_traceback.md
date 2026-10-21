**Title:** Filter (Filter1) error handling: a missing column gives a bare traceback, and its own error messages finish green

When Filter's condition uses a column the input doesn't have (for example `c9>1` on a 2-column table), the job fails with a Python traceback instead of naming the column. The script's own error messages are worse: since profile 24.2 they leave a green dataset.

What users see today in the history item, on the error page and in **Tool Standard Error**:

```
Traceback (most recent call last):
  File ".../tools/stats/filtering.py", line 269, in <module>
    col_type = in_column_types[col - 1]
               ~~~~~~~~~~~~~~~^^^^^^^^^
IndexError: list index out of range
```

What it could say:

```
Column c9 does not exist: the input has 2 columns. Columns are numbered from c1.
```

Filter is used heavily in GTN tutorials, where a wrong column number is an easy slip. GTN's "Troubleshooting errors" FAQ tells users to read exactly this output, and today it names neither the column nor the input's width.

The script's own error messages have a worse problem. Since 1.1.1 moved to `profile="24.2"`, an illegal condition (for example `c1=="x" and`) comes back as a green, empty dataset, and the explanation exists only in stderr.

<details><summary>Cause</summary>

`tools/stats/filtering.py` reads the input's column count and types (`in_columns`, `in_column_types`, from `${input.metadata.columns}` and `${input.metadata.column_types}`). It then takes `largest_col_index = max(used_cols)` from the `cN` references in the condition and loops `for col in range(1, largest_col_index + 1)`, indexing `in_column_types[col - 1]`. It never compares `largest_col_index` with `in_columns`.

The script's existing error helper can't simply be reused as is. `stop_err()` writes to stderr and calls `sys.exit()`, which exits 0. That was enough while Filter1 had no `profile`, because legacy tools fail on any stderr output. 25eb8a3 ("Modernize more tools in filters/") set `profile="24.2"` on version 1.1.1, so failure is now decided by exit code alone. Every `stop_err` path ("Illegal/invalid in condition", "Data does not appear to be tabular", "Filter condition ... likely invalid") therefore finishes as a green dataset with empty output and the message only in stderr. The traceback above is red only because an uncaught exception exits 1.

</details>

## Context

Found while running GTN's "Troubleshooting errors" FAQ end to end on `release_26.2` (same code on dev). Bug related to 🎯 #3343 - empty input takes the same exit-0 "not tabular" `stop_err` path.

## Proposed Approach

Make `stop_err` exit 1, so its messages fail the job again under profile 24.2. Then, once `largest_col_index` is computed, call it with the message above when that index exceeds `in_columns`. Add `expect_failure="true"` tool tests to `filtering.xml`, using an existing small tabular file from `test-data`: one with `cond="c9>1"` that checks with `assert_stderr` `has_text` for "does not exist", and one with an illegal condition. Both fail today, the first on the stderr text and the second because the job succeeds.

<details><summary>Details</summary>

```python
def stop_err(msg):
    sys.stderr.write(msg)
    sys.exit(1)

...

if largest_col_index > in_columns:
    stop_err(
        "Column c%d does not exist: the input has %d column%s. Columns are numbered from c1."
        % (largest_col_index, in_columns, "" if in_columns == 1 else "s")
    )
```

`c10` is parsed correctly (`match.group()[1:]` slices the whole match). The `c(\d)+` regex also matches inside string literals, though: `c1=='abc9'` counts as a reference to `c9`. That already crashes today, and with the check it would report "Column c9 does not exist", which is misleading. Collecting `cN` names from the AST nodes that `check_expression` already walks would fix that, but it can be a follow-up.

The existing "variable number of columns" test (`filter1_in3.sam`, `c3`/`c5`) is unaffected, because the `sam` datatype sets `columns` to 12. For generic tabular, `columns` is the widest line among the first 100,000 lines.

`filtering_1_1_0.xml` (version 1.1.0, no profile) shares `filtering.py`, and step 1 doesn't change its outcome, since it already fails on stderr. For 1.1.1, step 1 changes job state, so it is probably worth a version bump (1.1.1 → 1.1.2), with 1.1.1 frozen alongside 1.1.0 in `tool_conf.xml.sample`, as other `tools/` changes have done.

</details>

## Alternative Approaches

The column could instead be validated in the tool form, but the condition is free text, so the form would have to parse it. The script already parses it and already reports bad conditions, which makes the script the simpler place for the check.

<details><summary>Alternatives In Detail</summary>

### Alternative: Validate in the tool XML

<details><summary>Description</summary>

#### Details

Add a `<validator>` on `cond` that checks every `cN` against the input's `columns` metadata.

#### Why the proposed approach is preferred

Galaxy has no stock validator for column references inside a free-text expression, so it would need a custom regex or expression validator. It would also do nothing when the tool runs through the API, and in workflows where the input's metadata isn't known yet.

</details>

### Alternative: Add `<stdio>` / `detect_errors="aggressive"` instead of changing `stop_err`

<details><summary>Description</summary>

#### Details

Restore stderr-based failure in the XML rather than in the script.

#### Why the proposed approach is preferred

The script's warnings and summary go to stdout, so this would work, but it keeps a stderr-means-failure convention that profile 24.2 moved away from. A non-zero exit is explicit.

</details>

</details>
