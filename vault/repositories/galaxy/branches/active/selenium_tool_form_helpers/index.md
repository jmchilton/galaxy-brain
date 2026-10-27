---
upstream_base_branch: dev
---

# selenium_tool_form_helpers

- [#24331](https://github.com/galaxyproject/galaxy/pull/24331)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_tool_form_helpers)
- [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md) · [polish debrief](polish_debrief.md)

## Status

`attention`: all eight review points fixed at `38c2ac06b3c` and [replies posted](review_response_mvdbeek_1.md) with John's approval; CI failures remain to be diagnosed.

[#24331](https://github.com/galaxyproject/galaxy/pull/24331) open, not draft.

CI has three failed checks and others still running on the revision; local checks and snapshot details are in [the review debrief](review_response_debrief_mvdbeek_1.md).

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
- Open for John: repeat insert needs 26.2+ (`data-repeat-name`), so no released server can insert repeats; revisit scope E1? Keep `repeat_insert_named` as an alias? See `polish_debrief.md`.
- Every SHA was rewritten, so `galaxy_ui_driver`'s dev-only merge of the old SHAs is stale and will need a restack. On restack, take this branch's `test/unit/selenium/test_tool_form_fill.py`.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md).
