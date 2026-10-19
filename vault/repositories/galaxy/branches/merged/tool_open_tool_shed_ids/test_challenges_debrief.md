# tool_open_tool_shed_ids — test challenges debrief

Branch amended from `953ad71c656` to `7fd636774c9`, still a single commit on `dev`. It now changes 4 files, +42/−12. To restore the dropped unit test, use `git show 953ad71c656 -- test/unit/selenium/`.

## The "no E2E" claim was wrong

"CI has no Tool Shed tools" is true only for the standard Selenium/Playwright lane.

- `test/integration_selenium/test_workflow_repository_tool_update.py` already installs `iuc/compose_text_param` from the main Tool Shed. It does this with `UsesShed.configure_shed` and `install_repository`.
- `.github/workflows/integration_selenium.yaml` runs that directory in CI.
- So an E2E test needed no new infrastructure.

I didn't add a sample tool with a `.`/`+`/`/` id instead.
- None of the 415 tool ids in `test/functional/tools/` contains a character outside `[A-Za-z0-9_-]`.
- A made-up id in the shared sample conf could disturb tests that count tools.
- A real shed GUID is the actual shape of the bug.

## Changes

- **Added** `test/integration_selenium/test_tool_panel_tool_shed.py`. It follows the existing shed test's setup.
  - It installs `compose_text_param` 0.1.1 (`e188c9826e0f`), loads home, and calls `tool_open("toolshed.g2.bx.psu.edu/repos/iuc/compose_text_param/compose_text_param/0.1.1")`.
  - It then asserts that the tool form's `data-version` is `0.1.1`.
  - It is a new class rather than a method on the existing one, because that class is named for the workflow editor. The cost is one extra server boot in the integration_selenium lane.
  - The GUID hits both bugs:
    - The `.` broke the old panel search. Because the query uses `id:`, the search never falls back to fuzzy (DL) matching.
    - The `/` is URL-encoded in the href, which broke the old `tool_link` selector.
- **Dropped** `test/unit/selenium/test_navigation_tool_panel.py` and `fixtures/tool_panel.html`, which were 12 cases across both backends. Reasons:
  - The process rule says to drop unit tests that the Selenium layer covers.
  - The fixture was a hand-copied mirror of `Tool.vue`. It could keep passing while the real markup drifted, whereas the E2E test exercises the real markup, search and selectors.
  - The GUID `tool_link` case is now covered by the new E2E test.
  - The plain-id `tool_link` case is covered by every existing `tool_open` call.
  - `outer_tool_link` is covered by `test_tool_form.py` (`__APPLY_RULES__`, `outer=True`).
  - `data_source_tool_link` is covered by `test_data_source_tools.py`.
  - What is lost:
    - The check that `tool_link` excludes disabled and data-source tools, which was pre-existing behaviour that no caller relies on.
    - Offline coverage of the selectors. The E2E test skips when the Tool Shed is down and runs only in the integration_selenium lane.
  - Dropping it also removes the duplicated driver fixture the review flagged.
- **Kept** the vitest case in `utilities.test.ts`. It is one row in the existing table-driven search test, it runs in the always-on lane, and it checks behaviour rather than implementation. Nothing in it needed changing.

## Results

- vitest `utilities.test.ts`: 25 passed. Red check with the old `utilities.ts`: 1 failed, 24 passed (the GUID case).
- The new E2E test collects (`pytest --collect-only`), and ruff, black and isort are clean.
- **The E2E test has not been run. It needs a scheduled run:** `./run_tests.sh -integration test/integration_selenium/test_tool_panel_tool_shed.py`.
  - The red check is reasoned, not run: on the old code, `tool_link.wait_for_present` times out.
  - Main runtime risk: whether the panel shows a tool installed just before the first page load. The existing workflow-editor test relies on the server toolbox being updated, but that isn't proven for the panel.

## Not done

`tools_list.tool_card` id selectors are still a recorded follow-up.

## E2E run (orchestrator, 2026-10-10)

The test-challenge agent left the E2E test unrun. I ran it once on the Playwright backend, which is the one CI's `integration_selenium` lane uses. The run used this worktree's own client build and the main repo's venv, with that venv's `bin` on PATH: the Tool Shed install shells out to `hg`, and without it the clone fails.

The original test's final step fails, and not because of this branch. After `tool_open`, it asserted the tool form's version inside the main page. But `compose_text_param` is an expression tool (`form_style: special`), so `ToolBox.onToolClick` doesn't intercept the click. The link loads, through `target="galaxy_main"`, into the hidden `galaxy_main` iframe, and nothing changes in the main page.

This already happens on dev: clicking a special-form tool in the panel loads it into a hidden frame. It is a possible separate bug and out of scope here.

The test now checks what this branch fixes: `tool_open(<full Tool Shed id>)`. That searches `id:<full id>` and waits for the link, matched by `data-tool-id`. A screenshot follows, taken after a `UX_RENDER` wait. Amended into `2821dd089bf` and pushed.

- **Green:** 1 passed (23–34s).
- **Red,** with the old `navigation.yml`: 1 failed. It times out on `a[href$="/?tool_id=toolshed.g2.bx.psu.edu/repos/…/0.1.1&version=latest"]`, because the href holds the URL-encoded id.
- **Not red-checked end to end:** the search half. That would need a second client build from the old `utilities.ts`. The vitest case covers it, red and green.
