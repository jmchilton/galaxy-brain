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

| # | Piece | Files | Verified by |
|---|---|---|---|
| 1 | Rule-target docstrings | `rule_target_columns.py`, `rule_target_models.py`, `rule_target_column_specification.yml` | comments/docstrings only - verified, the identifier lists come back with trailing comments. Regenerate `schema.ts` on dev rather than porting the hunk; the descriptions feed the OpenAPI schema, so generated API text does change. |
| 2 | `highlight_element` | protocol, proxy, both backends | `test_has_driver.py`, red-to-green |
| 3 | markdown utils → `galaxy.util` | `util/markdown.py`, css rename, `packages/util/setup.cfg`, imports in `configuration.py` + `notification.py` | `test_markdown_to_html.py` |
| 4 | Stories core | `stories/__init__.py`, `story.py` (622 ln) | `test_story_sections.py` (570 ln) |
| 5 | Context API | `context.py`, `jupyter_context.py`, `dump_tour.py` | live Galaxy |
| 6 | Framework wiring | `framework.py`, `GALAXY_TEST_STORIES_DIRECTORY`, `latest` symlink, `test_trs_import.py` decorators | live Galaxy, both backends |
| 7 | `cli.py` story flags | `cli.py` (+147) | manual |
| 8 | `NavigatesGalaxyMixin` shim | `navigates_galaxy_mixin.py` (16 ln) | existing suite; folded into its first consumer |
| 9 | Workbook import tests | `test_workbook_import.py`, `navigation.yml`, 4 client components | both backends |
| 10 | `stories/data` + upload extraction | examples, fragments, `upload.py` (955 ln), `test_uploads.py` | both backends |
| 11 | Tutorial generator | `generate_rule_builder_tutorial.py` | manual |

Pieces 1–4 are unit-test-only and need no running Galaxy. From 5 on: start Galaxy
once, set `GALAXY_TEST_STORIES_DIRECTORY`, run Playwright first then Selenium, one
at a time.

**Hard constraint: no new `@selenium_only` decorator may appear.** That would undo
the project's other goal, which has one unclaimed decorator left (the held drag).

## Things found while sorting the diff

**`dump_tour.py` looks like a bug in the branch.** It changes
`save_screenshot(f"{self.output}/{step_index}.png")` to `screenshot(...)`. But
`screenshot()` takes a *label* and builds the path itself from the screenshots or
story directory — it does not take a path. Read this before porting it.

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

- `dump_tour.py`: is `screenshot()` the right call there at all, given it takes a
  label and not a path? Port needs a decision, not a copy.
- `test_trs_import.py`: do those four tests pass under Playwright once decorated?
- `story.py` is 622 lines and `test_story_sections.py` 570. Split piece 4, or land
  it whole against the project's "small, atomic, concise" rule?
