# tool_open_tool_shed_ids — implementation debrief

**STATUS: READY.** Branch `tool_open_tool_shed_ids` @ `2821dd089bf`: a single commit on dev (merge-base `df3932ed4ba`), pushed to `jmchilton`, 4 files, +43/−12.

## What it does

`tool_open(<full Tool Shed id>)` used to fail in two places:
- **Panel search.** `searchObjectsByKeys` regex-escaped the query and then regex-matched it, so `id:toolshed.g2.bx.psu.edu/…` found nothing. It now matches plain substrings.
- **Selectors.** `tool_panel.tool_link`, `outer_tool_link` and `data_source_tool_link` matched the URL-encoded href. They now match `data-tool-id`.

## Choices

- **Origin.** Cherry-picked from `galaxy_ui_driver` (4a). Drop the commit there once this merges.
- **E2E instead of a selector unit test** ([test challenges](test_challenges_debrief.md)). `test/integration_selenium/test_tool_panel_tool_shed.py` installs `iuc/compose_text_param` 0.1.1 the way `test_workflow_repository_tool_update.py` does, then calls `tool_open` with its full id. The static-HTML unit test (12 cases) is dropped. **John decides** whether to keep it this way, keep both, or keep only the unit test ([scope evaluation](scope_evaluation.md) leans E2E only).
  - The E2E test runs only in the `integration_selenium` lane, and skips when the Tool Shed is down.
  - The unit test ran offline.
  - To restore it: `git show 953ad71c656 -- test/unit/selenium/`.
- **The E2E test stops at the link.** `compose_text_param` is an expression tool (`form_style: special`), so a panel click loads it into the hidden `galaxy_main` iframe. That already happens on dev; see Follow-ups.
- **Scope kept** ([scope evaluation](scope_evaluation.md)). Splitting the search fix from the selector fix would leave the first PR untestable end to end.
- **Thermo-nuclear review skipped.** It's 43 added lines, under the threshold.

## Follow-ups (not in this PR)

- The `tools_list.tool_card` etc. selectors (`navigation.yml` ~445-450) build `#…-${tool_id}`, which is invalid CSS for a Tool Shed id. Fix by switching to `[id="…"]`, as `navigation.yml:887` already does, and add a test method to the new class. Nothing calls them with a Tool Shed id today.
- When a special-form (expression) tool is clicked in the tool panel, it loads into the hidden `galaxy_main` frame and the user sees nothing. This already happens on dev. File separately.

## Evidence

- **vitest** `utilities.test.ts`: 25 passed. Red without the fix: 1 failed.
- **E2E**, Playwright backend, local client build, venv `bin` on PATH for `hg`:
  - 1 passed.
  - Red with the old `navigation.yml`: 1 failed. It timed out on the encoded-href selector.
  - The search half was not red-checked end to end, because that needs a second client build; vitest covers it.
- **Lint:** ruff, black and isort are clean.
- **Reviews:** [normal review](subagents/normal_review.md); [Codex](codex_review.md) found nothing (it ran at `7fd636774c9`, before the E2E test's last step was narrowed); [screenshots](screenshot_debrief.md).
