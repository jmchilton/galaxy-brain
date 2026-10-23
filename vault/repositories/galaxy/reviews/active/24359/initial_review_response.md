(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It fixes the `raw_data` column `mean`/`median` computation (previously a float list index under Python 3, so numeric stats failed), excludes uncastable values from those stats, and adds API tests; `count` still includes uncastable rows and the response shape is unchanged, so rollback is a small revert.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24359_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Review branch [`pr_24359_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24359_review_0)

This branch builds on the PR's commit `c7394ba6229` and tightens only the new API tests in `lib/galaxy_test/api/test_datasets.py`. It strengthens assertions so mean and median are checked independently, adds coverage for a numeric column with no castable values, and then folds everything into one test that uploads a single 3-column dataset and requests all columns at once, which also exercises the multi-column path. No production code changes. The final test passes on the branch and fails with a 500 against the pre-PR `basic.py`.

- [`d81ddf7dd2f`](https://github.com/jmchilton/galaxy/commit/d81ddf7dd2f) Strengthen even-count raw_data stats test — asserts `count` and `mean` too, on values where mean and median differ.
- [`e5cd2208078`](https://github.com/jmchilton/galaxy/commit/e5cd2208078) Make uncastable-value raw_data test separate mean from median — uses `2, NA, 4, 9` so mean (5) and median (4) differ.
- [`9a75d0dc0db`](https://github.com/jmchilton/galaxy/commit/9a75d0dc0db) Test raw_data stats for a numeric column with no castable values — an all-`NA` float column gets no `mean`/`median`.
- [`53c31a7032e`](https://github.com/jmchilton/galaxy/commit/53c31a7032e) Cover raw_data numeric stats in one multi-column request — one upload, `columns=[0,1,2]`, replacing four separate uploads.

</details>

</details>

### P3 1: Multi-column stats path untested; tests use one upload per case (implementation verified)

Each new test uploads its own dataset and requests one column, so the per-column `meta`/`data` loop over several requested columns is never exercised. One dataset with several numeric columns requested as `columns=[0,1,2]` covers every case in a single upload and call.

Commit `53c31a7032e` replaces the helper and separate tests with one test over a 4-row, 3-column dataset: an even-count int column, a column with an `NA` among three castable values (odd-count median), and an all-`NA` column.

Fixed in [`53c31a7032e`](https://github.com/jmchilton/galaxy/commit/53c31a7032e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Even-count test asserts only `median` (implementation verified)

`test_raw_data_tabular_numeric_column_even_count_median` checks only `median`, and with values `2, 4` the mean equals the median. Asserting `count` and `mean` too, on values where they differ (`2, 4, 6, 12` → mean 6, median 5), catches regressions in either computation.

Fixed in [`d81ddf7dd2f`](https://github.com/jmchilton/galaxy/commit/d81ddf7dd2f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Uncastable-value test can't tell mean from median (implementation verified)

In `test_raw_data_tabular_numeric_column_with_uncastable_value`, values `2, NA, 4` give mean == median == 3, so the median assertion would also pass with a plain average. `2, NA, 4, 9` (mean 5, median 4, count 4) makes each assertion independent; the mean still pins the `len(values)` divisor.

Fixed in [`e5cd2208078`](https://github.com/jmchilton/galaxy/commit/e5cd2208078).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Numeric column with no castable values not covered (implementation verified)

The new `and values` guard skips stats when nothing in a numeric column casts, but no test hits it. An all-`NA` column is typed `float` (`is_float` special-cases `na`), so it reaches that branch; the test should assert `mean`/`median` are absent and `min` is `None`. Without the guard (pre-PR code) this case raised.

Fixed in [`9a75d0dc0db`](https://github.com/jmchilton/galaxy/commit/9a75d0dc0db).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
