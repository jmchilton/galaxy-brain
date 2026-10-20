# Workflow Editor Tests: Playwright Migration Status

Salvaged from the `playwright_backlog` branch (worktree `~/projects/worktrees/galaxy/branch/playwright_backlog`,
uncommitted `WORKFLOW_EDITOR_CONNECT_PLAYWRIGHT_{PLAN,IMPLEMENTATION}.md`, March 2026).
Re-triaged against `origin/dev` @ `062e1411676` (2026-09-16).

## Branch disposition

All code from that branch has landed in dev — verified feature-by-feature, not by commit subject:

| Branch work | Status on dev |
|---|---|
| `refresh()` on protocol / proxy / both drivers | landed |
| `force=True` on `_hover` / `_move_to_and_click` | landed |
| `_SELENIUM_KEY_TO_PLAYWRIGHT` keys mapping (`playwright_element.py`) | landed |
| `workflow_editor_connect` unified on `drag_and_drop()` | landed (incl. `cast("HasPlaywrightDriver", ...)`) |
| `catWrapper.xml` symlink + `sample_tool_conf.xml` entry | landed |
| Unified history export test + `test_history_export_legacy.py` rename | landed |
| `mouse_drag()` Playwright branch (was "Tier C, not started") | landed — dev went further than the branch |

Dev is strictly ahead except one line: the branch dropped `@selenium_only` from
`test_rendering_rules_workflow_1`; dev still has it. That is the only salvageable delta,
and it needs re-verification against current dev regardless of the March result.

The sibling branch `playwright_backlog_1` is fully merged into dev (0 commits ahead).

Post-salvage cleanup (2026-09-16): worktree removed via `ghwt rm galaxy playwright_backlog`;
branches `playwright_backlog` (tip `ffd6655b125`, 8 unmerged commits, all superseded),
`playwright_backlog_1` (`2825bb09e42`) and the stale `test_stories` (`aa477d3b599`) deleted.
The `test-stories` branch/worktree (PR #21199) is untouched. Note the hyphen/underscore trap:
`test-stories` is the live PR branch; `test_stories` was the stale merged one.

## Remaining `@selenium_only` in `test_workflow_editor.py` (3 of an original 46)

| Test | Tier | Blocker |
|---|---|---|
| `test_conditional_subworkflow_step` | B | `switch_param_type` + `move_to_and_click` are both ported. May just pass now. |
| `test_collection_input_sample_sheet_chipseq_example` | A | Unknown — no obvious Selenium API usage. Never investigated. |
| `test_aria_connections_menu` | D | Real gap: `driver.switch_to.active_element` (x6, lines 1400-1444). No Playwright equivalent in the driver layer yet. |

Tiers A/B/C came from the March triage; C is now empty (dev migrated `test_editor_place_comments`,
`test_editor_snapping`, `test_editor_selection` once `mouse_drag()` existed, plus
`test_editor_create_conditional_step` and `test_map_over_output_indicator`).

## Established patterns (still current)

### Backend branching
```python
if self._driver_impl.backend_type == "playwright":
    pw_driver = cast("HasPlaywrightDriver", self._driver_impl)
    # Playwright-specific code
else:
    # Selenium code
```

### Accessing the Playwright page
- From `NavigatesGalaxy`: `self.page` property (raises for Selenium).
- When also needing `_unwrap_element`: cast to `HasPlaywrightDriver`.

### Keyboard input
- `page.keyboard.type("text")` / `page.keyboard.press("Enter")`.
- `element.press("Control+a")` for combos on a specific element.
- `PlaywrightElement.send_keys` translates Selenium `Keys.*` automatically.

### Gotchas found the hard way
- `assert_connected`: SVG `<g>` elements report as hidden under Playwright — use `wait_for_present`, not `wait_for_visible`.
- `open_in_workflow_editor` must dismiss `StateUpgradeModal`; it blocks clicks under Playwright.
- Tooltips can intercept pointer events on adjacent terminals — fixed upstream in `NodeOutput.vue`
  with `v-b-tooltip.hover.noninteractive`. That was a real UI bug, not a test artifact.

## Open questions

- `test_aria_connections_menu`: is there a Playwright equivalent of `switch_to.active_element`
  that returns a usable element wrapper (`page.evaluate("document.activeElement")`)? Needs a driver-layer addition.
- `test_collection_input_sample_sheet_chipseq_example`: why was it ever decorated?

## Migration loop validated (2026-09-16)

Branch `playwright_rendering_rules_workflow_1` (2 commits, pushed to the `jmchilton` fork, no PR opened).
`test_rendering_rules_workflow_1` passes under Playwright with the decorator simply removed — 3/3 green,
~20s per run. The March triage was right: it was a stale decorator, no code change needed.

### Local environment gotchas worth reusing

- `~/galaxy_selenium_context.yml` points `local_galaxy_url` at `http://localhost:5173`, and
  `framework.py` maps that config key onto `GALAXY_TEST_EXTERNAL`. So the browser goes through the Vite
  dev server and the framework does *not* start its own Galaxy — both `run.sh` (8080) and
  `make client-dev-server` (5173) must be up.
- A fresh worktree has an empty DB; the first run dies in setup with
  `Timeout waiting on CSS selector [.loggedin-only]`. Register the user first (`/galaxy-register-user`).
- A cold Vite causes a spurious first-run failure (`[id^="g-card-action-workflow-edit-"]` not clickable,
  ~265s). Warm it up and re-run before believing any timeout.
- `GALAXY_TEST_SELENIUM_HEADLESS=1` cannot work for the *Selenium* backend on macOS —
  `driver_factory.virtual_display_if_enabled` wants Xvfb. Playwright headless is fine.

### Tool conf: which conf has which tools

CI does **not** rely on `sample_tool_conf.xml` alone. `run_tests.sh` sets, for both backends:

    -selenium   GALAXY_TEST_TOOL_CONF="lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml"
    -playwright GALAXY_TEST_TOOL_CONF="lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml"

`tool_conf.xml.sample` already lists `filters/randomlines.xml` and `filters/catWrapper.xml`, so
`random_lines1` and `cat1` are present in CI. Local `run.sh` with `GALAXY_RUN_WITH_TEST_TOOLS=1` loads
only the test conf, which is why `random_lines1` was missing here and the workflow node rendered with no
input terminal. `-framework` also uses the test conf alone.

Separately, `sample_tool_conf.xml` has referenced `for_workflows/randomlines.xml` since the
`samples_tool_conf` rename while the symlink has never existed in any branch, so that conf logs
`Error reading tool configuration file from path 'for_workflows/randomlines.xml'` on every startup.
The added symlink mirrors `dccab49baa8` (catWrapper) and fixes it.

## Tier A/B re-triage (2026-09-16) — both remaining candidates are blocked on real driver gaps

Tried dropping the decorator on the other two and running under Playwright. Neither passes;
the March "may just work now" guesses were wrong for both. Decorators left in place.

### `test_conditional_subworkflow_step` — no ActionChains emulation

    test_workflow_editor.py:1339
    AttributeError: '_PlaywrightDriverImpl' object has no attribute 'move_to_element'

The test calls `self.action_chains().move_to_element(conditional_toggle).click().perform()`.
`HasPlaywrightDriver.action_chains()` (has_playwright_driver.py:831) is a stub that returns `self`
with the comment "Playwright doesn't use ActionChains pattern" — so any chain method raises
`AttributeError`. There is no emulation, only an object that exists.

This is the same underlying gap as Tier D's `test_aria_connections_menu`. A real chainable shim
(`move_to_element`, `click`, `click_and_hold`, `move_by_offset`, `release`, `key_down`, `key_up`,
`send_keys`, `perform`) mapping onto `page.mouse.*` / `page.keyboard.*` would unlock several
remaining tests across files rather than one — the reusable-abstraction move. `mouse_drag()` already
proves the pattern for a single operation.

### `test_collection_input_sample_sheet_chipseq_example` — trailing newline from `send_enter`

    test_workflow_editor.py:306
    AssertionError: assert 'The column i...le reports.\n' == 'The column i...able reports.'

Not a `.text` normalization issue — the assert compares the *downloaded workflow's* `tool_state`
against the `CHIPSEQ_COLUMNS` constant. `workflow_editor_enter_column_definition`
(navigates_galaxy.py:1420-1424) types the description and then calls `self.send_enter(elem)`, which
carries the standing comment "seems like a Galaxy bug that these enter's are needed?". Under
Playwright that ENTER lands in the field as a literal newline and is saved into `tool_state`; under
Selenium it is not. Fixing it in the test (stripping, or dropping the assert) is the wrong direction —
the backends should agree on what `send_enter` does to a committed field value.
