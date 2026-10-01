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

### PR B — `dump_tour_highlight_steps` @ `7cf801747c8`

`highlight_element` on the protocol, both backends and the proxy, plus its consumer:
`dump_tour.py` borders each tour step's target element in the screenshot it dumps.
Pushed, no PR.

**The first version was unshippable and that is the lesson.** `highlight_element`
was built, tested and pushed on its own before it became clear the only caller was
`stories/data/upload.py`, five pieces away. A new protocol method with three unit
tests and no call site is not reviewable. The fix was not to defer it - it was to
find the caller that already existed. `dump_tour.py` has been on dev all along, its
whole job is dumping tour screenshots for documentation, and `run_tour_step` already
holds the resolved element at the moment it calls `handle_step`.

Ordinary test screenshots were surveyed and rejected as a home: all 383
`self.screenshot()` sites in `lib/galaxy_test/selenium/` feed diagnostics, where
whole-page state is the point and the element is usually the thing that was not
found. Documentation output and diagnostic output want opposite things.

Two corrections to the reference branch:

- It built the restore call by interpolating the saved value into JS source -
  `f"arguments[0].style.border = '{original_border}';"`. Passed as `arguments[1]`
  instead.
- It annotated the return as `ContextManager[None]`; dev spells this
  `AbstractContextManager[None]` on `visit_new_window` and `accept_alert`.

**Structure.** `scroll_into_view` is the local precedent for a JS-driven element
helper: implemented per backend, Playwright routing through `_unwrap_element` to a
private method. `highlight_element` follows it. A shared mixin was considered and
rejected - `wait_methods_mixin.py` is the only cross-backend module in the package
and a highlight helper does not belong under that name.

**Verified.** 9 unit tests red against dev's library, green with it, across
`selenium`, `playwright` and `proxy-selenium`. The whole `core.history.yaml` tour
walked against a live Galaxy under Playwright: 19 PNGs, target bordered on every
step that has one, no border on the content-only step 0, and exactly one border on
step 18 - so restoration holds across a full tour rather than accumulating.
`test_core_history` passes with the changed callback.

**Amended 2026-10-01 for mypy.** Binding `element: WebElementProtocol | None = None`
at the top of `run_tour_step` - needed because `element` was previously only bound
inside `if element_str is not None:` - widened the declared type for the whole
function, and the `textinsert` branch had been living off that narrowing:
`element.send_keys(textinsert)` became `union-attr`. Fixed with an assert in that
branch rather than a cast; a step carrying `textinsert` with no element was already
an `AttributeError` waiting to happen, so the assert states a precondition that was
always there. Lesson: widening a local's declared type to pass it somewhere new can
break narrowing far from the line you edited.

### PR C — `move_markdown_conversion_to_util` @ `f73cef7e698`

Pushed, no PR. `to_html`, `to_pdf_raw` and `weasyprint_available` move from
`galaxy.managers.markdown_util` into `galaxy.util.markdown`; `markdown_export_base.css`
moves with them so `resource_string(__name__, ...)` still finds it. The consumers were
already on dev, so unlike B this one needed no consumer hunting - it is an extraction,
not an addition.

**The reference branch's hunk was stale.** It patched `packages/util/setup.cfg`; dev has
since migrated the packages to `pyproject.toml`, so the `markdown-convert` extra went
into `[project.optional-dependencies]` instead. Port diffs get re-derived against dev's
current file, never applied blind.

**Why the import has to become optional.** `galaxy-util` is its own distribution and does
not depend on Markdown. Its pytest.ini runs `--doctest-modules` across `src`, so the module
is *imported* during the package's own test run - a top-level `import markdown` would break
galaxy-util CI outright. `weasyprint` keeps dev's `except Exception`, not `ImportError`: it
raises `OSError` when its system libraries (pango, cairo) are missing, and the reference
branch had narrowed that to `ImportError`, which would have been a regression.

**mypy had a suppression hiding in the old module.** `mypy.ini` scopes
`warn_return_any = False` to `galaxy.managers.markdown_util`, which was quietly covering
`weasyprint.write_pdf()` returning `Any`. Moving the function out of that scope exposed it.
Annotated the local (`pdf: bytes = ...`) rather than copy the blanket suppression into a
util module. The `markdown = None` line needs `# type: ignore[assignment,unused-ignore]`,
not plain `[assignment]`: CI pins `types-markdown` so the ignore is used there, local venvs
have no stubs so it is unused - verified both ways by installing and removing the stub.

**Side effect worth knowing.** Moving the css into `lib/galaxy/util/` puts it inside
prettier's scope (it was outside under `lib/galaxy/managers/`), so the pre-commit hook
reformats it - tabs and 4-space indents to 2. Whitespace only, but it means the rename is
not `R100`.

Also renamed `pre_formatted_contents(markdown)`'s parameter to `content`: the module now
imports `markdown` at the top, and the old parameter name shadowed it.

**Verified.** Red-to-green on `test_markdown_to_html.py` (repointed the import first, got
the `ImportError`, then moved the code). 958 passed across `test/unit/app/managers/`,
`test/unit/workflows/test_workflow_markdown.py` and `test/unit/util/`. The css was checked
directly - `resource_string('galaxy.util.markdown', ...)` returns 140 bytes and the old
location raises `FileNotFoundError` - because a `git mv` can silently break a
`resource_string(__name__, ...)` lookup and no test would catch it. Both import guards
exercised by blocking the imports. 7 failures in `test_model_discovery.py` appear only when
those three suites run together and reproduce identically on clean dev - pre-existing
cross-suite pollution.

### PR D — `selenium_stories_core` @ `ce5591cc7cf`

Pushed, no PR. Carries `move_markdown_conversion_to_util` as its first commit, because
PR C had no application of its own.

**The consumer was already written, 383 times over.** Every `@selenium_test` calls
`self.screenshot()`; set `GALAXY_TEST_STORIES_DIRECTORY` and those calls become a
document instead of a pile of PNGs. No test had to change. `test_run_apply_rules_tutorial`
takes 14 screenshots and is already named like a tutorial - it now produces one.

**Scope cut from the reference.** The reference `story.py` is 622 lines; this is 240.
Sections, filtering, markdown merging, `SectionProxy` and the CLI story flags were all
left out, and with them the whole 570-line `test_story_sections.py`. Their consumers are
`stories/data/upload.py` and `generate_rule_builder_tutorial.py`, which are PRs F and G.
That test file covers *only* sections - nothing in it touches the story core - so the
split is clean and the core needed its own tests written from scratch.

Also deferred: `navigates_galaxy_mixin.py`. The reference moves the `TYPE_CHECKING` shim
out of `framework.py` and repoints it at `GalaxySeleniumContext` so mixins can reach
`.story` and `.section()`. No mixin needs that until F.

**Design changes.**

- `StoryProtocol` renamed `StoryBase`. It is an ABC used as a base class, but in this
  package `*Protocol` means a structural `typing.Protocol` - `HasDriver` does not subclass
  `HasDriverProtocol`, a conformance test checks it. Remember this when porting F/G, which
  still say `StoryProtocol`.
- `hasattr(self, "story")` guards replaced by a lazy property on `GalaxySeleniumContext`
  returning a `NoopStory`. A class-level `NoopStory()` default would have been shared
  mutable state across instances.
- `to_pdf_raw(directory=...)` removes its intermediate `index.html` when the caller owns
  the directory. The reference left it behind, where it would have been zipped into every
  story.
- Warnings go through `log`, not `print`.

**Why the markdown move exists at all.** `galaxy-selenium` depends on `galaxy-navigation`
then `galaxy-util`, and never on `galaxy-app`. It structurally cannot import
`galaxy.managers.markdown_util`. `packages/selenium` now requires
`galaxy-util[markdown-convert]`, which is the first consumer of the extra PR C added.

**Verified.** 11 story unit tests and 6 new `galaxy.util.markdown` tests, both red first.
`test/unit/selenium/` 514 passed (the 3 known local geckodriver failures), `test/unit/util/`
497 passed, mypy clean on `galaxy/selenium/` and `framework.py`. Live under Playwright:
`test_run_apply_rules_tutorial` passed in 77.82s and produced a 15-screenshot story -
`story.md`, `story.html` with 15 `<img>` tags, a 17-file zip whose arcnames are all
relative, a correct `latest` symlink, and all 15 screenshots dual-saved into
`GALAXY_TEST_SCREENSHOTS_DIRECTORY`.

**Not verified: `story.pdf`.** weasyprint is installed-but-unloadable on this machine
(`OSError: cannot load library 'libgobject-2.0-0'`), so `weasyprint_available()` is False
and the PDF branch is skipped. That failure is itself the evidence for keeping dev's
`except Exception` rather than the reference's `except ImportError`. The `directory=`
argument is covered by unit tests with a stubbed weasyprint, including cleanup when
rendering raises.

**Known rough edge.** On a retry, `story.reset()` renumbers from 000 but does not delete
the failed attempt's PNGs, so a longer failed run can leave unreferenced images in the zip.
The markdown only references what was recorded.

### Piece 1 — `rule_target_column_docs` @ `696002e13f6`

Pushed, no PR. The first port ran +358/−64 and read like a tutorial. Trimmed to
+84/−32 by resetting all three files to dev and re-adding only what carries
information.

**Porting lesson for pieces 2-11.** The reference branch's comments are heavy, and
two failure modes showed up here that will recur:

1. **Restating the identifier.** "# MD5 checksum for verification" next to
   `"hash_md5"`, `Args:` blocks repeating the signature, "# Create the header
   column" above the constructor call. Comment what the name cannot say.
2. **Overwriting a real comment with a worse one.** Three of dev's existing
   comments were deleted and replaced with restatements - the `type_index` note
   explaining why a workbook holds repeated URI/hash columns, the concrete header
   examples on `implied_paired_or_unpaired_column_header`, and a parse-log TODO.
   **Always read the deletions in a port diff, not just the additions.**

Worth keeping: executable doctests (CI runs them via `run_tests.sh -unit
--doctest-modules`), and one-line docstrings on Pydantic models, which surface as
`@description` in the generated client schema.

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
