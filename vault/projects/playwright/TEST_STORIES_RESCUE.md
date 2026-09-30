# Test Stories rescue — PR #21199

Plan for recovering the second project goal in `PROBLEMS_AND_GOALS.md`: the core
functionality and tests from
[galaxyproject/galaxy#21199](https://github.com/galaxyproject/galaxy/pull/21199),
minus the Jupyter notebook work.

Written 2026-09-30 against dev `b29b01c813d`.

## What the PR was

A "Stories" feature that generates visual documentation from Selenium/Playwright
tests and from standalone scripts built on `galaxy-selenium`. Screenshots
interleaved with markdown narrative, emitted as `story.md`, `story.html`,
`story.pdf` and a zip. The same automation both validates Galaxy and produces the
tutorial — one source of truth for test and doc.

Three methods on the browser context: `screenshot(label, caption=None)`,
`document(markdown)`, `document_file(path, caption=None)`.

## State when the rescue started

| | |
|---|---|
| PR | #21199, draft, opened 2025-10-30, last touched 2026-05-20 |
| Net | +4746 / −358 across 58 files |
| Local branch | `test-stories` @ `76ccbddc52a`, 25 commits |
| Base | `a86f56b0b08` (2026-03-18), **6082 commits behind dev** |
| Landed already | **nothing** — `git cherry -v origin/dev test-stories` marks all 25 `+` |

**The fork ref and the local branch are different histories.** `jmchilton/test-stories`
was at `a5a839d79b3` (what the PR showed, 26 commits); the worktree held a newer
rebase that had never been pushed — `git rev-list --left-right --count` gave
2954/26, and `git branch -r --contains 76ccbddc52a` found it on no remote. Pushed
to `jmchilton/test-stories-rebased-20260318` before closing the PR, because
`PROJECT_MANAGEMENT.md` tears down a closed PR's worktree and that would have been
the only copy.

PR #21199 was closed 2026-09-30 at the user's instruction. The branch was not
deleted.

## Approach: re-derive, don't rebase

Cut each piece as a fresh branch off current `origin/dev` and port the **final
state**, not the commit history:

```sh
git diff a86f56b0b08 76ccbddc52a -- <paths> | git apply -3
```

Rebasing 25 commits across 6082 commits of drift would be its own project, and dev
has reworked the two files the rescue touches most — `framework.py` and
`test_uploads.py` (#23602). Every ported hunk gets diffed against dev's *current*
file, not the March one. `lib/galaxy/util/markdown.py` in particular already exists
on dev; the branch's +104 lines were written against a March version.

Per `PROJECT_MANAGEMENT.md`: work in the one long-lived worktree, commit and push
to `jmchilton`, file the branch into `MY_BRANCHES.md`, and **do not open PRs**.

## Scope decisions

Settled with the user 2026-09-30.

| Question | Decision |
|---|---|
| AI docs (`CLAUDE.md`, `.claude/`) | **Out entirely.** Drops ~1039 lines and 2 of the 25 commits. |
| Rule-target docstrings | **In, and first** — independent of the story chain. |
| `NavigatesGalaxyMixin` move | **In**, folded into whichever piece first needs it. |
| PDF output | **In.** Dev already guards weasyprint; branch adds a `markdown-convert` extra. |
| Example data files | **Move into the package**, as the branch does. |
| PR #21199 | **Closed now.** |

Also dropped: `lib/galaxy_test/selenium/jupyter/__init__.py` (a one-line docstring
change). **Kept:** the 4-line `lib/galaxy/selenium/jupyter_context.py` change —
that is not a notebook feature, it is keeping an existing file compiling through
the `screenshot(caption)` signature change.

## Order

Revised 2026-09-30 after piece 2 was built and found unshippable.

**Grouping rule: every PR ships its first consumer.** The original order sequenced
by dependency, which produced branches that add an API nothing calls. `highlight_element`
was built, tested and pushed before it became clear that its only caller was
`stories/data/upload.py`, nine pieces away. A new method on the driver protocol with
three unit tests and no call site is not reviewable. The plan already said this for
the `NavigatesGalaxyMixin` shim ("folded into whichever piece first needs it"); it
applies to everything.

Only two pieces stand alone on their own merits: the docstrings (A) and the markdown
extraction (C), because C is an extraction of code dev already has and already calls.

| # | PR | Contents | First consumer | Verified by |
|---|---|---|---|---|
| A | Rule-target docstrings | `rule_target_columns.py`, `rule_target_models.py`, `rule_target_column_specification.yml` | n/a - documentation | **done**, [#23835](https://github.com/galaxyproject/galaxy/pull/23835) |
| B | Highlighted tour dumps | `highlight_element` on protocol/both backends/proxy; `TourCallbackProtocol.handle_step` gains the resolved element; `dump_tour.py` highlights each step's target | `dump_tour.py`, which exists on dev | **done**, branch `dump_tour_highlight_steps` @ `7ccbfe88164` - 9 unit tests red-to-green, `core.history.yaml` walked live (19 PNGs, borders correct and not accumulating), `test_core_history` passes |
| C | Markdown conversion into `galaxy.util` | `util/markdown.py`, css rename, `packages/util/setup.cfg`, `markdown_util.py` -45/+6, `configuration.py` | `markdown_util.py`, `pages.py`, `workflow/reports/generators` - all on dev | `test_markdown_to_html.py` |
| D | Stories core | `stories/__init__.py`, `story.py`, `context.py`, `jupyter_context.py`, `framework.py`, `GALAXY_TEST_STORIES_DIRECTORY`, `latest` symlink, `cli.py` flags, `NavigatesGalaxyMixin` shim if needed | the framework wiring, plus at least one test that emits a story | `test_story_sections.py`; live Galaxy, both backends |
| E | Workbook import tests | `test_workbook_import.py`, `navigation.yml`, 4 client components | the tests themselves | both backends |
| F | Story data + upload extraction | `stories/data/` examples and fragments, `upload.py`, `smart_components.wait_for_and_highlight`, `test_uploads.py` | `upload.py` | both backends |
| G | Tutorial generator | `generate_rule_builder_tutorial.py` | manual | manual |

B and C need no running Galaxy. From D on: start Galaxy once, set
`GALAXY_TEST_STORIES_DIRECTORY`, run Playwright first then Selenium, one at a time.

**D is the piece that cannot be split honestly.** `story.py` alone is a document model
nothing builds; the context API alone has nothing to write into. The smallest reviewable
unit is the model plus the wiring plus one test that produces a story. That answers the
old "split piece 4?" question: no, but it absorbs the old pieces 5, 6, 7 and 8, so the
count of PRs goes down rather than up.

**Hard constraint, unchanged: no new `@selenium_only` decorator may appear.**

## Things found while sorting the diff

**`dump_tour.py`: do not port the branch's change.** It swaps
`save_screenshot(f"{self.output}/{step_index}.png")` for `screenshot(...)`, but
`screenshot()` takes a *label* and builds the path itself from the screenshots or
story directory — it does not take a path. PR B rewrites this file for its own
reasons (highlighting each step's target element) and keeps `save_screenshot`.

**Test screenshots are the wrong home for `highlight_element`.** Checked all 383
`self.screenshot()` call sites in `lib/galaxy_test/selenium/`: they land in
`GALAXY_TEST_SCREENSHOTS_DIRECTORY`, and failure snapshots go through `TestSnapshot`
into a per-test error directory that ships as the "Selenium debug info" CI artifact.
Those are read when something breaks, where whole-page state is the point — and on
the failure path the element is usually the thing that was not found, so there is
nothing to highlight. `dump_tour.py` is a fit because its output is documentation.

**The example data move is a design choice, not a mechanical rename.** Five files
move out of `test-data/rules/` into `lib/galaxy/selenium/stories/data/examples/`
alongside four new workbook examples, so that `galaxy-selenium` can generate
tutorials outside a Galaxy checkout. `packages/selenium/setup.cfg` already sets
`include_package_data = True`, so this works when installed.

Orphan risk checked: on dev, `test_tool_form.py` references `test-data/rules/` but
only the `treated*`/`untreated*` files, which do **not** move. `test_uploads.py`
references the moved five and the branch updates it. Nothing is left dangling.

**`test_trs_import.py` needs verifying, not assuming.** The branch adds `@selenium_test`
to four tests that lacked it, which is how the stories wiring reaches them. But that
file imports Selenium's `Select`, and the decorator is also what enables Playwright
runs. If those tests fail under Playwright, the pressure will be to add a
`selenium_only` - which breaks the hard constraint above. Check before piece 6.

**Small hunks sort cleanly.** `configuration.py` and `notification.py` are import
fixes from the markdown move and ride with piece 3. `ActivitySettings.vue` adds
`data-activity-id` / `data-activity-visible` test hooks and rides with piece 9.
`test_trs_import.py`'s added decorators ride with piece 6, because the stories
wiring lives in that decorator — see the caveat above.

## Reference material

- `jmchilton/test-stories-rebased-20260318` @ `76ccbddc52a` — the working reference, base `a86f56b0b08`. Port diffs against the SHA, not the name: `jmchilton/test-stories` is a different history.
- `jmchilton/test-stories` @ `a5a839d79b3` — what the closed PR showed.
- Worktree `~/projects/worktrees/galaxy/branch/test_stories` — safe to tear down
  now that the rebase is pushed.

## Open questions

- `test_trs_import.py`: do those four tests pass under Playwright once decorated?
  Check before PR D — if they fail, the pressure will be to add `@selenium_only`,
  which breaks the project's other goal.

Answered 2026-09-30:

- `dump_tour.py` — settled; PR B owns the file and keeps `save_screenshot`.
- Branch naming — renamed `selenium_highlight_element` to `dump_tour_highlight_steps`;
  name the PR's purpose, not the helper it happens to add.
- Splitting `story.py` — no. D is already the smallest honest unit, and it absorbs
  the old pieces 5-8 rather than splitting further.
