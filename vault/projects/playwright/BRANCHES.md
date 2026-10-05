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

Three branches stacked in this order, restacked onto dev 2026-10-05. Only
`playwright_window_abstraction` still carries a red-to-green unit test in
`test/unit/selenium/test_has_driver.py`; the other two turned out to be test
bugs rather than adapter gaps and touch no driver code. `mypy galaxy/selenium/`
is clean.

| Branch | Head | Notes |
| --- | --- | --- |
| `playwright_window_abstraction` | `cac9ef24c45` | Adds `visit_new_window()` to the protocol, proxy and both impls, and runs `test_workflow_management::test_view` under Playwright - the last decorator needing new infrastructure. A context manager because that is the whole intent: look at the tab the page just opened, then close it and go back. It waits, so it can be called after the click that opens it. Playwright surfaces the tab as another Page on the same BrowserContext; `expect_page()` would have to be armed before the click, so the context is polled instead - through `wait_for_timeout`, since `context.pages` only grows while the sync driver is pumped and a plain sleep polls a frozen list. |
| `playwright_text_table_parity` | `1449e639c22` | `innerText` separates the cells of a row with a tab; Selenium's rendered text gives each cell its own line. `test_import_dataset_from_path` reads a label/value table by splitting rows on newlines, so under Playwright every key came back as `'Name\t'` - the recorded `KeyError: 'Name'`, blamed on CI and left for investigation since 2017. The first approach warped `PlaywrightElement.text` to sniff the element's display value and re-split table boxes on newlines; rejected 2026-09-30 as warping Playwright's content display to imitate Selenium. `.text` stays plain `inner_text()`. Instead the test asks the row for its cells - `row.find_elements(By.CSS_SELECTOR, "td")` - the idiom `navigates_galaxy.py:1786` and `:1870` already use for tables. Backend-neutral by construction, and it no longer silently keeps only the first line of a multi-line value. Commit amended 1 file / +6-11, force-pushed; `playwright_scoped_css_parity` rebased onto it (3 conflicts, all from the removed fixture sitting beside its own additions) and force-pushed. **The E2E test has not been run against the new code on either backend** - the 6/6 figure was measured against the rejected approach. |
| `playwright_scoped_css_parity` | `e2eeec2f4b0` | `add_tag` is handed the `.stateless-tags` element itself and then asks it for `.stateless-tags button` - a `.stateless-tags` nested inside a `.stateless-tags`, which nothing renders. Selenium matches a scoped CSS selector against the document and filters to descendants, so the redundant prefix was a no-op; Playwright reads it as written. The decorator recorded this as the tag editor never rendering. **The adapter approach was rejected 2026-10-05** - the first version routed every CSS `find_element`/`find_elements` from an element through an `evaluate_handle` + `get_properties()` round trip to reproduce Selenium's quirk, across the whole suite, and only for CSS, leaving xpath and the text engines on Playwright's native relative scoping. Same shape as the rejected `PlaywrightElement.text` warp on the parent branch. Rewritten as two selector edits plus the decorator removal, 1 file / +2-4; `playwright_element.py`, the `basic.html` fixture additions and the new unit test all came back out. Survey: `add_tag` has one caller and the other four `.stateless-tags` lookups pass a container that genuinely contains the editor (`test_histories_list:293`, `test_histories_published:49`, `navigates_galaxy:1844` and `:1861`), so this was the only site. Red under Playwright at `No element found with css selector='.stateless-tags button'`, then 14/14 for `test_histories_list.py` under **both** backends (Playwright 211.83s, Selenium 274.10s). |

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

### PR D — `selenium_stories_core` @ `eccdbdaf9a7`

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

**Reviewed 2026-10-01 and rewritten.** A subagent review found eight real defects, all
confirmed before fixing. The two that changed the PR's shape:

- **The conversion could not live in `galaxy.util.markdown`.** `galaxy/datatypes/data.py`
  and `tabular.py` import that module for `literal_via_fence` / `pre_formatted_contents`,
  so a top-level `import markdown` there loads the markdown package on every
  `set_metadata`. Verified: before, importing `galaxy.util.markdown` pulled in `markdown`;
  now neither it nor `galaxy.datatypes.tabular` does. The conversion lives in a new
  `galaxy/util/markdown_convert.py` and `galaxy/util/markdown.py` is byte-identical to dev
  again. This also deleted the `pre_formatted_contents(markdown)` -> `(content)` rename and
  its shadowing comment - both were symptoms of putting the imports in the wrong module,
  not fixes.
- **`markdown-convert` must not contain weasyprint.** `conditional-requirements.txt` makes
  weasyprint optional on purpose ("problematic requirements (cairo, Pango)", xref #9651)
  and it is absent from `pinned-requirements.txt`. Requiring `galaxy-util[markdown-convert]`
  from `packages/selenium` would have made it a hard install dependency of galaxy-selenium
  and galaxy-test-selenium, reversing #9651 for those packages - and needlessly, since
  `_generate_pdf` already degrades. The extra is now `["Markdown"]` only.

**The serious bug was the decorator.** `story.finalize()` sat inside the `try`, so a
story-write failure was caught by `except Exception`, **retried as though the test had
failed**, and finally reported as the test's error; on the failure path it sat inside the
`except` and **replaced the real exception**. That is precisely the case stories exist to
help debug. Story writing now goes through a guarded helper outside the `try`, matching
`dump_test_information`'s "diagnostics never throw" discipline. Three of the six new
decorator tests fail against the pre-review commit.

Also fixed: `write_screenshot_directory_file` still called `_screenshot_path`, so with
stories on it wrote `.txt` into the story directory, stopped populating the screenshots
directory and consumed a screenshot number; `story.reset()` hung off
`reset_driver_and_session`, which `test/integration_selenium/framework.py:28` also calls
from `restart()` - moved to the retry branch where the semantics are; `_create_zip` walked
the directory and so shipped the discarded attempt's PNGs - it now archives only the
documents plus the screenshots the markdown references, which closes the "known rough edge"
noted before the review and makes the stray `index.html` impossible; `inspect.cleandoc` on
the docstring, because before Python 3.13 `__doc__` keeps its source indentation and
markdown renders that as a code block (Galaxy supports >=3.10, this machine is 3.14, so it
looked fine locally); `encoding="utf-8"` on both writes; `html.escape` on the `<title>`,
the one sink `to_html` does not sanitize; `latest` symlinked on every path, not only
success; the run directory now carries the class name and uses `exist_ok=True`, factored
into a `run_directory` helper shared with `dump_test_information` - test method names
repeat across selenium classes and a same-second collision used to crash the test outright.

**Not taken: collapsing the null object's interface.** The review suggested replacing
`enabled` / `output_directory` / `screenshot_counter` with one `screenshot_path()` method,
which would remove both `story.enabled` branches. A fair simplification, but a larger
refactor than the defects warranted.

**Consumer added.** `caption=` and `document()` had no caller, so
`test_run_apply_rules_tutorial` now captions its eight direct screenshots and narrates the
steps. The framing came out of the review: `pytest.ini` already defines a `gtn_screenshot`
marker, "marks test as a screenshot producer for galaxy training network" - those tests
exist to produce documentation and currently emit loose PNGs. That is a better argument for
this feature than the one the first commit message made.

**Re-verified after the rewrite.** 1480 passed across `test/unit/selenium/`,
`test/unit/util/` and `test/unit/app/managers/` (the 3 known local geckodriver failures),
isort/black/mypy clean, and `test_run_apply_rules_tutorial` run live again: passed in
70.60s, docstring rendered as prose rather than a code block, captions as headings,
narration interleaved, 15 screenshots dual-saved.

**Still unverified: `story.pdf`.** weasyprint cannot load on this machine. The
`directory=` argument and its cleanup are covered by unit tests with a stubbed weasyprint,
including the case where rendering raises and the case that proves `index.html` never
reaches the zip.

**Cosmetic note.** Story directories inherit `dump_test_information`'s timestamp format,
which is `%Y%m%d%H%M%s` - lowercase `%s`, so date-and-time followed by epoch seconds. Ugly
for a documentation artifact, but it is pre-existing and shared, and changing it would
rename the CI error directories too.

### PR E — `workbook_import` @ `f1281956c49`

Pushed, no PR. Off dev `b437cb3f0d6`, one commit, +206/−24.

**Re-derived, not ported.** Dev's own #23602 rework landed
`lib/galaxy_test/selenium/upload_activity_helpers.py`, which already has a `RuleImportContext`
with `creating()` / `from_source()` / `wait_for_builder()` and a `file_set_wizard` component
carrying `source_workbook` and the `data-creating-what` / `data-import-source-from` hooks —
most of what the reference branch's 955-line `stories/data/upload.py` was going to add, built
better. So the reference `test_workbook_import.py` was discarded and the tests rewritten.

**The reference version could not have been PR E at all.** It imports `UploadStoriesMixin`
from PR F and narrates with PR D's `document()`. The plan listed E's first consumer as
"the tests themselves" and E as independent; it was neither. Re-derived against dev it needs
nothing from D or F.

**What the tests actually cover.** Galaxy infers the rule builder mapping from a workbook's
column headers. Which spellings it recognises (`name`/`url`/`genome`, `LIST IDENTIFIER`/`URI`/
`TYPE`, `forward_url`+`reverse_url`), and how two URL columns per row are split into paired
elements, was uncovered. Five tests upload an example workbook and assert the mapping that
came back. The nested case asserts `list_identifiers` maps to **both** identifier columns
`[1, 2]`, outermost first — the reference asserted only the url and paired_identifier entries
either side of it, because its two helpers both assumed a single column.

**Two extractions ride along, both collapsing duplication already on dev.**

- `set_file_input` on `NavigatesGalaxy`. The Playwright/Selenium split for attaching a file
  (`element_handle.set_input_files` vs `send_keys`) was copied three times in
  `upload_activity_helpers.py`; this is the fourth site.
- `rule_builder_show_and_get_source` / `_as_json`, the read side of dev's existing
  `rule_builder_set_source`. Note `test_uploads.py` inlines the read twice but screenshots
  mid-sequence, so neither call site collapses into it.

**Dropped from the reference: the `ActivitySettings.vue` hunk.** Its `data-activity-id` /
`data-activity-visible` attributes existed only for `ensure_rules_activity_enabled`, which
walked the activity bar to switch the rules activity on. Dev's `RuleImportContext` navigates
straight to the `rules` route, so nothing consumes them — same rule that folded C into D.

**Client changes are three test hooks.** `HiddenWorkbookUploadInput` gains a `description`
prop so the header's shortcut input and the upload card's input can be told apart by name
rather than by document order (the reference relied on first-match); `CardUploadWorkbook`
and `CardDownloadWorkbook` get `data-description` attributes. Three selectors added under
`file_set_wizard`.

**The workbook examples land in `test-data/rules/`,** beside `PRJDA60709.tsv` and the rest,
not in the package. F moves the whole set together.

**Verified.** 6 tests pass under **both** backends against a live Galaxy — Playwright 43.32s,
Selenium (with the three regression tests) 161.70s — so no `selenium_only`. All three
refactored `set_file_input` call sites regression-run under both backends
(`test_deferred_upload`, `test_composite_file_upload`, `test_import_from_local_zip`), as is
`test_rules_example_4_accessions`, the GTN screenshot test the source helper now serves.
isort / black / flake8 / prettier / eslint / mypy / vue-tsc clean;
mypy's resolution against this worktree was itself checked by breaking a method name and
confirming the error. `test_upload_activity.py::test_upload_with_metadata` fails locally,
but it fails identically with `upload_activity_helpers.py` and `navigates_galaxy.py` reset to
`origin/dev`, so it is local state, not this branch.

**Reviewed 2026-10-01 and amended** (was `dc4bf82c47e`). The review found **no bugs** — it
checked each correctness question and confirmed the tests fail loudly rather than silently:
an empty mapping raises `IndexError`, an unpopulated source textarea raises
`JSONDecodeError`, and the full-wizard test cannot fall through to the shortcut because
`CardUploadWorkbook` only renders under `v-else-if="wizard.isCurrent('upload-workbook')"`,
so its file input is absent until the wizard reaches step 3. Seven things were fixed anyway,
each verified first:

- **`rule_builder_show_and_get_source` collapsed no duplication.** The claim that both
  extractions collapse existing copies was true of `set_file_input` and false of this one.
  `test_uploads.py:252-259` *is* the helper line-for-line; I had skipped it because of a
  screenshot taken while the modal is open — but `screenshot_if(screenshot_name)` is exactly
  the idiom `rule_builder_set_mapping`, `rule_builder_sort` and
  `rule_builder_add_regex_replacement` already use. The helper now takes `screenshot_name`
  and that site is two lines. Re-run under both backends: `rules_example_4_8_source.png` and
  the 841-byte `rules_example_4_8_text.txt` are both still produced.
- **`data-description="workbook upload card"` had no consumer** — the first-consumer rule
  applied to my own addition. Deleted; the card's rendering is already proven by the
  `wait_for_present` on its file input.
- **`set_file_input` was looser than its own neighbour.** `shift_click`, four lines above,
  takes `WebElementProtocol` and goes through `cast("HasPlaywrightDriver", self._driver_impl)
  ._unwrap_element(...)`, which raises a clear `TypeError` instead of an `AttributeError`.
  Mine was untyped — which was the only reason `.element_handle` passed mypy — and used
  `self.backend_type` where the neighbours use `self._driver_impl.backend_type`. Now matches.
- **`.creating("collections")` was a no-op in three tests.** `handleUploadedData`
  (`BuildFileSetWizard.vue:224`) overwrites `creatingWhat` from the server's `workbook_type`,
  which is inferred from the headers alone, so the click was discarded on upload. Dropped —
  it read as a precondition and was not one.
- **`configure-workbook` was untested.** The dropped reference test
  `test_collection_type_selection_for_import` had zero assertions, so no asserted coverage was
  lost, but it was the only thing walking that step, leaving the `&collection_type=` half of
  the download href uncovered. A sixth test now picks `list:paired` and asserts both
  `type=collection` and `collection_type=list:paired` in the generated link.
- **`_assert_mapping` never checked the mapping's length,** so a spurious extra entry past the
  last asserted index would have passed. `_mapping(expected_length)` now asserts it.
- **Prop renamed `description` → `dataDescription`,** matching `itemDataDescription` /
  `goToAllDataDescription` elsewhere in the client. Vue camelizes the attribute, so call sites
  read `data-description="…"` and the live run proves the binding works.

**Known trade-off, deliberate.** Writing to the hidden `<input type="file">` bypasses the
visible upload affordance: break `browseFiles` or delete the `BLink` and the tests stay green.
The reference clicked the control and caught the file chooser, but `expect_file_chooser` is
Playwright-only and clicking a file input under Selenium opens a native dialog, so there is no
both-backends way to exercise the click. Called out in the PR description.

**Built in a second worktree** (`~/projects/worktrees/galaxy/branch/workbook_import`), since
`selenium_stories_core`'s polish holds the long-lived one. That is an exception to
`PROJECT_MANAGEMENT.md`'s one-worktree rule for this project, taken because E, F and G all
need E2E runs and the alternative was to block.

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

### PR — `playwright_drag_over_feedback` @ `82e414ef063`

Pushed, no PR. Off dev `3167c014a47`, one commit, +111/-21. Drops the last
`selenium_only` that needed new gesture vocabulary.

`drag_over(source, target)` on the protocol, both impls and the proxy - a context manager, like
`visit_new_window` and `accept_alert`, holding a drag over the target and dropping on exit.
Selenium holds a real pointer drag (the sequence the test had inline); Playwright has no pointer
drag to hold, so its scripted `drag_and_drop` splits into `_drag_hold` / `_drag_release` and is
rebuilt as hold-then-release rather than gaining a second copy of the event sequence.

**The split's hazard was already documented in the code it split.** `_drag_and_drop` said the
sequence must be dispatched without yielding, because a zone that swaps its contents on
`dragenter` detaches the element the caller grabbed. It survives because the target-to-document
chain is collected before any handler runs and travels to the release in a `JSHandle`. The
existing `test_drag_and_drop_target_rerenders_on_dragenter` now covers that across two
round-trips instead of one.

Rejected on the way: passing the shared three-line `drag()` helper between the two scripts as a
function handle. Playwright *invokes* a function expression handed to `evaluate_handle`, so there
is no handle to pass; each script declares the helper, as the original did.

**Verified.** `test_drag_over` red on all three fixture params then green, asserting the class is
present inside the block, gone after, and that the drop still landed. The red run also settled the
design question: a real chromedriver pointer drag does fire `dragenter`, so Selenium needed no
scripted path. Full `test_has_driver.py` 375 passed / 1 skipped. Live: Playwright 2 passed
(57.47s), Selenium 2 passed (79.49s) for the two page-editor drag tests; the other two
`drag_and_drop` consumers (`workflow_editor_connect`, `test_history_multi_view`) regression-run
under Playwright, 2 passed. Probed load-bearing by moving the assertion outside the `with` - it
fails on `'markdown-textarea w-100 p-4'`, so the class only exists while the drag is held.

**Not migrated: `workflow_editor_connect`'s partial drag** (`navigates_galaxy.py:1245`). The
design doc groups it with this one, but it is a pointer drag to an *offset* with no target,
held only for a screenshot. `drag_over` takes a target and ends in a drop; widening it to cover
both would make it mean less than either caller does.

## Remaining `selenium_only` decorators

3 left in the tree on dev `3167c014a47`, every one covered:

| Test | Owner |
| --- | --- |
| `test_change_password` | [#23808](https://github.com/galaxyproject/galaxy/pull/23808), open and green |
| `test_library_contents::test_import_dataset_from_path` | `playwright_text_table_parity` |
| `test_histories_list::test_tags` | `playwright_scoped_css_parity` |

Landing those three finishes the goal in `PROBLEMS_AND_GOALS.md`. The held-drag prerequisite in
front of the gesture design's step 6 (deleting `action_chains()` from the protocol and proxy) is
done; `move_to_and_click(modifiers=...)`, the `send_keys_to_page` / `mouse_drag` driver-impl
moves and the partial drag are what is left in front of it.
