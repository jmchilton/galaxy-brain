# Initial review: default profile

Profile: default. Model: claude-opus-5-5. Effort: low. Reviewed commit: 4f2e4126a6b.

## Verdict

Approve. Small, correct fix for a real 500: `__build_embedded_subworkflow` forwards whatever options it was given, and on PUT that is `WorkflowUpdateOptions`, which lacks `publish`. The `isinstance` guard restores the obvious behavior (embedded subworkflows built during an update are not published). The API test reproduces the PUT-of-unchanged-export path and asserts the subworkflow survives. No bugs found.

## Findings

### P3 1: Type the options parameter instead of relying on a runtime isinstance + comment

`build_workflow_from_raw_description(..., workflow_create_options, ...)` is untyped, which is how a `WorkflowUpdateOptions` reached a `.publish` access unnoticed. Annotating it `WorkflowCreateOptions | WorkflowUpdateOptions` (and `__build_embedded_subworkflow`'s `workflow_state_resolution_options` likewise) would let mypy catch the next such access and makes the code comment unnecessary. The file already has the same duck-typed pattern at `getattr(workflow_state_resolution_options, "archive_source", None)` (~line 921); a typed union is the better shared fix, but fine as a follow-up on dev rather than in a release-branch fix.

### P3 2: Test could also assert the subworkflow is not published

The test checks the update succeeds and one subworkflow step remains. Adding an assertion that the parent stays unpublished (or checking the subworkflow's stored workflow `published`/`hidden`) would pin the value the new expression computes, not just absence of the exception. Optional.

## Notes (not findings)

- Pre-existing: on create with `publish=True`, hidden embedded subworkflows' StoredWorkflows also get `published=True`. Untouched by this PR.
