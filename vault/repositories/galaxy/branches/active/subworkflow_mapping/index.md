---
upstream_base_branch: dev
pr: 23676
related_records:
  - galaxy/branches/mapping_axes_model
  - galaxy/branches/mapping_axes_clarity_correctness
  - galaxy/branches/workflow_test_timeouts
  - galaxy/branches/subworkflow_mapping_per_step_semantics
  - galaxy/branches/subworkflow_mapping_when_alignment
---
# subworkflow_mapping

Status: `author_work`. Base: `dev`. [PR #23676](https://github.com/galaxyproject/galaxy/pull/23676) (open).

Brings subworkflow mapping inline between the workflow editor and the backend.

[subworkflow mapping branch review](subworkflow_mapping_branch_review.md) · [Tracking history](tracking_history.md)

## 2026-11-02

- Head `16a961062b6`: ported `when_alignment`'s 2 conditional API scenarios (`test_conditional_subworkflow_independent_child_mapping` red on dev, green here; `test_invocation_conditional_map_over_inner_collection` green on both).
- Worktree switched back to `subworkflow_mapping` (from `mapping_axes_clarity_correctness`, which is pushed) and bootstrapped.
- Migration bug: `8d1f0c7a4b2e` has `down_revision = "e96dd6fd5863"`, but the branch base already has `a4c3f2e1b790` there, so alembic finds multiple heads and Galaxy won't start. Tests ran with a local re-point to `a4c3f2e1b790` (not committed); fix on the next rebase.
- Head `4d38ff04a81`: `amend!` fixup of `485c68ba354` replaces the `TestJob.timeout` schema field with a `SLOW_WORKFLOW_TIMEOUTS` map in `test_framework_workflows.py` (John's call; `workflow_test_timeouts` abandoned). Autosquash on the next rebase.
- Head `77807fafe07`: cherry-picked `174e74528bd` (validate inherited mapping axis prefix shapes) from `mapping_axes_model`'s review fixes; `a6bb814032f` not needed here. 229 matching/workflow unit tests, 9 conditional/inner-collection API tests and 3 `-k subworkflow` framework tests pass (framework run took 16.6 min). `tool_util_models` no longer conflicts with dev; merge-tree now lists `parameter_steps.json`, `modules.py`, `mypy.ini`, `test/unit/workflows/test_modules.py`.

## TICK — 2026-10-11

Live PR #23676 is conflicting against dev. Read-only merge-tree found conflicts in workflow parameter fixture, tool_util_models, workflow/modules.py and mypy.ini; these involve workflow/schema semantics and are substantial. Left PR head `6ece27c39d8dbd3f72dd13ad208762f715095d08` intact. The local worktree instead follows mapping_axes_clarity_correctness at a6bb814032f, so it was not repurposed.

## TICK — 2026-10-12

Live draft remains conflicting with actual dev `6831f768a637d148d941a3477db0a14e21573c1d`. Read-only merge-tree confirms substantial conflicts in `client/src/components/Workflow/Editor/test-data/parameter_steps.json`, `lib/galaxy/tool_util_models/__init__.py`, `lib/galaxy/workflow/modules.py`, `mypy.ini`. These require design or behavior reconciliation beyond the automatic small/mechanical-conflict scope. No worktree files, branch refs or PR settings changed; remains author work.

## GOOD_MORNING — 2026-10-13

Current fork head `6ece27c39d8dbd3f72dd13ad208762f715095d08` conflicts with `origin/dev` in 4 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Workflow/Editor/test-data/parameter_steps.json` · `lib/galaxy/tool_util_models/__init__.py` · `lib/galaxy/workflow/modules.py` · `mypy.ini`

## Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `6ece27c39d8dbd3f72dd13ad208762f715095d08` found overlapping changes in 4 paths (`client/src/components/Workflow/Editor/test-data/parameter_steps.json`, `lib/galaxy/tool_util_models/__init__.py`, `lib/galaxy/workflow/modules.py`, `mypy.ini`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.
