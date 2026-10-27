```gb-tasks
- prompt: Run ./REVIEW.md on galaxyproject/planemo#1756
  agent_dir: planemo
  link: https://github.com/galaxyproject/planemo/pull/1756
  description: 🔎 bernt-matthias fixes KeyError in shed_lint --ensure_metadata for missing/empty .shed.yml fields, with regression tests.
  status: recommended
  suggested_by: planemo/SUGGESTED_TASKS.md#Review New PRs
- prompt: Run ./REVIEW.md on galaxyproject/planemo#1715
  agent_dir: planemo
  link: https://github.com/galaxyproject/planemo/pull/1715
  description: 🔎 guerler adds --use_async_submission to submit tool tests via the jobs API (review already requested from jmchilton).
  status: idea
  suggested_by: planemo/SUGGESTED_TASKS.md#Review New PRs
- prompt: Run ./WORK_HORSE.md on galaxyproject/planemo#1764
  agent_dir: planemo
  link: https://github.com/galaxyproject/planemo/issues/1764
  description: 🐴 Document (and surface) tool_data_table_conf.xml.test discovery for workflow tests; file is silently ignored if named without .test.
  status: idea
  suggested_by: planemo/SUGGESTED_TASKS.md#Work New Issues
- prompt: De-conflict branch publish-planemo-cli. BRANCH_DIRECTORY is vault/repositories/planemo/branches/active/publish-planemo-cli/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: planemo
  link: https://github.com/galaxyproject/planemo/pull/1733
  record: planemo/branches/publish-planemo-cli
  profile: Sonnet (high)
  description: 🔀 Publishes a pinned `planemo-cli` in parallel to `planemo`. #1733 is approved but CONFLICTING.
  status: recommended
  suggested_by: planemo/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch sanitize-invocation-test-data-paths. BRANCH_DIRECTORY is vault/repositories/planemo/branches/active/sanitize-invocation-test-data-paths/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: planemo
  link: https://github.com/galaxyproject/planemo/pull/1724
  record: planemo/branches/sanitize-invocation-test-data-paths
  profile: Sonnet (high)
  description: 🔀 Sanitizes invocation labels used as filenames. #1724 is CONFLICTING.
  status: recommended
  suggested_by: planemo/SUGGESTED_TASKS.md#De-conflict Branches
- prompt: De-conflict branch test-job-files-in-tmpdir. BRANCH_DIRECTORY is vault/repositories/planemo/branches/active/test-job-files-in-tmpdir/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: planemo
  link: https://github.com/galaxyproject/planemo/pull/1707
  record: planemo/branches/test-job-files-in-tmpdir
  profile: Sonnet (high)
  description: 🔀 Writes inline test jobs outside source directories. #1707 is CONFLICTING (queued under ready).
  status: recommended
  suggested_by: planemo/SUGGESTED_TASKS.md#De-conflict Branches
```
