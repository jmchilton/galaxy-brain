# Polish debrief

Branch unchanged: head `0f23fc4cf5a`, base `release_26.2`. Only the description, titles and tags were written.

## CI (fork, `0f23fc4cf5a`)

- Green: every finished job, including Integration Selenium, API, client lint and unit, Python lint.
- Still running at hand-off: Playwright tests (the only push-CI job that runs the new tests), Integration, Build docs.
- `selenium.yaml` runs only on schedule or dispatch, so push CI never runs the Selenium suite. The Selenium pass is local only.

## Checklist (GENERAL.md only; no workflow code)

All items pass. A fresh subagent answered them; the human-read item stays unchecked. Optional nit, not taken: `_click_and_assert_success_alert` asserts `has_class("alert-success")` with no message, so an error alert shows a bare `assert False`. The three tests it replaced already behaved this way.

## Strengthening round

The subagent found no development tasks that widen scope. I applied its description fixes:
- Named the API tests (`test_tag_auto_propagation`, `test_collection_tools_tag_propagation`) behind the "API tests already cover propagation" highlight.
- Added a highlight that the two refactors don't change behavior, and a sentence on why one PR covers both flows.
- Fixed a wrong checklist answer: the output's `#plus` is read from the UI, not the API.
- Narrowed "API-derived hids" to the tagging test.
- Qualified "existing callers pass": they were run on an earlier revision with identical helper code.
- Replaced "merge forward unchanged" with what was checked: `git merge-tree origin/dev HEAD` auto-merges every file this branch touches.
- Dropped the guessed failure mechanisms for the red checks ("tag wait times out", "`comment_lines` stays at 3"). The second was likely wrong: the alert-text wait fails first.

## Left over

- The red checks were run at the round-1 head, and the exact failure points weren't recorded. The description says only "fails". Re-run them at `0f23fc4cf5a` if the description should name where each test fails.
- Labels: same as `selenium_history_datatype_citations` minus `release-testing-26.2` (`kind/enhancement`, `area/testing/selenium`). Its siblings `workflow_editor_second_subworkflow` and `selenium_multiview_copy` use `kind/bug`, but they carry fixes.

## Decisions for John (carried from the implementation debrief)

- Rename `tags_add_from_button` to `tagging_add_from_button`? The existing helper is `tagging_add`, and this would ship on 26.2.
- Ship the parent (id on the button) or the no-client-change alt?
- One PR, or split into tagging and Auto-detect?
