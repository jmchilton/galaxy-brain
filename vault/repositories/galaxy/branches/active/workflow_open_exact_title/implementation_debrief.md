# Implementation debrief — workflow_open_exact_title

STATUS: READY, with two decisions for John (below). Base `release_26.2` @ `65132d40dac`, head `fc5802715a1`, +105/−17. Not rebased onto the newer `origin/release_26.2`.

## Final branch

1. `8a367e63730` Extract `_workflow_card_action` from the open/run-by-name workflow helpers. A refactor that doesn't change behaviour.
2. `f74b6388807` Drop dead workflow name reassignment in the undo/redo test.
3. `28152858a04` Snapshot Playwright `find_elements` instead of count-then-nth (**decision 1**).
4. `42c233bfb95` Open the workflow card titled NAME in the open/run-by-name helpers.
5. `eaf5af509d3` Test opening and running a workflow whose title prefixes another's.
6. `6bf5076a289` Delete and bookmark the workflow card titled NAME. This is the scope expansion.
7. `fc5802715a1` Test bookmarking and deleting a workflow whose title prefixes another's.

Commits 1–3 apply to the base on their own and could ship as a separate PR.

## Choices

- **One lookup for all four actions.** Open, run, bookmark and delete share one card lookup, `_workflow_card_named`.
  - It waits until every listed title contains NAME, ignoring case like the server's `ilike` search.
  - It then picks the exact title, or otherwise the only card left.
  - The only-card fallback stays because `workflow_create_new` stores an "Unnamed Workflow" prefixed title.
  - Clicks retry during transitions.
- **Delete takes its menu item from the matched card.** Every card renders its own hidden menu. The old global selector took the first card's item, which deleted the wrong workflow under Playwright.
- **Driver fix.** The Playwright driver's `find_elements` took a count and then fetched each element by index. If the list shrank between those two calls, each missing index waited out Playwright's 30s default timeout before retry. It now takes one snapshot, which is what Selenium does. This race was reproduced outside Galaxy, and it is the likely cause of a ~30s per-action gap seen in earlier runs. That link is unconfirmed.
- **Known limits.** In both cases the helper times out loudly instead of clicking the wrong workflow:
  - search hits that match only by tag, owner or annotation;
  - an exact title pushed past the first page by 24 or more newer matches.

## Hardening path

- **Pass 1.** Challenge, polish, codex (2 findings fixed), thermo, baseline and scope steps; scope recommended expansion B. The unit test file `test/unit/selenium/test_workflow_index.py` was dropped with John's approval.
- **Re-scope.** The original is kept as `workflow_open_exact_title_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). Details in [implementation_rescope_debrief.md](implementation_rescope_debrief.md). The review added the driver fix ([subagents/rescope_review.md](subagents/rescope_review.md)).
- **Re-harden.** Each step was rerun fresh:
  - Challenge: removed a stale comment.
  - Polish: dropped one redundant sleep.
  - Codex: made the readiness gate case-insensitive; pagination and tag matches were left as limits.
  - Thermo: inlined a single-use wrapper.
  - Baseline: moved the refactor and prerequisite commits to the bottom; the final tree is unchanged.
  - Second scope evaluation: **keep as is**.
- **Screenshots:** not relevant. The only client change is one `navigation.yml` selector used by the test.
- Earlier debriefs are in `earlier_drafts/1/`.

## Tests

- **Red checks.** Each new test is red on the old helpers, failing at its own assertions; each half of the bookmark/delete test is red on its own.
- **Both backends.** These pass on Playwright and Selenium (`test_edit_name` and `test_workflow_bookmark_filtering` only at earlier heads, before the polish, codex and thermo changes):
  - `test_open_and_run_workflow_by_exact_title`
  - `test_workflow_bookmark_and_delete_by_exact_title`
  - `test_workflow_delete`
  - `test_workflow_bookmark_filtering`
  - `test_edit_name`
- **Playwright only.** `test_parameter_regex_validation`, `test_simple_execution` and the undo/redo tests pass.
- **Unit tests.** The driver unit tests pass: `test_has_driver.py` and `test_smart_components.py`, Playwright cases.
- **Fresh user needed.** The existing management tests need a fresh user. The shared login user has too many workflows for their setup assertions.
- CI not yet observed.

## Decisions for John

1. **One PR, or split the driver fix out.** The scope evaluation recommends one PR. If the driver fix is split out, decide whether to also fix the same race in `find_elements_by_selector` and `assert_disabled` (follow-up H).
2. **Explicit `workflow_index_open()` in the bookmark/delete test.** It is redundant with the new helpers, but without it the test hangs on the old helpers instead of failing at its assertion.

## Deferred

- **C.** Make `workflow_create_new` return the stored title.
- **D.** Move the canvas wait into `workflow_index_open_with_name`. Owned here; a dev follow-up after `workflow_editor_run_cancel` lands.
- **E.** Other search-then-click-first helpers, plus the pagination and tag-match limits.
- **H.** The same snapshot race in other Playwright driver methods.
- **I.** A Target-aware scoped element finder.
- **Rejected (F).** Exact-only matching.
