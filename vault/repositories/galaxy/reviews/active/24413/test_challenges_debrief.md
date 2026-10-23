# Test challenges debrief — PR #24413

Reviewed commit 4f2e4126a6b, worktree ~/projects/worktrees/galaxy/pr/24413 (read-only).

## Tests in the PR

One API test, `test_update_with_unchanged_export_of_workflow_with_subworkflow` (`lib/galaxy_test/api/test_workflows.py`). No unit tests, no client tests.

- Right layer: the bug is a 500 from `PUT /api/workflows/{id}`; an API test is the natural repro. No unit test to challenge.
- Red-to-green: pre-fix, `build_workflow_from_raw_description` reads `.publish` off `WorkflowUpdateOptions` for the embedded subworkflow, so `raise_for_status()` fails. Post-fix it passes. Good.
- Helpers: uses `upload_yaml_workflow`, `download_workflow(style="export")`, and `_update_workflow` -> `workflow_populator.update_workflow`. No raw HTTP repetition. Fine.
- Sibling: `test_update_name_for_workflow_with_subworkflows` covers name-only PUT (no `steps`, so no subworkflow rebuild). The new test complements it rather than duplicating.

## Weaknesses

- Final assertion (`len(subworkflow_steps) == 1`) is loose: it would pass if the subworkflow were rebuilt empty or with wrong content. Stronger: assert the embedded subworkflow still has its `cat1` tool step (e.g. via `updated["steps"][...]["subworkflow"]["steps"]`), or compare the re-export to the original export modulo version/uuid.
- No check that the rebuilt embedded StoredWorkflow is unpublished/hidden, which is what the changed line governs. Not obviously reachable via API without extra plumbing; skip unless cheap.

## E2E

Not needed: backend crash on a specific API payload; API test is sufficient.

## Test plan (recommendations)

1. Strengthen the assertion to check the inner subworkflow step survives the round trip (P3).
