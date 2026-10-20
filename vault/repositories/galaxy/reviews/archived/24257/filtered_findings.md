# Filtered findings: #24257

- **default P3 2: five near-identical count subqueries, extract an `_active_job_count` helper.** Filtered because it isn't actionable for this release backport. The duplication predates the PR, and the reviewer itself scoped it to a `dev` follow-up. That follow-up could also cover the deferred handler pre-check alignment.
- **gx_test_challenger P3 2: collapse the five `set_*_limit` helpers into a `pytest.param` table.** Filtered as a preference nit on a small PR. The current helpers are readable, and the change would add churn to a backport without improving coverage.
