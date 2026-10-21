# Implementation debrief — invocation_graph_e2e

**STATUS: READY.** Head `7d2439be1c4` on `jmchilton/invocation_graph_e2e`, based on dev `c63ffc2ccae`. Implements [proposed_invocation_graph_no_e2e_coverage](../../../../../agents/gx_issues/internally_managed/proposed_invocation_graph_no_e2e_coverage.md) PR-first; no issue was filed. Scope evaluation: [keep as implemented](scope_evaluation.md).

## Final change

- **`lib/galaxy_test/selenium/test_workflow_invocation_graph.py`**: 6 tests.
  - Failed step marked `header-error`, with the downstream step still ok.
  - Step card: title, step icon, Next/Prev/Hide.
  - Isolate mode: the other branch is dimmed.
  - Show Connections on and off.
  - Step Config shows the step's label read-only.
  - Search result selects the step.
  - Setup for the two-branch tests waits for every node to show `header-ok`, which covers the issue's "graph reaches terminal state" bullet.
  - All tests use one inline two-branch workflow with explicit node positions, plus `WORKFLOW_KEEP_SUCCESSFUL_DATASETS`. That fixture now has positions too, which change nothing for its other users.
- **`navigation.yml`**: 16 `invocations` selectors (`graph_*`, `step_card_*`, `polling_indicator`). Node lookup reuses `workflow_editor.node` and `workflow_editor.label_input`.
- **Client test hooks**, attributes only:
  - `data-description` on the step card Previous/Next/Hide buttons, the search toggle, and the "Polling for updates" badge.
  - An `invocation-step-config-tab` title class.
- **`navigates_galaxy.py`**:
  - `invocation_open_latest` replaces the copies in `test_workflow_invocation_details.py` and `test_workflow_rerun.py`, resolving the old TODO.
  - New `_ensure_panel_open`, now shared with `open_toolbox`. It retries an activity click that landed while the activity bar was still settling. That race happened once locally under Selenium: the Tools panel stayed open.
  - Correction to the initial debrief: `retry_assertion_during_transitions` stays in `framework.py`. Once the helper no longer needed it, the move was reverted.

## Process

| Step | Outcome |
| --- | --- |
| [Normal review](subagents/normal_review_1.md) | Acted on 6 of 8: stronger Step Config, failed-step and Show Connections assertions; dropped the redundant terminal-state test |
| [Test challenges](test_challenges_debrief.md) | 10 client mutations, and each turned the matching test red; no changes |
| [E2E polish](polish_e2e_tests_debrief.md) | Shared `_ensure_panel_open` |
| [Codex review](codex_review.md) | No findings |
| [Thermo-nuclear](thermo_nuclear_review.md) | Simplified `invocation_open_latest`; search result clicked through a retrying wait |
| [Scope evaluation](scope_evaluation.md) | Keep scope |
| [Screenshots](screenshot_debrief.md) | 6 checked shots (local only); settled the graph before shots: polling-stop wait, one commented `UX_RENDER` sleep for the dimming fade |

## Verification

- Final head, from the screenshot pass: graph file 6/6 under both Playwright (headless) and Selenium (chromedriver 155); `test_workflow_invocation_details.py` 2/2 under Playwright.
- Earlier heads: `test_workflow_rerun` passed on both backends, and the `open_toolbox` callers `test_tool_form::test_repeat_reordering` and `test_workflow_editor::test_editor_selection` passed under Playwright.
- ruff, black, isort, flake8, prettier, eslint and mypy clean.
- Client vitest for `Workflow/Invocation/Graph` and `WorkflowInvocationState`: 47/47.
- No CI run yet.

## Found along the way

The live-update variant (opening the invocation while jobs still run) failed 1 in 6 runs on dev. On failure the header showed "2 of 2 jobs complete", but the nodes stayed at "1 job running". The graph's own poll loop stops when `isTerminal` flips. [issue_24138_invocation_graph_refresh](../../merged/issue_24138_invocation_graph_refresh/index.md) removes that loop. The test is parked in [live_update_test_for_24138](live_update_test_for_24138.md) so this branch stays green on dev.

## Notes for PR / merge

- The 7-commit history includes a move that was later reverted (`retry_assertion_during_transitions`); consider squashing.
- When #24138 merges forward, a trivial `navigation.yml` `invocations` conflict is likely. If that branch keeps a class-local `invocation_open_latest` in `test_workflow_invocation_details.py`, delete it in favour of the `NavigatesGalaxy` version.
- `test_keep_success_mapping_error` (API test) shares the fixture whose positions changed, and was not run locally.
- Cosmetic: the failed-step screenshot catches a leftover activity-bar tooltip.
- Open questions (from the scope evaluation): should Steps-tab search be a follow-up or part of this PR? Should the PR cite #3241?
