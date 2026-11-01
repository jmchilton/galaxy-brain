# Response to mvdbeek review 1 (#24203)

Review: APPROVED 2026-10-23, two optional inline nits. No contention. Both nits adopted in `14f1310fe20` (on top of approved `2de0931ac07`, no rebase/force-push). No pushback.

## Changes

- `modules.workflow_step_name(step)`: label, else a legacy input step's `tool_inputs["name"]` (input steps only, so a tool param called `name` can't label a tool step), else 1-based position. Replaces `_step_name` and the four inline `step.label or step.order_index + 1` in `run_request.py`.
- `modules.disconnected_subworkflow_inputs_message(steps)`: shared by the 400 and runtime `details`. Runtime details now `Subworkflow has disconnected required input 'a', 'b'` (was fixed `Subworkflow has disconnected required input.`).
- `test_disconnected_subworkflow_runtime_failure` asserts the named inputs per case; the unlabeled `missing_input` exercises the name fallback.

Caveat: modern input steps drop `tool_inputs["name"]` on save, so the fallback only helps true legacy steps; two unlabeled legacy inputs could share a default name. Following the reviewer's suggestion as is.

Validation: ruff/black/isort clean; workflow units 197 passed, 1 skipped; 16 API cases passed (10 PR cases + `test_run_with_invalid_legacy_parameter_input` + `test_run_with_nonexistent_input`). mypy only flags unrelated `managers/notification.py` (borrowed venv). Fork/PR CI on new head pending.

## Inline replies (posted 2026-11-01: [r4437314429](https://github.com/galaxyproject/galaxy/pull/24203#discussion_r4437314429), [r4437314514](https://github.com/galaxyproject/galaxy/pull/24203#discussion_r4437314514))

On `lib/galaxy/workflow/run.py:815`:

> Done in 14f1310fe20 — runtime `details` now names the missing inputs using the same message as the 400.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model claude-opus-5-5 on John's behalf.***

On `lib/galaxy/workflow/run_request.py:342`:

> Done in 14f1310fe20 — `workflow_step_name` in `modules.py` now backs all the `run_request.py` sites and falls back to `tool_inputs["name"]` for unlabeled input steps.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model claude-opus-5-5 on John's behalf.***

## PR body edit (not applied live)

`pr_description.md` updated: "The established wholly-disconnected failure shape is preserved." → "Runtime failure details now name the disconnected inputs, matching the submission error." Apply to #24203 body if wanted.
