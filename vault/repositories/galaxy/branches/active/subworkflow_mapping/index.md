# subworkflow_mapping

Status: `author_work`. Base: `dev`. [PR #23676](https://github.com/galaxyproject/galaxy/pull/23676) (open).

Brings subworkflow mapping inline between the workflow editor and the backend.

[subworkflow mapping branch review](subworkflow_mapping_branch_review.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-11

Live PR #23676 is conflicting against dev. Read-only merge-tree found conflicts in workflow parameter fixture, tool_util_models, workflow/modules.py and mypy.ini; these involve workflow/schema semantics and are substantial. Left PR head `6ece27c39d8dbd3f72dd13ad208762f715095d08` intact. The local worktree instead follows mapping_axes_clarity_correctness at a6bb814032f, so it was not repurposed.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `client/src/components/Workflow/Editor/test-data/parameter_steps.json`, `lib/galaxy/tool_util_models/__init__.py`, `lib/galaxy/workflow/modules.py`, `mypy.ini`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.

## GOOD_MORNING — 2026-10-13

Current fork head `6ece27c39d8dbd3f72dd13ad208762f715095d08` conflicts with `origin/dev` in 4 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Workflow/Editor/test-data/parameter_steps.json` · `lib/galaxy/tool_util_models/__init__.py` · `lib/galaxy/workflow/modules.py` · `mypy.ini`
