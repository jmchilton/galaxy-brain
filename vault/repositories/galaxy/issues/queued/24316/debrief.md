# Debrief: filter1_missing_column_traceback

## Research

- Checked on dev: `tools/stats/filtering.py` never compares `largest_col_index` with `in_columns`, so it hits an `IndexError` at line 269. No duplicate found. #3343 (empty input, open) is related: it takes the same `stop_err` path.
- The reviewer reproduced the exact traceback with a scratch copy of the script and the argv from `filtering.xml`. The patched copy prints the intended message. `c10` parses correctly, but `cN` inside string literals (`c1=='abc9'`) is counted as a column reference; noted as a follow-up.

## Big finding from the review

The fix as first drafted was broken. `stop_err()` calls a bare `sys.exit()`, which exits 0. 25eb8a32485 ("Modernize more tools in filters/", 2025-09-02) gave 1.1.1 `profile="24.2"`, so Galaxy now decides failure by exit code alone. So:
- a plain `stop_err` bounds check would turn a red traceback into a green, empty dataset;
- every existing `stop_err` path (illegal condition, not tabular, invalid filter) already finishes green today.

Verified by reading the code: the bare `sys.exit()` and `profile="24.2"` on dev. The green state comes from the stdio rules plus the exit 0 seen in the scratch runs; no real Galaxy job was run.

## Rewrite

- Title and opener widened to cover both problems: the traceback, and green `stop_err` errors. One fix covers both.
- Proposed approach: `stop_err` exits 1, add the bounds check, and add two `expect_failure` tool tests (missing column; illegal condition). Bump to 1.1.2 and freeze 1.1.1 next to 1.1.0, since job state changes. `filtering_1_1_0.xml` shares the script but already fails on stderr.
- Alternatives: validate in the tool form; `<stdio>`/`detect_errors="aggressive"` in the XML.

## Left over

- Not confirmed end to end in a real Galaxy job (the green state comes from reading the code and the exit 0).
- Could be filed as two issues (the profile regression separately); kept as one because the fix is shared.
