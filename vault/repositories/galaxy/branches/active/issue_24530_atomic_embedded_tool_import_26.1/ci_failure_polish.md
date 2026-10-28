# CI failure found during polish (dadc555490f)

Fork CI run [40638865157](https://github.com/jmchilton/galaxy/actions/runs/40638865157/job/122652057105), API tests (3.10): `TestCachedWorkflowsApi::test_run_workflow_use_cached_job_with_sample_sheet` fails at `GET /api/tools` with 500 "Could not convert toolbox to dictionary".

`Tool.to_dict` reads `self.dynamic_tool.uuid` and raises `DetachedInstanceError: Instance <DynamicTool> is not bound to a Session; attribute refresh operation cannot proceed`. Didn't fail on the checked `release_26.1` run.

Likely cause (unverified): `rollback_tools_on_error` calls `session.rollback()`, which expires every instance in the request session, including `DynamicTool` rows the process-wide toolbox still holds (not only the ones it unloads). A later request then touches the expired, detached instance. Commits don't expire them, so this is new with the branch. Candidate fixes: a SAVEPOINT (`begin_nested`) scope, or refresh/expunge toolbox-held tools after rollback. Needs a reproduction and a decision.

Other failures: Selenium `test_import_dataset_from_history` (fails on base); CWL conformance (no failed job).
