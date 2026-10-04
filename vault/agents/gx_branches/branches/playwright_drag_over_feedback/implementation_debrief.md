# playwright_drag_over_feedback — implementation debrief

Branch `playwright_drag_over_feedback` @ `82e414ef063`, one commit off dev `3167c014a47`,
+111/−21 across 7 files. Pushed to `jmchilton`. No PR.

Drops `test_history_pages::test_drag_drop_visual_feedback`'s `@selenium_only` — the last one
that needed new gesture vocabulary, and the only remaining decorator on dev not already covered
by a branch or an open PR. Three left after this: `test_change_password` (#23808),
`test_library_contents` (`playwright_text_table_parity`), `test_histories_list`
(`playwright_scoped_css_parity`).

## What it adds

`drag_over(source, target)` on `HasDriverProtocol`, both impls and the proxy. A context manager,
matching `visit_new_window` and `accept_alert`, the two that were already there:

```python
with self.drag_over(dataset_element, editor):
    assert "page-dragover-success" in editor.get_attribute("class")
```

The drop completes on exit, so the gesture ends where `drag_and_drop` would have.

**Each backend keeps its own mechanism, which is the point of the vocabulary.** Selenium holds a
real pointer drag — `click_and_hold(source).move_to_element(target)`, the sequence the test had
inline, released on exit. Playwright has no pointer drag to hold (its `drag_and_drop` dispatches
scripted DragEvents), so that method was split into `_drag_hold` / `_drag_release` and rebuilt as
hold-then-release. One event sequence serves both callers rather than a second copy of it.

**The split had one real hazard.** `_drag_and_drop`'s docstring said the sequence must be
dispatched without yielding, because a zone that swaps its contents on `dragenter` detaches the
element the caller grabbed. That survives the split only because the target→document chain is
collected *before* any handler runs; `_drag_hold` returns it inside a `JSHandle` and
`_drag_release` drops on the first ancestor still connected. The existing
`test_drag_and_drop_target_rerenders_on_dragenter` now exercises that across two round-trips
instead of one, so it covers more than it did.

A first attempt passed the shared `drag()` helper between the two scripts as a function handle.
That cannot work: Playwright invokes a function expression passed to `evaluate_handle` rather than
returning a handle to it. The three-line helper is declared in each script, as the original did.

## Verification

- `test_drag_over` added to `test/unit/selenium/test_has_driver.py`, red first on all three
  fixture params (`selenium`, `playwright`, `proxy-selenium`), then green. It asserts the feedback
  class is present inside the block, absent after, **and** that the drop still landed — so a
  release that silently did nothing would fail it.
- That red run also answered the design question empirically: a real chromedriver pointer drag
  does fire HTML5 `dragenter`, so Selenium needed no scripted path.
- Whole file after the refactor: **375 passed, 1 skipped** (6:33).
- Live Galaxy, `test_drag_drop_visual_feedback` + `test_drag_dataset_to_page_editor`:
  **Playwright 2 passed (57.47s)**, **Selenium 2 passed (79.49s)**.
- The other two `drag_and_drop` consumers regression-run under Playwright, the backend whose impl
  changed: `test_workflow_editor::test_existing_connections` (via `workflow_editor_connect`) and
  `test_history_multi_view::test_display` — 2 passed (33.60s). Selenium's `drag_and_drop` is
  untouched seletools, so it was not re-run for those two.
- Load-bearing probe: moved the assertion outside the `with` block and re-ran under Playwright —
  fails with `assert 'page-dragover-success' in 'markdown-textarea w-100 p-4'`. The class really
  is only present while the drag is held, and `_drag_release` really clears it. Reverted.
- black / isort / ruff / flake8 / prettier clean (pre-commit on commit); `mypy galaxy/selenium/`
  clean.

Run against the Galaxy + Vite pair already up from the `workflow_multiple_parameter_followups`
worktree. Legitimate here: this branch changes no client code and no server code, and that branch
touches nothing the history page editor renders.

## Left over

- **`workflow_editor_connect`'s partial drag (`navigates_galaxy.py:1245`) is not migrated.** The
  gesture-design table groups it with this one as "partial / held drags", but it is a different
  animal: a pointer drag to an *offset* with no target element, held only to take a screenshot.
  `drag_over` takes a target and ends in a drop, so forcing both into one gesture would widen it
  past what either caller means. That site keeps its `backend_type` branch, and it is now the only
  thing in that row.
- `action_chains()` callers left for the deletion step: `navigates_galaxy` 1245, 3012, 3045, 3088,
  `test_workflow_editor` 1354/1390/1431/1437, `test_uploads:424`, `test_workflow_run:319`.
  `test_history_pages:387` is off that list as of this branch.

## Questions for John

- `drag_over` vs something like `drag_and_hold` — the name describes the phase being held, and
  matches the `page-dragover-success` class the test reads, but it does end in a drop.
- Worth a `GESTURE_ABSTRACTION_DESIGN.md` note that step 6 is now one port away?
