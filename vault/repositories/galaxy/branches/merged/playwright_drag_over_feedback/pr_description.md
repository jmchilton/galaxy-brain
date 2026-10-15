Add a held-drag gesture, `drag_over()`, and use it to run `test_drag_drop_visual_feedback` under Playwright.

`test_drag_drop_visual_feedback` checks that the history page editor lights up while a dataset is dragged over it. Doing that means stopping halfway through the drag, and until now the only way to stop was a Selenium `action_chains()` chain, so the test was `@selenium_only`. With this branch it's one call that works on both backends:

```python
# before - Selenium only
ac = self.action_chains()
ac.click_and_hold(dataset_element).move_to_element(editor).perform()
...
assert "page-dragover-success" in classes
ac.release().perform()

# after - Selenium and Playwright
with self.drag_over(dataset_element, editor):
    ...
    assert "page-dragover-success" in classes
```

The drop happens when the block exits, even if the block raised, so the gesture ends where `drag_and_drop` would have ended. It's a context manager like `visit_new_window` and `accept_alert`, the two that already exist.

***`drag_and_drop` keeps its signature and callers. Holding a drag means running test code between the grab and the drop, which a flag on a one-shot call can't do, so this is a context manager.***

***This is test infrastructure only. No client or server code changes.***

***Each backend keeps its own mechanism.*** Selenium holds a real pointer drag (the same `click_and_hold`/`move_to_element` the test had inline, now released on exit). ***Playwright's `drag_and_drop` already dispatches scripted DragEvents rather than a mouse drag, so `drag_over` reuses that sequence instead of adding a second Playwright drag path.*** That sequence is split into hold and release halves, and one copy of it serves both `drag_and_drop` and `drag_over`.

<details><summary>Why splitting Playwright's <code>drag_and_drop</code> is safe</summary>

The old `_drag_and_drop` dispatched its whole sequence in one script, because a drop zone that swaps its contents on `dragenter` detaches the element the caller grabbed. The split keeps that working by collecting the target-to-document chain in `_drag_hold`, before any handler runs. The chain goes back in a `JSHandle`, and `_drag_release` drops on the first ancestor that's still connected. The existing `test_drag_and_drop_target_rerenders_on_dragenter` now exercises that over two round trips instead of one.

</details>

<details><summary>What's left for <code>action_chains()</code></summary>

After this branch, two `@selenium_only` decorators are left on dev (`test_histories_list`, `test_library_contents`). Neither is blocked on missing gesture vocabulary. The partial drag in `workflow_editor_connect` (`navigates_galaxy.py`) isn't migrated. It drags to an offset with no target element and holds only to take a screenshot. `drag_over` takes a target and ends in a drop, so stretching it to cover that case would change what it means.

</details>

## Risks

Risks are minimal. This only changes test code, so it doesn't commit Galaxy to anything hard to undo (a two-way door). One behaviour change: under Playwright, `drag_and_drop` now lets the page react between `dragover` and `drop`. Its two callers were re-run and pass.

## Context

Builds on 🔀 #23820, which added the context-manager pattern (`visit_new_window`) this follows. Part of moving the Selenium suite onto Playwright by replacing `action_chains()` with backend-neutral gestures.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The block's own error propagates, and the drop still runs on exit (`test_drag_over_drops_when_block_raises`).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. `test_drag_over` and `test_drag_over_drops_when_block_raises` check the fixture's feedback class and the dropped payload in real browsers on all three backends.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests run</summary>

- `test/unit/selenium/test_has_driver.py::test_drag_over` was written first and failed on all three fixture backends (`selenium`, `playwright`, `proxy-selenium`), then passed.
- `test_drag_over_drops_when_block_raises` raises inside the block, then checks that the drop still landed. It fails on all three backends when the release is moved out of `finally`. The whole file passes: 378 passed, 1 skipped.
- Against a live Galaxy, `test_drag_drop_visual_feedback` and `test_drag_dataset_to_page_editor` pass under Playwright and under Selenium.
- The other `drag_and_drop` callers pass under Playwright (`test_workflow_editor::test_existing_connections`, `test_history_multi_view::test_display`).
- Moving the assertion outside the `with` block makes it fail under Playwright (`'page-dragover-success'` missing), which shows the class appears only while the drag is held.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
