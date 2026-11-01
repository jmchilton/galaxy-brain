# Review branch `pr_24598_review_0`

Branch [`pr_24598_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24598_review_0) on John's fork, based on PR head `ec57ee1b020`, replaces the PR's stub-based unit test with a mock-free subprocess test. The test runs the real `pgcleanup.py` against a sqlite `database_connection`, which makes `Cleanup.conn` raise inside `run()`, and asserts exit code 1 plus the logged run-sequence exception. It fails at its own assertion (`assert 0 == 1`) against the base script and passes at the PR head. The script change is untouched.

- `e278e8edcea` Test pgcleanup exit code via real run-sequence failure — rewrites `test/unit/scripts/test_pgcleanup_exit_code.py` as one subprocess test; no mocks or importlib loading. (P2 1)
