# Initial review — default profile

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: `c7394ba6229d320adcfcf8b79511bdc06014d12e` (diffed against `git merge-base origin/release_25.1 HEAD`)

## Verdict

Correct, minimal, release-appropriate fix. No P1/P2. Approve-worthy; two optional test nits below.

The old code could never have worked on Python 3 (`count / 2` float index), so every numeric `raw_data` request without `provider` 500'd. Replacing the hand-rolled median with `statistics.median` over non-`None` values is the right reuse (stdlib, handles odd/even). Dividing `sum` by `len(values)` fixes the understated mean, and keeping `meta["count"]` as rows read preserves the response shape, as the PR body states.

Checked:
- `NA` fixture really exercises the uncastable path: `is_float` in `lib/galaxy/datatypes/tabular.py` special-cases `na` as float, so the column is typed `float`, `float("NA")` raises, value stored as `None`. Test is meaningful.
- Short rows also produce `None` and are now filtered too (covered by the same filter).
- Forward-merge to `dev`: `dev` (8375d34bc46) changed the top of `get_data` (exceptions/validation) and imports; the PR touches the import block and the stats loop. Import hunk will need a trivial manual merge (`statistics.median` alongside the new `json` import tuple) — not a PR defect.
- CI: API jobs green; the one red job (`Test (3.10, 0)`) is objectstore integration, unrelated.

## Findings

### P3 1: Tests upload three datasets where one would do

Each test uploads its own dataset and requests a single column. One dataset with two numeric columns (one odd-count clean, one with `NA`) requested as `columns=[1,2]` in a single call would cover the same cases with fewer uploads and also exercise the multi-column loop (per-index `meta`/`data`), which no test currently covers. The even-count median could be a second small upload or a different row window via `start_val`/`max_vals`.

### P3 2: Even-count test asserts only `median`

`test_raw_data_tabular_numeric_column_even_count_median` could also assert `mean == 3` and `count == 2` at no cost, so a regression in the shared stats block shows up in both shapes.

## Non-findings (pre-existing, not touched by PR)

- A literal `nan`/`inf` in a float column is castable and enters `min`/`max`/`sum`/`median`; results become NaN/inf (and NaN may not serialize as strict JSON). Pre-existing in the sum/min/max accumulators; out of scope for this release fix.
- `line.split()` splits on any whitespace rather than tabs; pre-existing.
