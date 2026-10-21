# Codex review — workflow_open_exact_title

Codex (read-only, static) raised 2 findings on `65132d40dac..d6bce3fc3e8`. Both CONFIRMED and fixed by the coordinator, split across 7c/7g. Head is now `b8f381901d5`. Affected E2E tests pass under Playwright and Selenium; the shared user had 55+ workflows, so the list was full before searching.

## Not acted on

- None.

<details>
<summary>Full review and triage</summary>

**P1: the fallback can select a copy before the search returns.** CONFIRMED.
- `workflow_index_search_for` types the term and presses Enter. `DelayedInput` debounces about 500ms, and the list shows only the first ~24 workflows.
- `_workflow_card_named` accepted the unique-contains fallback on the unfiltered first page. With NAME off page 1 and `NAME (copy)` on it, the helper would click the copy.
- This is realistic locally because the shared login user accumulates workflows.
- Fix (7c): `_workflow_card_named` returns `None` until every listed title contains NAME (search applied). It also returns `None` if a card goes stale mid-scan (list changing). Only then does it pick the exact title, else the single card.

**P2: the direct click loses the existing transition retries.** CONFIRMED.
- The old `SmartTarget.wait_for_and_click` retried intercepted and stale clicks.
- The new code clicked a captured element once. Cards stay mounted under `GOverlay` while a search reloads.
- Fix (7g): lookup and click are wrapped in the existing `retry_call_during_transitions`.

The 7c commit message was reworded to describe the matching rules.

Coverage note (Codex): "All changed code reviewed with surrounding implementation and callers. E2E tests were not executed."

Verification (Playwright unless noted), all passing:

- `test_open_and_run_workflow_by_exact_title` (Playwright and Selenium)
- `test_edit_name` (Playwright and Selenium)
- `test_parameter_regex_validation`
- `test_workflow_run.py::test_simple_execution`

Pre-commit sample config: clean.

Known limit: free-text search also matches tags and annotations. A workflow that matches only that way, without NAME in its title, would keep the wait from settling, so the helper times out loudly rather than clicking the wrong card. No current caller hits this; callers use random or unique names.

</details>
