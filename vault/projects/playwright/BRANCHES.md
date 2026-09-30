# Branches and PRs

Convenience view. **Source of truth is [`vault/agents/gx_branches/MY_BRANCHES.md`](../../agents/gx_branches/MY_BRANCHES.md)** —
a separate branch-management agent owns it, tracks CI, opens PRs, and undrafts.
Update that file first; this one mirrors it.

## PRs

All merged. Every Playwright PR opened for this project has landed; the
`selenium_only` backlog is down from 140 decorators to 8.

| PR | Branch | Head | State |
|---|---|---|---|
| [#23566](https://github.com/galaxyproject/galaxy/pull/23566) | `playwright_rendering_rules_workflow_1` | `4287ccb92a9` | **merged** 2026-09-17 |
| [#23567](https://github.com/galaxyproject/galaxy/pull/23567) | `playwright_column_definition_send_enter` | `2675c865001` | **merged** 2026-09-17 |
| [#23568](https://github.com/galaxyproject/galaxy/pull/23568) | `test_tool_conf_randomlines_symlink` | `18f5bfb276c` | **merged** 2026-09-17 |
| [#23589](https://github.com/galaxyproject/galaxy/pull/23589) | `playwright_gesture_vocabulary_port` | `be218a455e3` | **merged** 2026-09-18 |
| [#23592](https://github.com/galaxyproject/galaxy/pull/23592) | `playwright_unlock_invocation_grid_sample_sheet` | `f2edee8c72e` | **merged** 2026-09-20 |
| [#23574](https://github.com/galaxyproject/galaxy/pull/23574) | `playwright_neutral_key_press` | `29018d7cd8a` | **merged** 2026-09-21 |
| [#23598](https://github.com/galaxyproject/galaxy/pull/23598) | `playwright_unlock_histories_list` | `0ba200bd303` | **merged** 2026-09-21 |
| [#23601](https://github.com/galaxyproject/galaxy/pull/23601) | `playwright_unlock_tool_form` | `0739e737fe7` | **merged** 2026-09-21 |
| [#23602](https://github.com/galaxyproject/galaxy/pull/23602) | `playwright_unlock_uploads` | `4d2fc929406` | **merged** 2026-09-21 |
| [#23603](https://github.com/galaxyproject/galaxy/pull/23603) | `playwright_unlock_workflow_management` | `66aa76fc613` | **merged** 2026-09-21 |
| [#23607](https://github.com/galaxyproject/galaxy/pull/23607) | `playwright_unlock_workflow_run` | `7da479e62f4` | **merged** 2026-09-21 |
| [#23611](https://github.com/galaxyproject/galaxy/pull/23611) | `playwright_collection_builders` | `5b93f94c5ad` | **merged** 2026-09-22 |
| [#23621](https://github.com/galaxyproject/galaxy/pull/23621) | `playwright_history_panel_collections` | `e2640d8e00e` | **merged** 2026-09-22 |
| [#23622](https://github.com/galaxyproject/galaxy/pull/23622) | `playwright_history_panel` | `d2cbb2493bc` | **merged** 2026-09-22 |
| [#23623](https://github.com/galaxyproject/galaxy/pull/23623) | `playwright_admin_app` | `93fd626eaca` | **merged** 2026-09-22 |
| [#23624](https://github.com/galaxyproject/galaxy/pull/23624) | `playwright_histories_published` | `30598f1b3de` | **merged** 2026-09-22 |
| [#23644](https://github.com/galaxyproject/galaxy/pull/23644) | `playwright_integration_selenium` | `45a66ad6427` | **merged** 2026-09-23 — also carried `hover_away()` |
| [#23706](https://github.com/galaxyproject/galaxy/pull/23706) | `playwright_unlock_dataset` | `2cb6655e8c8` | **merged** |
| [#23707](https://github.com/galaxyproject/galaxy/pull/23707) | `playwright_drag_and_drop_tests` | `9db5deacaf6` | **merged** 2026-09-25 |
| [#23758](https://github.com/galaxyproject/galaxy/pull/23758) | `playwright_rule_builder_group_count` | `91761b4e563` | **merged** 2026-09-29 |
| [#23757](https://github.com/galaxyproject/galaxy/pull/23757) | `playwright_history_sharing_login_redirect` | `069624b8811` | **merged** 2026-09-29 |
| [#23756](https://github.com/galaxyproject/galaxy/pull/23756) | `playwright_visualizations_igv` | `2342c313524` | **merged** 2026-09-29 |
| [#23751](https://github.com/galaxyproject/galaxy/pull/23751) | `command_palette_selenium_tests` | `ba4e8bc47e3` | **merged** 2026-09-29 |
| [#23737](https://github.com/galaxyproject/galaxy/pull/23737) | `playwright_unlock_custom_tools` | `5df55e741ba` | **merged** 2026-09-29 |

## Pushed, no PR

All three rebased onto dev `914d816195b` 2026-09-29 and force-pushed to the fork.

| Branch | Head | Notes |
| --- | --- | --- |
| `playwright_collection_edit_dbkey` | `56701cb49fd` | Drops **both** decorators from `test_collection_edit.py` plus the now-unused import. Both quoted the same reason - `.collection-edit-change-datatype-nav` never becoming clickable - and that tab is `v-if="isConfigLoaded && config.enable_celery_tasks"`. `lib/galaxy_test/base/api.py` turns celery on for framework-launched Galaxy; an ad hoc `run.sh` server leaves it off, so the tab never renders and both backends time out identically. Not a Playwright gap. No source change needed: 3/3 each under Playwright against a celery-enabled server, both pass under Selenium. Rebase was clean, diff unchanged at 1 file / 7-. |
| `playwright_stock_tours_deferred` (PR #23804) | `00251863417` | The `selenium_only` here was applied **bare**, which binds the test function to `reason` and leaves the attribute as the inner `decorator` - the body ran on neither backend from 2026-02-13 to now. Dropping it made Selenium run the tour for the first time since February; it died at step 5 waiting for the `deferred-toggle` checkbox to become clickable. bootstrap-vue renders it as a `custom-control-input` at `opacity: 0`: not displayed to Selenium, visible to Playwright. The tour now points at the sibling label, and `framework.py` rejects a bare `selenium_only`/`playwright_only`. Verified locally: red reproduced, then Selenium 1 passed and Playwright 1 passed. |
| `playwright_change_password` | `0a573c64ffb` | Unlocks the last `test_change_password.py` decorator. The reason on it (`Page.goto: net::ERR_ABORTED`) was a real driver gap: `FormGeneric.vue` assigns `window.location` once its POST lands, which cancels the `home()` navigation the test had already started. `navigate_to` now retries once on `ERR_ABORTED` only - a server-side redirect never raises, so the retry cannot fight one - and the test waits for the success message instead of racing its own request. Selenium has the same gap and cannot be fixed the same way (its `get()` reports nothing, and a stranded navigation is indistinguishable from a redirect), so `TestNavigateTo` uses a Playwright-only fixture. **The 2026-09-29 rebase conflicted**: dev has since added its own `push-state-later` fixture button and `TestCurrentUrl` class at exactly the two spots this branch adds `navigate-away-later` and `TestNavigateTo`. Both sides are additive and both were kept, but keeping both broke the `push-state-later` listener chain (lost its `});` and `document`) and left `TestNavigateTo` with no blank lines before it - repaired and folded into the original commit. The PR description predates this and needs a pass. Verified after: prettier + black clean, `TestCurrentUrl` green on all three backends alongside the new `TestNavigateTo`, `test/unit/selenium/` 498 passed / 1 skipped / 3 failed (the known local `TestConfiguredDriverSelenium` failures, which reproduce on clean dev). |

## Dropped

| Branch | Why |
| --- | --- |
| `playwright_hover_away` (`750f9c33f15`) | **Already on dev.** Rebasing it onto dev `914d816195b` produced an empty branch - git skipped its only commit as previously applied. The content landed as `c9d4e97f9fb`, carried in by [#23644](https://github.com/galaxyproject/galaxy/pull/23644). The fork ref and the prepared PR description are both stale; nothing to open. |
| `playwright_navigate_to_selenium` (`ea73914180e`) | Recommended for dropping in `MY_BRANCHES.md` and now doubly stale - stacked on the pre-rebase `playwright_change_password`, which has been force-pushed twice since. It works (the contract test passes on all three backends, `test/unit/selenium/` goes 495 -> 497 with no slowdown) but instrumentation showed the retry fires **zero** times across all of `test_change_password.py`, while costing an `execute_script` on every Selenium navigation plus a known false positive. Revisit only if a Selenium test is ever caught passing from the wrong page. |

## The parity stack

Three branches off dev `914d816195b`, stacked in this order, each with its own
red-to-green unit test in `test/unit/selenium/test_has_driver.py`. At the top of
the stack `test/unit/selenium/` gives 512 passed, 1 skipped, 3 failed - the 3
being the known local `TestConfiguredDriverSelenium` failures that reproduce on
clean dev. `mypy galaxy/selenium/` is clean.

| Branch | Head | Notes |
| --- | --- | --- |
| `playwright_window_abstraction` | `cac9ef24c45` | Adds `visit_new_window()` to the protocol, proxy and both impls, and runs `test_workflow_management::test_view` under Playwright - the last decorator needing new infrastructure. A context manager because that is the whole intent: look at the tab the page just opened, then close it and go back. It waits, so it can be called after the click that opens it. Playwright surfaces the tab as another Page on the same BrowserContext; `expect_page()` would have to be armed before the click, so the context is polled instead - through `wait_for_timeout`, since `context.pages` only grows while the sync driver is pumped and a plain sleep polls a frozen list. |
| `playwright_text_table_parity` | `a7d618bb2c9` | `innerText` separates the cells of a row with a tab; Selenium's rendered text gives each cell its own line. `test_import_dataset_from_path` reads a label/value table by splitting rows on newlines, so under Playwright every key came back as `'Name\t'` - the recorded `KeyError: 'Name'`, blamed on CI and left for investigation since 2017. The first approach warped `PlaywrightElement.text` to sniff the element's display value and re-split table boxes on newlines; rejected 2026-09-30 as warping Playwright's content display to imitate Selenium. `.text` stays plain `inner_text()`. Instead the test asks the row for its cells - `row.find_elements(By.CSS_SELECTOR, "td")` - the idiom `navigates_galaxy.py:1786` and `:1870` already use for tables. Backend-neutral by construction, and it no longer silently keeps only the first line of a multi-line value. Commit amended 1 file / +6-11, force-pushed; `playwright_scoped_css_parity` rebased onto it (3 conflicts, all from the removed fixture sitting beside its own additions) and force-pushed. **The E2E test has not been run against the new code on either backend** - the 6/6 figure was measured against the rejected approach. |
| `playwright_scoped_css_parity` | `b0d84675237` | Playwright matches a scoped selector relative to the element, so `.stateless-tags button` wanted a `.stateless-tags` **inside** the cell; the DOM matches against the document and keeps descendants, which is why Selenium finds a button in a cell that is itself the `.stateless-tags`. The decorator recorded this as the tag editor never rendering under Playwright - it renders, the selector just missed it. CSS locators now go through the browser's `querySelectorAll`; xpath and the text engines are Playwright's own and keep using it. 14/14 for `test_histories_list.py` under Playwright including `test_tags`. |

## Test Stories (PR #21199)

**Closed 2026-09-30** at the user's instruction; branch not deleted. Nothing from
it had landed - `git cherry -v origin/dev test-stories` marked all 25 commits `+`.
Being re-derived as small branches off current dev; see `TEST_STORIES_RESCUE.md`.

| Ref | Head | Notes |
| --- | --- | --- |
| `jmchilton/test-stories-rebased-20260318` | `76ccbddc52a` | The working reference. Base `a86f56b0b08` (2026-03-18), 6082 behind dev. Existed **only** in the local worktree until 2026-09-30 - no remote contained it - and `PROJECT_MANAGEMENT.md` would have torn the worktree down on PR closure. Pushed before closing. |
| `jmchilton/test-stories` | `a5a839d79b3` | What the closed PR showed. A different, older history - 2954/26 divergent from the above. |

## Remaining `selenium_only` decorators

4 left in the tree, all covered by branches above except one. What is unclaimed
on dev `914d816195b`:

| Test | Blocker |
| --- | --- |
| `test_history_pages::test_drag_drop_visual_feedback` | asserts `page-dragover-success` mid-drag via `action_chains()`. Needs the held drag from `GESTURE_ABSTRACTION_DESIGN.md`'s remaining-work table - the only decorator left that needs new gesture vocabulary. |

Landing the stack plus that one held-drag gesture finishes the goal in
`PROBLEMS_AND_GOALS.md`, and closes the last of the three prerequisites the
gesture design defers step 6 (deleting `action_chains()` from the protocol and
proxy) behind.
