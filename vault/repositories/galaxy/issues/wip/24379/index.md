# galaxy#24379 — Workflow editor flags rename `${name}` as untyped parameter despite matching parameter input

[Issue](https://github.com/galaxyproject/galaxy/issues/24379) · [proposal](proposal.md) · [debrief](debrief.md) · branch [`untyped_param_lint_declared_labels`](../../../branches/active/untyped_param_lint_declared_labels/index.md)

Filed 2026-10-22. The fix is on branch `untyped_param_lint_declared_labels` (6bb6d2cab4d): `getUntypedWorkflowParameters` skips declared-label renames and scans only rename `newname`, with a red-to-green `parameters.test.ts`.

The duplicate-label failure of the extract fix was traced from code, not run.

Next: open the PR from the branch.
