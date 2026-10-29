# Brain research

Little prior brain coverage; the one useful note describes the dev-side job files API (25.1 still has the legacy controller).

```yaml
documents:
  - path: vault/research/Component - Pulsar Input Staging.md
    why: Job files API section lists route params, job_key validation, write-path rules and sibling ports endpoint; shows what Pulsar sends as `path`.
    load_when: Choosing where the absolute-path check goes, and checking Pulsar callers still send absolute paths.
  - path: vault/repositories/galaxy/branches/merged/job_files_fastapi/index.md
    why: Prior branch that moved this API to FastAPI/JobFilesManager (dev); merge-forward target for this change.
    load_when: Writing the merge-forward note for 26.2.
  - path: vault/repositories/galaxy/branches/merged/job_files_fastapi/pr_description.md
    why: Describes the write-path validation boundary kept from earlier releases.
    load_when: Reviewing the validation ordering.
research_requests: []
```

Notes for implementers (from reading the 25.1 worktree, not vault):

- `lib/galaxy/webapps/galaxy/api/job_files.py` `create` calls `__authorize_job_access`, then `__check_job_can_write_to_path` (working-directory / output-dataset check). The new absolute-path check goes between the empty-`path` check and that call; use `exceptions.RequestParameterInvalidException` (400).
- `lib/galaxy/job_execution/ports/view.py` `register_container_information` has `log.info(kwd)`, which logs `job_key`. Drop it.
- `test/integration/test_job_files.py` has `test_write_by_state`, `test_write_with_tus`, `test_write_protection`; a new relative-path write test can reuse `create_static_job_with_state` and the `_api_job_keys` helpers. Existing tests already pass absolute paths.
- No gaps worth a research request; the Pulsar Input Staging note covers the dev manager but not 25.1's controller layout, which reading the code answers.
