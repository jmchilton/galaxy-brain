# Scope evaluation (2026-10-10)

**Recommendation: keep the scope as implemented** (`2821dd089bf`: client search fix, `tool_panel` selector fix, vitest case, one `integration_selenium` E2E test). Don't split it, and don't add `tools_list`. Ship the `tools_list` selectors as a small follow-up that adds a method to the `TestToolPanelWithToolShedTool` class this PR creates. File the special-form iframe behaviour separately. Restoring the unit test is John's call; I lean towards E2E only.

Every reviewer that weighed scope (normal review, initial debrief, test challenges) deferred `tools_list` and the shared fixture. None of them proposed splitting the PR or folding in the iframe bug.

## 1. As implemented

`tool_open(<Tool Shed GUID>)` works end to end. Panel search uses substring matching instead of regex-on-escaped-strings, and `tool_panel.tool_link`, `outer_tool_link` and `data_source_tool_link` match `data-tool-id` instead of the URL-encoded href. Coverage is a vitest row plus a new E2E test that installs `iuc/compose_text_param` from the main Tool Shed. The diff is 4 files, +43/−12.

| Pros | Cons |
|---|---|
| Grows E2E coverage, which the project prefers: it's the first test of a Tool Shed tool in the panel | The E2E test runs only in the `integration_selenium` lane, needs the network, and skips if the Tool Shed is down |
| Both halves are red-checked: the selector half end to end, the search half via vitest | The test can't assert that the tool form opens (see scope 4), so it proves search and selection only |
| Codex review, screenshots and the E2E run are all already done on this commit | The thermo-nuclear review is still pending |
| One user-visible bug and its test helper in one reviewable unit | |

## 2. Contract: split the search fix and the selector fix

PR A would carry the `utilities.ts` fix and its vitest case. PR B would carry the `navigation.yml` fix and the E2E test.

| Pros | Cons |
|---|---|
| PR A is a pure client bug fix that a client reviewer could take alone | `tool_open(GUID)` needs both halves, so the E2E test fails with either one alone |
| | PR A ships with no E2E coverage, and PR B must merge after it |
| | Two PRs for +43/−12, against the project's E2E-first rule |

<details>
`tool_open` searches `id:<GUID>`, which needs the search fix, then waits on `tool_link`, which needs the selector fix. The halves can't be tested apart at the E2E level, so splitting trades one coherent PR for an ordered pair with weaker coverage on the first. Recommend against.
</details>

## 3. Expand: also fix the `tools_list` selectors

`navigation.yml:445-450` would change from `#g-card-content-${tool_id}` (and five siblings) to the `[id="…-${tool_id}"]` form. The GCard DOM id holds the raw GUID, so `#…toolshed.g2…/repos/…` is an invalid or misparsed CSS selector. A second E2E method would cover the Discover Tools card for the shed tool.

| Pros | Cons |
|---|---|
| Same class of bug, with a mechanical fix. `navigation.yml:887` already uses `[id="g-card-extra-actions-${id}"]` | No caller passes a Tool Shed id to `tools_list`, either in dev or in `galaxy_ui_driver` (checked with a repo-wide `git grep`) |
| Grows E2E coverage: no tools-list test uses a shed tool | Can't be verified in this pass. It needs another scheduled E2E run, plus a rerun of the Codex and thermo-nuclear reviews |
| Reuses the server boot this PR already pays for | `install_repository` is in the test body, so a second method would reinstall or depend on test order. The install would have to move to class setup |
| | Overrides two reviewers who both deferred it |

<details>
The follow-up is cheap because this PR creates `TestToolPanelWithToolShedTool`: one yml hunk, moving the install to class setup, and one method that asserts `tool_card(tool_id=GUID)` and the help toggle. Avoid `open_tool_button` in that method, because `compose_text_param` is a special-form tool. It deserves its own PR so this one doesn't reopen review on a finished commit.
</details>

## 4. Expand: fix special-form tools loading into the hidden `galaxy_main` iframe

`ToolBox.onToolClick` intercepts only `form_style === "regular"` tools. Expression tools follow `target="galaxy_main"` into a hidden frame, so clicking one in the panel does nothing visible. This already happens on dev.

| Pros | Cons |
|---|---|
| It's a real UX bug, and this PR's test is what surfaced it | A different component and a product decision: how should special-form tools open? |
| Fixing it would let the E2E test assert that the form opens | Already happens on dev and isn't caused by Tool Shed ids |
| | Would turn a small selector and search fix into a routing change |

Recommend a separate issue or follow-up.

## 5. Tests: E2E only, both, or unit only

The test challenge replaced the 12-case static-HTML selector unit test (`git show 953ad71c656 -- test/unit/selenium/`) with the E2E test. **This is for John to decide.**

| Option | Pros | Cons |
|---|---|---|
| **E2E only (as implemented, recommended)** | Exercises the real markup, search and selectors. No hand-copied `Tool.vue` mirror to drift. Follows the process rule to drop unit tests the Selenium layer covers | A Tool Shed id regression in the selectors is caught only in `integration_selenium`, and missed when the Tool Shed is down |
| Both | Offline coverage on both backends in the always-on lane, plus real E2E | Keeps the fixture that can drift. Brings back the duplicated driver fixture. +~70 lines |
| Unit only (the original) | Offline, fast, no network | No E2E growth, and it tests a mirror, not the real component |

<details>
Every existing `tool_open` call already catches a plain-id `tool_link` regression in the main lane. `outer_tool_link` and `data_source_tool_link` have their own E2E callers. Two things are actually lost: offline coverage of the GUID case, and the check that `tool_link` excludes disabled and data-source tools, which no caller relies on. The vitest row keeps the search half offline.

**Shared driver fixture:** this only matters if the unit test comes back ("Both" or "Unit only"). Then move the fixture into `test/unit/selenium/conftest.py` rather than duplicating `test_smart_components.py:35`. Otherwise it's moot.
</details>

## Housekeeping

The Breakdown step 1 in `projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md` still says "Tested by vitest and unit tests; CI has no shed tools for an E2E test." That's now wrong and needs updating. I haven't edited it.
