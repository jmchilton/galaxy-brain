Refactor ahead of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver) - shared workflow editor connection helpers for `NavigatesGalaxy` that can address any step and report why a connection was refused.

***This only changes test and browser-automation code - no Galaxy behavior changes for users*** (`navigation.yml` is the shared test selector registry). ***Targets `release_26.2` because `galaxy_ui_driver` drives 26.2 QA and must match 26.2's selectors and helpers.***

Workflow editor E2E tests could only check connections that the editor accepted, and only between steps with unique labels. Unlabelled steps of the same tool share a `node-label`, so the old helpers silently acted on the first one. The editor's refusal tooltips ("Cannot connect workflow parameter to data input.") had no browser (E2E) coverage. ***The helpers move to `NavigatesGalaxy` so code that isn't a test class (`galaxy_ui_driver`) can use them*** - and it drives workflows it didn't write, so it can't count on unique labels.

After this PR, a test reads like this and runs under both Selenium and Playwright:

```python
# workflow: input1, int_input (integer), first_cat, second_cat
refusal = self.workflow_editor_try_connect("int_input#output", "second_cat#input1")
assert refusal == "Cannot connect workflow parameter to data input."

# workflow: input1, input2, then two unlabelled cat steps (order indices 2 and 3, 0-based)
self.workflow_editor_connect("input1#output", (2, "input1"))
assert self.workflow_editor_try_connect("input2#output", (3, "input1")) is None
self.workflow_editor_destroy_connection((3, "input1"))
self.workflow_editor_remove_node(3)
```

<details><summary>What changes</summary>

- The editor's connection asserts move from `TestWorkflowEditor` to `NavigatesGalaxy` and are renamed `workflow_editor_assert_connected` / `_not_connected` / `_connection_invalid` / `_input_mapped` / `_input_not_mapped`. `workflow_editor_destroy_connection` moves too (name unchanged). All call sites are updated.
- Every editor connection helper takes a terminal ref, either `"label#terminal"` (unchanged) or `(node, terminal)`. Here `node` is a label or an order index. `workflow_editor_node` is the one resolver, built on the existing `SelectorTemplate` list fallback (`workflow_editor.node._` now lists the label and `#wf-node-step-${id}` selectors).
- New `workflow_editor_try_connect` drags with `drag_over`. It returns `None` if the sink accepts, and otherwise the text of the editor's refusal tooltip. New `workflow_editor_remove_node`. Existing tests that inlined these steps now call the helpers.
- Terminals are found through the node component, so `workflow_editor_connect` no longer queries again by raw `#id`.
- `workflow_editor_set_tool_vesrion` is renamed `workflow_editor_set_tool_version`.
- **Playwright drag fix (test driver only - no editor change).** The synthetic drag in `has_playwright_driver.py` now fires `dragenter` one task after `dragstart`, as a real browser does. Before, the editor's drag state (set by a watcher after `dragstart`) wasn't there yet when `dragenter` arrived, so the sink never showed its accept/refuse state or tooltip. Drops still connected, which is why the existing connect tests passed. `test_refused_connection_and_removed_step` fails on Playwright without this fix.

</details>

***Order indices can change when the workflow is saved***, because the server re-sorts steps topologically and renumbers them. The `EditorNodeReference` comment says so, and the order-index test reads indices back from the API after each save.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Renamed helpers: the five `assert_*` methods and `workflow_editor_set_tool_vesrion`. There are no callers in Galaxy outside `test_workflow_editor.py`. Out-of-tree code that called the old `TestWorkflowEditor` names would need the new names.
- The Playwright drag fix affects every Playwright `drag_and_drop` and `drag_over` caller: every `workflow_editor_connect`, plus `test_history_multi_view.py` and `test_history_pages.py`. [Fork CI's Playwright run](https://github.com/jmchilton/galaxy/actions/runs/39780461081) is green.
- `workflow_editor.node._` becomes a selector list in `navigation.yml`. Existing `label=` callers are unchanged.

</details>

<details><summary>Risk Review Advice</summary>

The two things worth reading are `workflow_editor_try_connect`, which only judges the sink once the drag has registered (idle terminals also carry `can-not-accept`), and the one-line `await` in the Playwright drag. The rest is moved code and call-site renames, and it's easiest to review commit by commit: three refactor-only commits come first, then order-index refs (additive; existing callers unchanged).

</details>

## Context

Used by 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), whose `workflow-connect`, `-disconnect` and `-remove-step` commands call `workflow_editor_try_connect`, `workflow_editor_destroy_connection` and `workflow_editor_remove_node` with order-index refs in place of their own duplicate-label mouse-drag and click fallbacks. Alternative kept on 🌿[`workflow_editor_connection_helpers_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/workflow_editor_connection_helpers_alt_original_scope): label-only refs and no rename of the moved asserts. A follow-up on 🌿[`workflow_editor_selector_escaping`](https://github.com/jmchilton/galaxy/tree/workflow_editor_selector_escaping) makes the terminal and connector selectors safe for labels containing spaces, `'` or `\`. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Two rounds of review. Round 1 added order-index refs and the rename. From round 2, the typo fix was taken and CSS-safe selectors went to a follow-up.</summary>

- Round 1 found that the label-only helpers act on the wrong node when unlabelled steps of one tool share a label. The branch was re-scoped to address steps by order index and to rename the moved asserts `workflow_editor_assert_*`.
- Round 2 asked for (A) CSS-safe terminal and connector selectors for subworkflow terminals whose labels contain `'`, `\` or spaces, and (B) the `set_tool_vesrion` typo fix. B is in this PR. A is the follow-up branch `workflow_editor_selector_escaping`.
- Rejected: a `NavigatesWorkflowEditor` mixin, backend-agnostic waits, rebuilding `connect` on `drag_over`, and removing `node.by_id`. Each is structural churn beyond this change.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural problems: one node-ref model and one resolver serve every editor helper.</summary>

- Acted on: existing data, collection, integer and non-data connection tests now use `workflow_editor_remove_node` / `workflow_editor_destroy_connection` instead of inlining them.
- Nits not acted on: `try_connect` resolves the sink ref twice (a cheap parse); a missing `aria-describedby` would time out on `#None` rather than fail with a clear message (every refusal in `terminals.ts` carries a reason).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Both new E2E tests fail on the bug they target. The order-index test now also drives <code>try_connect</code> with a tuple ref.</summary>

- `test_connect_unlabelled_steps_by_order_index` fails when the steps are addressed by their shared label: the second drag replaces the first connection. A precondition assert keeps it from going falsely green if the fixture stops producing duplicate labels.
- `test_refused_connection_and_removed_step` fails on Playwright without the drag fix, waiting for the refusal tooltip.
- No unit tests were added. The candidates would only have restated the implementation, and E2E covers them.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex reviewed the re-scoped branch and returned no findings.</summary>

It reviewed the diff along with the editor's terminal/drag components, `has_driver.py`, `smart_components.py` and the navigation component code.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The history leads with three refactor-only commits and the additive order-index refs, then the drag fix, then the feature and its tests.</summary>

1. Move and rename the connection asserts.
2. `workflow_editor_node_and_terminal`.
3. `workflow_editor_source_sink_terminal_elements`.
4. Order-index refs.
5. Playwright drag timing.
6. `try_connect` / `remove_node` and the refused-connection test.
7. Helper reuse in existing tests.
8. The order-index test.
9. The `set_tool_version` typo fix.

Commits 1–8 give a tree identical to the pre-rewrite head. The typo fix came after.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A timeout on a named navigation target, or, from `workflow_editor_try_connect`, the editor's own refusal text.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. None were added. The one unit test touched (`test_has_driver.py`) only gets a docstring update and still asserts the drop behavior.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. There's no existing behavior to baseline. The refactor-only commits come first.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Only test and automation code changes.
- [x] Who hits this in practice and what is the evidence? Editor test authors and `galaxy_ui_driver`. The new tests are red against label-only refs and against the old Playwright drag.
- [x] Were simpler or existing approaches considered? Yes. Label-only refs are kept as an alt. Order-index refs reuse the existing `SelectorTemplate` list fallback. Format2 export was rejected for checking saved connections because it drops order indices.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] This is a refactoring of components with existing test coverage.

<details><summary>Tests</summary>

- New in `test_workflow_editor.py`:
  - `test_refused_connection_and_removed_step`: refusal reason, an accepted connect, disconnect, reconnect, removing a step, then the saved connections checked through the API.
  - `test_connect_unlabelled_steps_by_order_index`: connect, disconnect and remove unlabelled steps of the same tool by order index, checked through the API after each save.
- The existing editor tests cover the moved and renamed helpers.
- Both new tests pass locally under Selenium and Playwright, and under Playwright in fork CI. Galaxy's Selenium workflow runs only on schedule.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
