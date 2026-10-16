# Thermo-nuclear review: invocation_graph_e2e

**I acted on two findings, both simplifications.**

1. `invocation_open_latest` no longer uses a row-count retry closure. It now calls `invocations_panel_list_items.wait_for_and_click()`, which already retries during transitions. Because the helper no longer needs `retry_assertion_during_transitions`, that function moves back to `framework.py`, so `framework.py` is out of the diff entirely (`b04051e5e2a`).
2. The search test clicks the result through the retrying `wait_for_and_click`. Before, it reused an element it had captured before the screenshot (`f3abbbfa287`).

No assertions were weakened. The diff is now 8 files, +223/−61; before it was 9 files, +250/−81.

I didn't act on these items:

- **`navigates_galaxy.py` is 3346 lines.** It was already far over 1k before this branch. The branch adds about 30 lines, all of them in the invocation and toolbox helpers where they belong. Splitting the module is out of scope.
- **Flat `graph_*` selectors.** Review 1 already declined this because it matches the `invocations` section style. `graph_node_out_of_focus` matches a class on the node element itself, so a child selector under `workflow_editor.node` can't express it anyway.
- **The `workflow_editor.node._(label=…)` lookup appears 3 times in the test file.** Adding a `_node(label)` helper would only save characters. It's a nit.
- **`_ensure_panel_open` stays private on `NavigatesGalaxy`.** It has two callers (`open_toolbox`, `invocation_open_latest`), its contract is clear, and the polish pass already settled it.

<details><summary>Full review</summary>

## Scope

`git diff c63ffc2ccae...HEAD` at `73fcf359e6c`: three Vue test hooks, 15 `navigation.yml` selectors, `invocation_open_latest` and `_ensure_panel_open` in `NavigatesGalaxy`, the `retry_assertion_during_transitions` move, and the new `test_workflow_invocation_graph.py` (167 lines).

## Findings

### 1. Code judo: the retry move was only needed by a redundant closure (acted on)

`invocation_open_latest` kept the old `assert_has_row` closure:

- `wait_for_visible()` on the list items
- `assert len(...all()) > 0`, wrapped in `retry_assertion_during_transitions`
- `.all()[0].click()`

That closure does three redundant things:

- `wait_for_visible` on a multi-match target already proves at least one row exists, so the length assertion can't fail.
- The `.all()[0].click()` that follows wasn't retried at all.
- `NavigatesGalaxy.wait_for_and_click` is already decorated `@retry_during_transitions`, and `SmartTarget.wait_for_and_click` routes through it. That call waits for the first row to be clickable and retries stale or intercepted clicks.

So one `invocations_panel_list_items.wait_for_and_click()` replaces six lines and is more robust.

With the closure gone, nothing in `navigates_galaxy` uses `retry_assertion_during_transitions`. Moving it from `framework.py` (along with `exception_is_assertion_or_transition`, the `partial` import changes and the `__all__` re-export) existed only to satisfy the old TODO's precondition. I reverted `framework.py` to dev and dropped the two definitions from `navigates_galaxy.py`. The helper still moves to `NavigatesGalaxy`, the duplicate copies in `test_workflow_invocation_details.py` and `test_workflow_rerun.py` are still deleted, and those files still import `retry_assertion_during_transitions` from `.framework` as they do on dev.

### 2. The search test clicks an element captured before the screenshot (acted on)

`assert_single_result` returned `results[0]`, and the test clicked it after `self.screenshot(...)`. Every other click in the file goes through `wait_for_and_click`. The closure now only asserts, and the click is `graph_search_result.wait_for_and_click()`. The assertion that exactly one result exists still runs first, so the target is unambiguous.

### 3. `_ensure_panel_open` (no action)

This abstraction earns its keep: two callers share a non-trivial retry over a timeout or transition. The callable parameter is the minimum needed to cover `open_toolbox`'s choice between the editor activity and the plain activity. The type contract is explicit (`SmartTarget`, `Callable[[], None]`).

### 4. Test file structure (no action)

- One inline workflow with explicit positions.
- One setup helper that waits for terminal node state.
- Three small helpers. The two assertion helpers are `@retry_assertion_during_transitions`-decorated and have no outside users.
- No raw `By` or driver calls and no sleeps.
- Every selector lives in `navigation.yml`, and `workflow_editor.node` / `label_input` are reused rather than duplicated.

The file is cohesive and the right size.

### 5. Client hooks and selectors (no action)

The hooks are `data-description` attributes and a `title-item-class` that mirrors `invocation-step-outputs-tab`. They add no behaviour and follow existing conventions. `step_title(order_index)` already exists for the Steps tab, but `step_card_title` targets the Overview card, which has no `data-step` wrapper, so the two selectors don't overlap.

## Verification (sequential, Vite 5173 → Galaxy 8080)

- Playwright, headless:
  - `test_workflow_invocation_graph.py` + `test_workflow_invocation_details.py`: 8/8
  - `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun`: pass
  - `test_search_selects_step` after the second change: pass
- Selenium (chromedriver 155):
  - `test_workflow_invocation_graph.py` + `test_workflow_invocation_details.py`: 8/8
  - `test_search_selects_step` after the second change: pass
- `ruff`, `black`, the pre-commit hooks, and `mypy galaxy/selenium/navigates_galaxy.py` (from `lib/`) are clean in the touched files. The only mypy errors are pre-existing ones in `galaxy/util`.

## Commits

- `b04051e5e2a` Simplify invocation_open_latest; keep retry_assertion_during_transitions in framework
- `f3abbbfa287` Click invocation graph search result through retrying wait_for_and_click

Both are pushed to `jmchilton/invocation_graph_e2e`.

</details>
