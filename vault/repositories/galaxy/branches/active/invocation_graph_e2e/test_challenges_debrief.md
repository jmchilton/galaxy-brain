# Test challenges debrief — invocation_graph_e2e

**Acted on: nothing; no test code changed.** I broke each covered feature in the client (10 mutations) and every one turned the matching test red under Playwright, so all 6 browser tests check real behaviour. The branch adds no unit tests, so the unit-test checks in the process don't apply. I didn't act on these items:

- **Hide doesn't check that isolation clears.** `useFocusedNodes` is a pure computed that returns `null` when no step is active, which is the same path the test's initial "nothing dimmed" check covers. The extra assertion would only catch a stale-cache bug the current code can't have.
- **Prev/Next disabled state at the ends isn't asserted.** `navigateStep` already guards the bounds, so the `:disabled` binding only changes how the button looks and is announced (GButton uses `aria-disabled`). Low value for a browser test.
- **Search is only tested on Overview.** The issue's coverage table says "Search on Overview and Steps", but its proposed test list names only the graph search. A Steps-tab search test is possible follow-up scope.
- **No `@managed_history` on the two-branch tests.** The setup creates datasets through `run_workflow` in the current history. The sibling test `test_job_details` does the same. `invocation_open_latest` picks the newest invocation, so leftover state from earlier tests doesn't change the result, and `managed_history` would add a UI history-create step.
- **No shared setup across tests.** Each of the 5 two-branch tests runs the workflow (about 25s per test). A `SharedStateSeleniumTestCase` would save runs, but the tests change the graph's UI state (active node, detailed view), and separate focused tests match what the issue proposes.

<details><summary>Details</summary>

## Baseline

`test_workflow_invocation_graph.py` passed 6/6 under Playwright (headless) against Vite 5173 → Galaxy 8080 in 158s.

## Mutation checks (Playwright; each file restored with `git checkout -- <path>`, worktree clean afterwards)

| Mutation (client) | Test | Result |
| --- | --- | --- |
| `Node.vue`: `"node-not-in-focus": false` | `test_isolate_selected_step_lineage` | red: `right_input` never dimmed |
| `useFocusedNodes.ts`: upstream walk skipped | `test_isolate_selected_step_lineage` | red: `left_input` wrongly dimmed (`assert_absent`) |
| `InvocationGraph.vue`: Next `@click` no-op | `test_step_card_navigation` | red: "Expected step card for right_cat, found 'Step 3: left_cat'" |
| `InvocationGraph.vue`: Hide `@click` no-op | `test_step_card_navigation` | red (card never absent) |
| `WorkflowInvocationStepHeader.vue`: `WorkflowStepIcon` replaced with an empty span (the #20334 class of bug) | `test_step_card_navigation` | red |
| `InvocationGraph.vue`: `toggleDetailedView` always false | `test_show_connections` | red: `left_cat out_file1 blank=False` |
| `WorkflowGraph.vue`: detailed view for every node, not just the active one | `test_show_connections` | red: `right_cat out_file1 blank=True` |
| `useInvocationGraph.ts`: `error` moved from single-instance to all-instances states | `test_failed_step_is_marked` | red: `mixed_collection` never `header-error` |
| `WorkflowInvocationStep.vue`: `disabled` removed from the Step Config `fieldset` | `test_step_config_is_read_only` | red |
| `WorkflowInvocationSearch.vue`: result click no longer sets `activeNodeId` | `test_search_selects_step` | red: step card never shows |

I didn't break Previous separately. The test asserts the title after both Prev clicks (`left_cat`, then `right_input`), so a no-op Prev handler fails the same way the Next one did.

## Per-test assessment

- **failed step**: meaningful. `mixed_collection` has 1 ok job and 1 error job, so it tests the "any failed job → error" rule (confirmed by the mutation). The downstream `cat` ok check shows the error isn't painted across the whole graph.
- **step card navigation**: meaningful. It checks the title, the wrench and file icons, Next/Prev order and Hide.
- **isolate**: meaningful in both directions. The other branch gets dimmed and the selected lineage, upstream included, doesn't.
- **show connections**: meaningful. It checks the toggle on and off and that only the active node is drawn with connections. It also checks text absent before and present after.
- **step config**: meaningful. The selector requires `fieldset[disabled]`, and the label value `left_cat` shows the step's own config loaded.
- **search**: meaningful. It checks for exactly one result and that clicking it opens the card.

The tests don't repeat each other. The four `header-ok` waits in `_open_two_branches_invocation` are setup, and they cover the issue's "graph reaches terminal state" bullet. The live-update variant stays parked in [live_update_test_for_24138](live_update_test_for_24138.md).

## Style vs E2E writing notes / `writing_tests.md`

- All selectors are in `navigation.yml`. New hooks use `data-description`, and parameterized selectors are used where they fit (`graph_node_state`, `step_card_icon`).
- Setup goes through the API (`run_workflow`). The UI is used only for what's under test.
- State-change assertions use `wait_for_*` or `retry_assertion_during_transitions`, with no `sleep_for`.
- No raw driver calls. `get_attribute` and `is_enabled` on the returned element work on both backends.
- Imports are at module top. Comments are short and don't refer to plans.
- The reusable navigation (`invocation_open_latest`) lives in `NavigatesGalaxy`. `_click_node` is a one-line test-local helper. Editor tests click node titles inline, so there's no shared helper to reuse.

</details>
