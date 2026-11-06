# Implementation debrief

**STATUS: READY.** Head `50dc4ccb773` on `release_26.2`, pushed to `jmchilton`. Fresh CI pending.

## What it is

A coverage PR for 26.2 built from two `galaxy_ui_driver` FAQ-loop commits, then widened by the scope evaluation. It adds E2E tests for:
- bulk Change data type
- bulk Change Database/Build
- History options > Export Tool References

It also adds the `data-description` hooks, `navigation.yml` components and `NavigatesGalaxy` helpers those tests need. The 26.2 code has no behavior changes.

## Choices

- **One branch.** John asked for that. Scope evaluation offers a two-PR split (Selection modals / tool references) without recommending it.
- **Shared Selection-modal abstraction.** `operation_modal`, with `_` parameterized by `${operation}` (the menu item's data-description; modal hook `"<operation> modal"`), plus `history_panel_change_selected(operation, value)`. It replaced the per-modal datatype helper, and Bulk tags (`StatelessTags`) and hide/delete/purge (no modal) don't fit it.
- **`select_set_value` + wait for `.single-item-selector`.** This avoids vue-multiselect's index-keyed option race under Selenium, and the Multiselect only renders after the async options load.
- **Citations expectations from the APIs.** Rendered count = `histories/{id}/citations` + 1. Galaxy's citation comes first, matched by the BibTeX key from `configuration.citation_bibtex`, and the tool's citation follows. Nothing is pinned to `Galaxy2026`/NAR text.
- **Strength.**
  - Both selection tests check the UI and the API.
  - The dbkey test asserts the start value `?`.
  - The unselected hid 3 must stay unchanged.
  - Both run on `@managed_history`, so a shared-user config can't skew hids.
- **Base refactor.** Commit 1 moves `test_collection_edit.py`'s inline datatype wait into `history_panel_wait_for_hid_datatype`.
- **Celery.** Change data type needs it. Every selenium class gets `UsesCeleryTasks` via `TestWithSeleniumMixin`, so CI runs it.

## Process

- Normal review → [subagents/normal_review.md](subagents/normal_review.md)
- First hardening → [earlier_drafts/1/](earlier_drafts/1/). Codex caught the datatype selector loading race, and the baseline split out commit 1.
- Scope evaluation recommended the dbkey expansion → [rescope debrief](implementation_rescope_debrief.md) and [review](subagents/rescope_review.md).
- Re-harden:
  - [test challenge](test_challenges_debrief.md) and [E2E polish](polish_e2e_tests_debrief.md): no changes
  - [codex](codex_review.md): `@managed_history`
  - [thermo](thermo_nuclear_review.md) and [baseline](baseline_refactor.md): no changes
  - [scope](scope_evaluation.md): keep
  - [screenshots](screenshot_debrief.md): 4 captured

## Verification

- Playwright and Selenium, framework-managed server, one run at a time: all three new tests plus `test_collection_edit.py` pass.
- Red: each new test times out on its selector when the client is built without its hook.
- mypy is clean for `navigates_galaxy.py`.

## Follow-ups (dev, not this PR)

- Have `assert_item_extension` / `assert_item_dbkey_displayed_as` delegate to the new waiters.
- Dead `history_panel_multi_operation_action_click`, and dead `_collection_dropdown` wrappers in `test_collection_edit.py` / `test_collection_builders.py`.
- A shared GModal OK selector.
- The dbkey modal has no `ok-disabled`. That isn't a bug: `selectedDbKey` defaults to `?`.
- `galaxy_ui_driver` restack: drop both source commits, and switch gxui's `history-change-datatype` verb to `history_panel_change_selected`.
