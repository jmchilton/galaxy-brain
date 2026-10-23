# Review branch pr_24359_review_0

This branch builds on the PR's commit `c7394ba6229` and tightens only the new API tests in `lib/galaxy_test/api/test_datasets.py`. It strengthens assertions so mean and median are checked independently, adds coverage for a numeric column with no castable values, and then folds everything into one test that uploads a single 3-column dataset and requests all columns at once, which also exercises the multi-column path. No production code changes. The final test passes on the branch and fails with a 500 against the pre-PR `basic.py`.

- `d81ddf7dd2f` Strengthen even-count raw_data stats test — asserts `count` and `mean` too, on values where mean and median differ.
- `e5cd2208078` Make uncastable-value raw_data test separate mean from median — uses `2, NA, 4, 9` so mean (5) and median (4) differ.
- `9a75d0dc0db` Test raw_data stats for a numeric column with no castable values — an all-`NA` float column gets no `mean`/`median`.
- `53c31a7032e` Cover raw_data numeric stats in one multi-column request — one upload, `columns=[0,1,2]`, replacing four separate uploads.
