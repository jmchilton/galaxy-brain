# subworkflow_mapping

Status: `author_work`. Base: `dev`. [PR #23676](https://github.com/galaxyproject/galaxy/pull/23676) (open).

Brings subworkflow mapping inline between the workflow editor and the backend.

[subworkflow mapping branch review](subworkflow_mapping_branch_review.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #23676 is conflicting against dev. Read-only merge-tree found conflicts in workflow parameter fixture, tool_util_models, workflow/modules.py and mypy.ini; these involve workflow/schema semantics and are substantial. Left PR head `6ece27c39d8dbd3f72dd13ad208762f715095d08` intact. The local worktree instead follows mapping_axes_clarity_correctness at a6bb814032f, so it was not repurposed.
