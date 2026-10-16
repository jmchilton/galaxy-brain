# Normal review 1: invocation_graph_e2e

**Implementer response:** acted on 1–6. Step Config now asserts `workflow_editor.label_input` value `left_cat` + disabled; terminal-state test dropped. The live-update variant (`wait=False`) went red in 1 of 6 runs on dev (the graph's polling stops before the final job states load), so it is parked for the #24138 fix in [live_update_test_for_24138](../live_update_test_for_24138.md); failed-step test asserts downstream `cat` is ok; Show Connections checks "out_file1" absent before and "Concatenate Dataset" after; search screenshot after results settle; defaults dropped. Not acted on: 7 (flat selectors match the `invocations` section style), 8 (rerun now passes locally under both backends). Separately, a Selenium run hit a race in `invocation_open_latest` (activity click left the Tools panel open); the helper now uses `open_toolbox`'s idempotent ensure-open retry.

**Verdict: good to go after small test changes.** The refactor is sound: all ~30 importers still resolve through the `framework.py` re-export, and nothing imported `exception_is_assertion_or_transition` from `framework`. Selectors and Vue hooks match existing conventions. Most tests would catch a real regression. Two tests are weaker than they look: Step Config's disabled check holds by construction, and the terminal-state test only repeats the shared setup. No security concerns.

## Findings (ranked)

1. **Medium: Step Config disabled check can't fail on its own.** `lib/galaxy_test/selenium/test_workflow_invocation_graph.py:126-131`. The `step_card_config_form` selector already requires `fieldset[disabled]`, and the HTML spec disables every input inside a disabled fieldset. So `not any(is_enabled())` is always true once the selector matches. The only real checks are "the selector matched" and "some `input` exists". The editor `FormTool` always renders Label and Annotation fields, so the second check would pass even if the wrong step's config loaded. **Fix:** reuse the existing `workflow_editor.label_input` selector (`//div[@id='form-element-__label']//input`, navigation.yml:1155). Assert its `value` is `"left_cat"` and that it is not enabled. That proves the step's own config rendered and is read-only, and the raw `By` / `find_elements` code can go.
2. **Medium: `test_graph_reaches_terminal_state` duplicates every other test's setup.** `:47-50`. `_open_two_branches_invocation` already waits for all four nodes to show `header-ok`, and `run_workflow(wait=True)` means jobs are done before the page opens. **Fix:** make this the live-update variant the issue mentions. Run with `wait=False`, open the invocation straight away, and wait for every node to reach `header-ok` with the JOB_COMPLETION timeout. That covers polling and state transitions in the graph. If the risk isn't wanted, drop the test.
3. **Low: the failed-step assertion has nothing to compare against.** `:63-64`. `header-error` and `header-ok` are mutually exclusive, so `state="ok").assert_absent()` adds nothing. **Fix:** also assert a sibling that succeeds is ok, e.g. `graph_node_state(label="filtered_collection", state="ok")` or `cat`. That shows the error is per-step and not painted across the whole graph.
4. **Low: the Show Connections text check has no "before" state.** `:113`. `NodeOutput.vue:361` hides the output name when blank, so "out_file1" is a good signal, but the test never checks that it is absent before the toggle. The issue also says input names appear, and `NodeInput.vue:244` hides the label when blank. **Fix:** assert "out_file1" is not in the node text before the toggle. Optionally also assert that "Concatenate Dataset" (the cat1 input label) appears after the toggle.
5. **Low: the search screenshot runs before the debounced results settle.** `:146`. `DelayedInput` waits 200ms. **Fix:** call `assert_single_result()` first, then take the screenshot, then click.
6. **Nit: `assert_ok=True, wait=True` are the defaults.** `:152`. Drop them.
7. **Nit: graph selectors are flat.** navigation.yml `graph_node_state` / `graph_node_out_of_focus` each repeat `[node-label='${label}']`. A nested `graph_node:` component (`_`, `state`, `out_of_focus`) would mirror `workflow_editor.node`. Optional, since the flat `invocations` section is the local style.
8. **Nit: rerun now navigates home first.** `test_workflow_rerun.py:57`: `invocation_open_latest` calls `self.home()`, which the old `_invocations_panel_open_latest_invocation` didn't. It passed under Playwright. Leave Selenium confirmation to CI.

<details><summary>Full review</summary>

### Refactor (`navigates_galaxy.py`, `framework.py`)
- `exception_is_assertion_or_transition` and `retry_assertion_during_transitions` moved without changes. `partial` was already imported in `navigates_galaxy`, and `framework` drops its now-unused `partial` import.
- `framework.py` still uses `retry_assertion_during_transitions` itself (lines 621, 629, 709, 1286, 1308, 1319), and `__all__` makes the re-export explicit. A `git grep` found about 25 selenium test modules plus `test/integration_selenium/{test_admin_jobs,test_curated_workflows,test_user_library_permissions}.py` importing it from `galaxy_test.selenium.framework`. All of them still resolve. Nothing imports `exception_is_assertion_or_transition` from framework, and nothing in `packages/` references either name.
- `invocation_open_latest` resolves the old TODO and removes the copy in `test_workflow_rerun.py`. The closure no longer returns the unused row. Behaviour matches the old helper except for the `home()` call in the rerun path.
- This is a reusable abstraction, not accretion: any invocation-page test can now call `invocation_open_latest` from `NavigatesGalaxy`.

### Vue hooks
- The `data-description` attributes on Prev, Next, Hide and the search toggle follow the existing `toggle step connections button` style.
- `title-item-class="invocation-step-config-tab"` matches the sibling `invocation-step-outputs-tab`. These are minimal and have no behaviour change.

### Selectors
- Reuse is good. `_click_node` uses `workflow_editor.node._(label).title`, and the Show Connections test uses `workflow_editor.node._.output_terminal`. Both follow the issue's plan.
- `step_card_icon` keys on FontAwesome's `data-icon`, so it catches the #20334 regression class. `WorkflowStepIcon` passes `portlet-title-icon` onto the svg.
- `graph_search_input` is scoped by `.search-container`. That matters because `Panels/SearchPanel.vue` uses the same placeholder.
- One more reuse opportunity: `workflow_editor.label_input` for Step Config (see finding 1).

### Per-test meaningfulness
- **terminal state**: duplicates the setup (finding 2).
- **failed step**: real. `mixed_collection` has one ok job and one error job, which tests the "any failed job means error" rule. It needs a sibling that succeeds (finding 3).
- **step card navigation**: strong. It checks the title, the tool icon (wrench), the data input icon (file), Next/Prev order across steps 2, 3, 2, 1, and Hide.
- **isolate**: strong. It checks the before state for all four nodes, then that the other branch is dimmed and the selected lineage is not.
- **show connections**: strong. `WorkflowGraph.vue:308` makes only the active node non-invocation when `detailedView` is on. The test checks left_cat turns non-blank, right_cat stays blank, and toggling off restores blank. The text check is one-sided (finding 4).
- **step config**: weak (finding 1).
- **search**: real. It checks the exact result list and that clicking a result opens the card, which exercises `onHighlightRegion` setting `activeNodeId`. Screenshot order (finding 5).

### Flakiness
- The assertions after a state change go through `retry_assertion_during_transitions` or `wait_for_*`.
- The immediate `assert_absent` calls in the isolate test run after the nodes have reached `header-ok`, and come from the same reactive update as the `wait_for_present` that precedes them.
- The JOB_COMPLETION timeout on node states covers lag in graph polling.
- I saw no fixed sleeps.

### Style
- Imports are at module top.
- Comments are short and useful: the two-branch rationale, the `managed_history` reason and the navigation.yml note. None refer to plans.

</details>
