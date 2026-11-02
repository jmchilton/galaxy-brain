# Tasks

```gb-tasks
- prompt: Let's talk about branch selenium_dataset_tags_auto_detect. The branch record is vault/repositories/galaxy/branches/active/selenium_dataset_tags_auto_detect/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24347
  record: galaxy/branches/selenium_dataset_tags_auto_detect
  description: |
    🔀 Missing E2E tests: history item Add Tags reaching a tool output, Attributes tab metadata Auto-detect. Base `release_26.2`. [#24347](https://github.com/galaxyproject/galaxy/pull/24347).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch workflow_fetch_abstractions_25.1. The branch record is vault/repositories/galaxy/branches/active/workflow_fetch_abstractions_25.1/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24477
  record: galaxy/branches/workflow_fetch_abstractions_25.1
  description: |
    🔀 Owned/accessible getters for workflow show, update, refactor, delete and menu; non-owners can no longer edit. Base `release_25.1`, head `fac396515e4`. [#24477](https://github.com/galaxyproject/galaxy/pull/24477).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch selenium_tool_form_use_cached_job. The branch record is vault/repositories/galaxy/branches/active/selenium_tool_form_use_cached_job/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24451
  record: galaxy/branches/selenium_tool_form_use_cached_job
  description: |
    🔀 Missing E2E test of the tool form's re-use equivalent jobs switch + `tool_form_set_switch` helper. [#24451](https://github.com/galaxyproject/galaxy/pull/24451).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: Let's talk about branch workflow_editor_run_cancel. The branch record is vault/repositories/galaxy/branches/active/workflow_editor_run_cancel/.
  agent_dir: gx_branches
  link: https://github.com/galaxyproject/galaxy/pull/24318
  record: galaxy/branches/workflow_editor_run_cancel
  description: |
    🔀 Editor no longer marks a just-opened workflow unsaved; run-from-editor + cancel E2E test; File-input helper fix. Base `release_26.2`. [#24318](https://github.com/galaxyproject/galaxy/pull/24318).
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Merge Branches
- prompt: "Read `blockers/deployment_test_fixes_merged/previous_session.md`. Parent PR galaxyproject/galaxy#24489 is merged. For branch `deployment_test_docs_decorators_26_2` (record vault/repositories/galaxy/branches/active/deployment_test_docs_decorators_26_2): rebase onto `origin/release_26.2` dropping parent commits, push to jmchilton fork, remove `parent_branch` from the record's index.md and fix the Open PR compare link in the record and MY_BRANCHES.md, then check fork CI and report. Finally delete `blockers/deployment_test_fixes_merged/` and the record's `blockers:` entry."
  agent_dir: gx_branches
  record: galaxy/branches/deployment_test_docs_decorators_26_2
  description: |
    🔓 deployment_test_fixes_merged: galaxyproject/galaxy#24489 (`deployment_test_fixes_26_2`) is merged.
  status: recommended
  suggested_by: gx_branches/SUGGESTED_TASKS.md#Unblocked
- prompt: Review the davelopez nit fix on selenium_history_datatype_citations (ab414ac4063) in the differential review, then post the drafted reply in review_response_davelopez_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24329
  record: galaxy/branches/selenium_history_datatype_citations
  description: |
    davelopez approved #24329; optional BibTeX-key regex nit applied in one commit.
- prompt: Review davelopez response commit on selenium_faq_account_workflow_display_26.2 (1e6881dd20e) in the differential review; push it, then post the drafted replies in review_response_davelopez_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24482
  record: galaxy/branches/selenium_faq_account_workflow_display_26.2
  description: |
    2 inline races + 7 summary points addressed in one commit; vitest-row point explained in review_pushback_davelopez_1.md.
- prompt: Review mvdbeek nit fixes on selenium_history_import_purge (b30953d1fca) in the differential review, then post the drafted replies in review_response_mvdbeek_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24440
  record: galaxy/branches/selenium_history_import_purge
  description: |
    mvdbeek approved #24440; both optional nits applied in one commit, already pushed.
- prompt: Review dannon nit fixes on selenium_data_formats_interval_columns (c811d58bf30) in the differential review, then post the drafted reply in review_response_dannon_1.md.
  agent_dir: gx_branches
  kind: human
  link: https://github.com/galaxyproject/galaxy/pull/24439
  record: galaxy/branches/selenium_data_formats_interval_columns
  description: |
    dannon approved #24439; radio-select reader/setter and submitted-color check applied in one commit, already pushed.
```
