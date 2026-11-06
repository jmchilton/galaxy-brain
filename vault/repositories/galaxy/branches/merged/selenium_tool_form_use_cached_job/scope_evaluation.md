# Scope evaluation (round 2)

Keep: as implemented (post round-1 expand) is right; no further change clearly warranted.

## As implemented
Re-use switch E2E test plus shared `tool_form_set_switch` replacing both hidden-input JS-click boolean setters (~44 lines).

| Pros | Cons |
| --- | --- |
| - Covers untested switch<br>- One way to set switches<br>- Refactor commit splittable | - none significant |

## Expand: migrate `parameter_checkbox` (`.ui-switch`) callers
Route `test_workflow_editor.py` select_single clicks through a label-based target.

| Pros | Cons |
| --- | --- |
| - Retires a possibly stale target | - Different component (select checkbox), not a switch<br>- Unrelated test churn |

## Expand: port gxui `tool-run --reuse`
| Pros | Cons |
| --- | --- |
| - Feature parity | - Driver tooling is dev-only (`galaxy_ui_driver`) |

## Contract: original scope (alt)
`selenium_tool_form_use_cached_job_alt_original_scope`.

| Pros | Cons |
| --- | --- |
| - Smaller | - Leaves three ways to set a switch |
