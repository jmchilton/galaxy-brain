# galaxy#21242 — Transient Test Failure - test_delete_job_with_message

[Issue](https://github.com/galaxyproject/galaxy/issues/21242)

Transient failure of API `test_delete_job_with_message`; mvdbeek's job-deletion race fixes [#23686](https://github.com/galaxyproject/galaxy/pull/23686) [25.1] and [#23687](https://github.com/galaxyproject/galaxy/pull/23687) [26.0] are merged; next: PR removing the test's transient-test decorator, then close the issue.
