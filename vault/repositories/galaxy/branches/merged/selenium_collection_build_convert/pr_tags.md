- `kind/bug`
- `area/dataset-collections`
- `area/testing/selenium`

`kind/bug` because the Convert Collection fix is what justifies a 26.2 target; the tests are coverage for it and its neighbors. The labeler would add `area/UI-UX` (`client/src/**`), `area/testing` (`lib/galaxy_test/**`) and `area/testing/selenium` (`lib/galaxy/selenium/**`). Dropped `area/UI-UX` (one `:disabled` expression; the rest of `client/` is selectors) and `area/testing` (`area/testing/selenium` already says it). Added `area/dataset-collections`, which no glob catches.
