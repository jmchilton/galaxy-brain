# Re-scope debrief

Scope evaluation (round 1) recommended a modest expand: route the two existing hidden-input JS-click boolean setters through `tool_form_set_switch` so the branch doesn't add a third way. Original kept as `selenium_tool_form_use_cached_job_alt_original_scope` (`91a2f246e7b`, [alts/original_scope.md](alts/original_scope.md)).

- `RunsToolTests._set_boolean_value` now delegates to `tool_form_set_switch` (same truthy normalization).
- `test_workflow_rerun._toggle_workflow_run_boolean` removed; call sites use `tool_form_set_switch` directly.
- Verified on Playwright + Selenium: harness boolean cases (7, `GALAXY_TEST_E2E_TOOL_TESTS=1`), `test_workflow_rerun.py` (3), `test_run_reuses_equivalent_job`.
- Review: approve, no bugs ([subagents/rescope_review.md](subagents/rescope_review.md)).
