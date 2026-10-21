# selenium_tool_form_helpers

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_tool_form_helpers?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_tool_form_helpers)

## Status

Polishing (`branches_need_polish`) on `dev`, head `798bae4b33f`; see `implementation_debrief.md`.

No PR.

CI not yet observed.

## Scope

Tool-form helpers for `NavigatesGalaxy`. The fill code is in `galaxy.selenium.tool_form_filler` and the build-model parsing in `galaxy.selenium.tool_form`.

- `tool_form_fill` / `tool_form_set_parameter` move out of `RunsToolTests` (6a). Parameters a conditional reveals late are retried on both backends (6a′).
- Filling selects data by hid, selects collections like datasets, and maps a data field over a collection hid.
- `tool_form_parameters` describes a tool's form (6b) or a job's rerun form (6c), including drill-down options and pinned rerun data.
- Filling works on workflow editor steps (7a). Each path is prepared just before it's set: collapsed sections are expanded and missing repeat instances are added at every level (7e and the re-scope).
- `select_set_value` picks the option equal to the value (7f).

The original scope is kept as `selenium_tool_form_helpers_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

## Decisions

- 2026-10-21, John: keep 7f here; one PR with history compacted to thematic commits (`scope_evaluation.md` Option D).
- Every SHA was rewritten, so `galaxy_ui_driver`'s dev-only merge of the old SHAs is stale and will need a restack. On restack, take this branch's `test/unit/selenium/test_tool_form_fill.py`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md).
