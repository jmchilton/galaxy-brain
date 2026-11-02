# CI failure found during polish (dadc555490f)

Fork CI run [40638865157](https://github.com/jmchilton/galaxy/actions/runs/40638865157/job/122652057105), API tests (3.10): `TestCachedWorkflowsApi::test_run_workflow_use_cached_job_with_sample_sheet` fails at `GET /api/tools` with 500 "Could not convert toolbox to dictionary": `Tool.to_dict` reads `self.dynamic_tool.uuid` on an expired, detached `DynamicTool`.

## Reproduced locally; inherited from the parent

On one server, `TestAdminWorkflowsApi::test_import_embedded_admin_tool_after_step_metadata` (both params) then the cached test: the cached test fails on this branch **and on `workflow_import_embedded_tools` (82a993c494a)**. No failed import is involved, so it isn't the rollback. A successful embedded admin import leaves a toolbox-cached tool whose `DynamicTool` was expired by a later commit in the request (sessions use `expire_on_commit=True`) and then detached when the request session closed. #24475's own CI passed only because the tests ran on different xdist workers.

A savepoint in `rollback_tools_on_error` (tried, reverted) doesn't change it.

Other failures: Selenium `test_import_dataset_from_history` (fails on base); CWL conformance (no failed job).
